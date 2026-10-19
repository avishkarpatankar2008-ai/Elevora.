"""ELEVORA API application entrypoint.

Startup order matters: logging first, then the database connection, indexes,
and the idempotent profile seeding. Everything on startup is cheap or
idempotent by design — no AI calls, no per-request work.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.database import (
    DatabaseUnavailableError,
    close_mongo_connection,
    connect_to_mongo,
    ensure_indexes,
    get_database,
    ping_database,
)
from app.routers import auth, interview_profiles, interviews
from app.services.interview_profiles import seed_default_profiles

configure_logging()
logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_to_mongo()
    db = get_database()
    try:
        await ensure_indexes(db)
        # Idempotent: safe to run on every startup, across every worker.
        inserted = await seed_default_profiles(db)
        if inserted:
            logger.info("Seeded %d default interview profile(s).", inserted)
    except Exception as exc:  # noqa: BLE001 - startup diagnostics
        # Index/seed failure is not fatal: the app still serves, /ready reports
        # the problem, and the next restart retries. Crashing the whole service
        # on a transient Mongo hiccup would be worse.
        logger.error(
            "Startup database preparation failed (%s). The API will start but report "
            "not-ready until the database is reachable.",
            exc,
        )

    logger.info(
        "ELEVORA API started (env=%s, db=%s).", settings.env, settings.mongo_db_name
    )
    yield

    close_mongo_connection()
    logger.info("ELEVORA API shut down.")


app = FastAPI(title="Elevora API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
)


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """Reject oversized bodies before they are read into memory.

    This is an application-level guard, not a replacement for a reverse-proxy
    body limit in production — both should exist.
    """
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit():
        if int(content_length) > settings.max_request_bytes:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={"detail": "That upload is too large."},
            )
    return await call_next(request)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Baseline hardening for API responses.

    The API only ever returns JSON (or audio bytes), so the important pieces are
    nosniff, a referrer policy, and keeping authenticated payloads out of
    shared caches. CSP/HSTS belong at the edge, where the deployment's domains
    are known.
    """
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
    )
    if request.url.path.startswith(("/auth", "/interviews", "/interview-profiles")):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.exception_handler(DatabaseUnavailableError)
async def database_unavailable_handler(request: Request, exc: DatabaseUnavailableError):
    logger.error("Database unavailable while handling %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "ELEVORA can't reach its database right now. Please try again shortly."},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Turn FastAPI's structured validation errors into one readable line.

    The frontend surfaces ``detail`` verbatim, and a list of loc/msg objects
    is not something to show a candidate.
    """
    first = exc.errors()[0] if exc.errors() else {}
    location = ".".join(str(part) for part in first.get("loc", ()) if part not in ("body", "query"))
    message = first.get("msg", "Invalid request.")
    detail = f"{location}: {message}" if location else str(message)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": detail},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Keep FastAPI's shape ({"detail": ...}) but guarantee it is a string."""
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
    headers = getattr(exc, "headers", None)
    return JSONResponse(status_code=exc.status_code, content={"detail": detail}, headers=headers)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Last-resort handler: log the real error server-side, return a generic
    message. Stack traces, driver errors, and provider payloads never reach
    the client."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Something went wrong on our end. Please try again."},
    )


app.include_router(auth.router)
app.include_router(interviews.router)
app.include_router(interview_profiles.router)


@app.get("/health", tags=["system"])
async def health() -> dict:
    """Liveness probe. Always 200 while the process is serving; reports
    database reachability as information, not as a failure."""
    return {"status": "ok", "database": "connected" if await ping_database() else "unreachable"}


@app.get("/ready", tags=["system"])
async def ready() -> JSONResponse:
    """Readiness probe: 503 until the database actually answers."""
    if await ping_database():
        return JSONResponse(status_code=200, content={"status": "ready"})
    return JSONResponse(status_code=503, content={"status": "not-ready", "database": "unreachable"})
