"""MongoDB connection lifecycle, indexes, and health helpers."""

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from app.config import MEMORY_URI_PREFIX, get_settings
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


class DatabaseUnavailableError(RuntimeError):
    """Raised when a request needs the database but it isn't reachable.

    Mapped to a 503 (not a 500) by the app-level exception handler: the
    request is fine, the dependency isn't.
    """


def connect_to_mongo() -> AsyncIOMotorClient:
    """Create the Mongo client. Called once on app startup.

    ``serverSelectionTimeoutMS`` is deliberately short: a misconfigured URI
    should surface as a clear startup log line in seconds, not minutes.

    ``MONGO_URI=memory://`` starts an in-process, throwaway store instead. It
    exists so the app can be run (and demoed) without installing MongoDB, is
    loudly logged, and is refused outright in production — see
    Settings._validate_production_safety.
    """
    global _client, _db
    if _client is None and settings.mongo_uri.startswith(MEMORY_URI_PREFIX):
        from mongomock_motor import AsyncMongoMockClient

        _client = AsyncMongoMockClient()
        _db = _client[settings.mongo_db_name]
        logger.warning(
            "MONGO_URI=memory:// — using an in-process, NON-PERSISTENT database. "
            "Everything is lost when this process stops. For development only."
        )
        return _client

    if _client is None:
        _client = AsyncIOMotorClient(
            settings.mongo_uri,
            appname="elevora-api",
            serverSelectionTimeoutMS=settings.mongo_server_selection_timeout_ms,
            connectTimeoutMS=settings.mongo_server_selection_timeout_ms,
            retryWrites=True,
        )
        _db = _client[settings.mongo_db_name]
    return _client


def close_mongo_connection() -> None:
    global _client, _db
    if _client is not None:
        close = getattr(_client, "close", None)
        if callable(close):
            close()
    _client = None
    _db = None


def get_database() -> AsyncIOMotorDatabase:
    """FastAPI dependency: returns the active database handle."""
    if _db is None:
        raise DatabaseUnavailableError("Database connection is not initialized.")
    return _db


async def ping_database() -> bool:
    """True when the database answers a ping. Never raises — used by health
    checks, which must always return a response."""
    if _db is None:
        return False
    try:
        await _db.command("ping")
        return True
    except Exception as exc:  # noqa: BLE001 - health check must not raise
        logger.warning("Database ping failed: %s", exc)
        return False


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create the indexes the application relies on.

    Beyond performance, the unique index on ``users.email`` is what makes
    duplicate registrations impossible under concurrent signups.
    """
    await db.users.create_index("email", unique=True)

    # Interview history (dashboard) is always "my interviews, newest first".
    await db.interviews.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])
    await db.interviews.create_index([("userId", ASCENDING), ("status", ASCENDING)])
    # Profile picker: active system profiles + active custom profiles for a user.
    await db.interview_profiles.create_index([("isSystem", ASCENDING), ("name", ASCENDING)])
    await db.interview_profiles.create_index(
        [("createdBy", ASCENDING), ("isActive", ASCENDING)]
    )
    # Fetched as a whole transcript, ordered; the compound index serves the
    # filter, the sort, and — being unique — makes a duplicated turn impossible
    # even if two requests race on the same answer.
    await db.interview_turns.create_index(
        [("interviewId", ASCENDING), ("sequence", ASCENDING)], unique=True
    )
