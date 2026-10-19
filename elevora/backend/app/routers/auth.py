from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.logging import get_logger
from app.core.rate_limit import check_auth_rate_limit
from app.core.security import (
    create_access_token,
    hash_password,
    verify_dummy_password,
    verify_password,
)
from app.database import get_database
from app.models.user import new_user_document, user_doc_to_public
from app.schemas.auth import LoginRequest, RegisterRequest, UserUpdateRequest
from app.schemas.user import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()
logger = get_logger(__name__)


def _client_identifier(request: Request) -> str:
    """Best-effort client key for rate limiting.

    ``request.client.host`` is the socket peer: behind a reverse proxy that is
    the proxy's address unless the proxy is trusted to set X-Forwarded-For.
    Rate limiting degrades to "per proxy" in that case, which is still better
    than nothing; production deployments should configure their proxy and, if
    they need per-client limits, terminate at the proxy instead.
    """
    return request.client.host if request.client else "unknown"


def _enforce_rate_limit(scope: str, request: Request, *, email: str = "") -> None:
    wait_seconds = check_auth_rate_limit(scope, f"{_client_identifier(request)}|{email.lower()}")
    if wait_seconds > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please wait a moment and try again.",
            headers={"Retry-After": str(max(1, int(wait_seconds)))},
        )


def _set_session_cookie(response: Response, user_id: str) -> None:
    token = create_access_token(subject=user_id)
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure_effective,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        domain=settings.cookie_domain,
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.cookie_name,
        path="/",
        domain=settings.cookie_domain,
        httponly=True,
        secure=settings.cookie_secure_effective,
        samesite=settings.cookie_samesite,
    )


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserPublic:
    _enforce_rate_limit("register", request, email=payload.email)

    doc = new_user_document(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    doc["_id"] = result.inserted_id
    _set_session_cookie(response, str(result.inserted_id))
    logger.info("Registered user %s", result.inserted_id)
    return user_doc_to_public(doc)


@router.post("/login", response_model=UserPublic)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserPublic:
    _enforce_rate_limit("login", request, email=payload.email)

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password.",
    )

    user = await db.users.find_one({"email": payload.email.lower()})
    if not user:
        # Spend the same CPU as a real verification so response timing doesn't
        # reveal whether the account exists.
        verify_dummy_password(payload.password)
        raise invalid_credentials

    if not verify_password(payload.password, user.get("passwordHash", "")):
        raise invalid_credentials

    _set_session_cookie(response, str(user["_id"]))
    return user_doc_to_public(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    _clear_session_cookie(response)


@router.get("/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)) -> UserPublic:
    return user_doc_to_public(current_user)


@router.patch("/me", response_model=UserPublic)
async def update_me(
    payload: UserUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserPublic:
    """Update the signed-in user's display name and practice preferences."""
    updates: dict = {}

    if payload.name is not None:
        updates["name"] = payload.name

    if payload.preferences is not None:
        supplied = payload.preferences.model_dump(exclude_unset=True)
        # Merge rather than replace so a partial update can't drop the other
        # preference.
        for key, value in supplied.items():
            if value is not None:
                updates[f"preferences.{key}"] = value

    if updates:
        updates["updatedAt"] = datetime.now(timezone.utc)
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": updates})

    refreshed = await db.users.find_one({"_id": current_user["_id"]})
    # The user was fetched by the auth dependency microseconds ago; a None here
    # would mean the account was deleted mid-request.
    if refreshed is None:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    return user_doc_to_public(refreshed)
