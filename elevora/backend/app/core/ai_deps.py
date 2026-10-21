from functools import lru_cache

from fastapi import Depends, HTTPException, status

from app.core.deps import get_current_user
from app.core.rate_limit import check_ai_user_rate_limit
from app.services.ai_client import AIClient, OpenAIClient
from app.services.private_ai import PrivateAIClient


@lru_cache
def get_ai_client() -> OpenAIClient:
    return OpenAIClient()


@lru_cache
def _get_private_client() -> PrivateAIClient:
    return PrivateAIClient()


def user_allows_external_ai(user: dict) -> bool:
    """True only when the user explicitly chose external processing AND a
    consent timestamp was recorded for that choice. Either alone is not enough,
    so a half-written or tampered preference fails closed (private)."""
    prefs = user.get("preferences") or {}
    return prefs.get("aiProcessing") == "external" and bool(prefs.get("externalAiConsentAt"))


def get_user_ai_client(
    user: dict = Depends(get_current_user),
    base: AIClient = Depends(get_ai_client),
) -> AIClient:
    """The AI client a given request is allowed to use.

    Clients that transmit data to third-party providers (``transmits_externally``)
    are only handed out to users who gave informed consent; everyone else gets
    the offline deterministic client. Test doubles don't set the flag and pass
    straight through.
    """
    if not getattr(base, "transmits_externally", False):
        return base
    if not user_allows_external_ai(user):
        return _get_private_client()
    wait_seconds = check_ai_user_rate_limit(str(user["_id"]))
    if wait_seconds > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You're going a little fast. Please wait a moment and try again.",
            headers={"Retry-After": str(max(1, int(wait_seconds)))},
        )
    return base
