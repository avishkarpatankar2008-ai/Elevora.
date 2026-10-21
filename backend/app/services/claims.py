"""Short-lived, self-expiring claims used to serialize work on one document.

A claim is a timestamp field on the document that a request sets with an
atomic conditional update before doing expensive work (an AI call), and clears
when it is finished. Three properties matter:

* **Single winner.** The ``find_one_and_update`` filter includes the exact
  state the caller expects plus "no live claim", so exactly one concurrent
  request proceeds.
* **Self-healing.** A claim older than ``stale_claim_seconds`` is ignored, so a
  crashed, killed, or timed-out request can never leave an interview
  permanently stuck.
* **Explicit release.** Failures release the claim immediately rather than
  making the next attempt wait out the stale window.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from pymongo import ReturnDocument

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _stale_cutoff() -> datetime:
    return datetime.now(timezone.utc) - timedelta(seconds=get_settings().stale_claim_seconds)


def claim_is_free(field: str) -> dict[str, Any]:
    """Filter fragment matching a document with no live claim on ``field``."""
    return {
        "$or": [
            {field: {"$exists": False}},
            {field: None},
            {field: {"$lt": _stale_cutoff()}},
        ]
    }


async def acquire_claim(
    db: Any,
    *,
    collection: str,
    document_id: Any,
    field: str,
    extra_filter: Optional[dict[str, Any]] = None,
) -> Optional[dict]:
    """Atomically claim ``document_id``. Returns the updated document, or None
    if someone else holds a live claim (or the extra filter didn't match)."""
    query: dict[str, Any] = {"_id": document_id, **claim_is_free(field)}
    if extra_filter:
        query.update(extra_filter)

    return await db[collection].find_one_and_update(
        query,
        {"$set": {field: datetime.now(timezone.utc)}},
        return_document=ReturnDocument.AFTER,
    )


async def release_claim(db: Any, *, collection: str, document_id: Any, field: str) -> None:
    """Release a claim. Failures are logged, never raised: releasing is cleanup
    and must not mask the original error."""
    try:
        await db[collection].update_one({"_id": document_id}, {"$unset": {field: ""}})
    except Exception as exc:  # noqa: BLE001 - cleanup must not raise
        logger.error("Failed to release %s on %s/%s: %s", field, collection, document_id, exc)
