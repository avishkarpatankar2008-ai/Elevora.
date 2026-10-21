"""Privacy gate: nothing is sent to an external AI provider without consent."""

import io
import zipfile
from datetime import datetime, timezone

import pytest

from app.config import get_settings
from app.core.ai_deps import (
    PrivateAIClient,
    get_user_ai_client,
    user_allows_external_ai,
)
from app.services.ai_client import AIServiceError
from app.services.documents import DocumentParseError, extract_text_from_docx

pytestmark = pytest.mark.asyncio


class _ExternalStub:
    transmits_externally = True


class _PlainStub:  # like the test doubles: no flag
    pass


def _user(**prefs):
    return {"_id": "507f1f77bcf86cd799439011", "preferences": prefs}


CONSENTED = {"aiProcessing": "external", "externalAiConsentAt": datetime.now(timezone.utc)}


async def test_new_users_default_to_private(client, user_payload):
    body = (await client.post("/auth/register", json=user_payload)).json()
    assert body["preferences"]["aiProcessing"] == "private"
    assert body["preferences"]["externalAiConsentAt"] is None


async def test_external_requires_explicit_consent(client, user_payload):
    await client.post("/auth/register", json=user_payload)
    resp = await client.patch("/auth/me", json={"preferences": {"aiProcessing": "external"}})
    assert resp.status_code == 422
    resp = await client.patch(
        "/auth/me",
        json={"preferences": {"aiProcessing": "external", "externalAiConsent": False}},
    )
    assert resp.status_code == 422
    me = (await client.get("/auth/me")).json()
    assert me["preferences"]["aiProcessing"] == "private"


async def test_consent_is_recorded_and_revocable(client, user_payload):
    await client.post("/auth/register", json=user_payload)
    resp = await client.patch(
        "/auth/me",
        json={"preferences": {"aiProcessing": "external", "externalAiConsent": True}},
    )
    assert resp.status_code == 200
    prefs = resp.json()["preferences"]
    assert prefs["aiProcessing"] == "external"
    assert prefs["externalAiConsentAt"] is not None

    resp = await client.patch("/auth/me", json={"preferences": {"aiProcessing": "private"}})
    prefs = resp.json()["preferences"]
    assert prefs["aiProcessing"] == "private"
    assert prefs["externalAiConsentAt"] is None


async def test_consent_flag_alone_changes_nothing(client, user_payload):
    await client.post("/auth/register", json=user_payload)
    resp = await client.patch("/auth/me", json={"preferences": {"externalAiConsent": True}})
    assert resp.status_code == 200
    assert resp.json()["preferences"]["aiProcessing"] == "private"


async def test_gate_blocks_external_client_without_consent():
    base = _ExternalStub()
    assert isinstance(get_user_ai_client(user=_user(), base=base), PrivateAIClient)
    assert isinstance(
        get_user_ai_client(user=_user(aiProcessing="external"), base=base), PrivateAIClient
    )  # mode without a consent timestamp fails closed
    assert isinstance(
        get_user_ai_client(user=_user(externalAiConsentAt=datetime.now(timezone.utc)), base=base),
        PrivateAIClient,
    )  # timestamp without the mode fails closed


async def test_gate_allows_external_client_with_consent():
    base = _ExternalStub()
    assert user_allows_external_ai(_user(**CONSENTED))
    assert get_user_ai_client(user=_user(**CONSENTED), base=base) is base


async def test_gate_passes_test_doubles_through():
    base = _PlainStub()
    assert get_user_ai_client(user=_user(), base=base) is base


async def test_per_user_ai_rate_limit(monkeypatch):
    from fastapi import HTTPException

    monkeypatch.setattr(get_settings(), "ai_user_rate_limit", 2)
    base = _ExternalStub()
    user = _user(**CONSENTED)
    assert get_user_ai_client(user=user, base=base) is base
    assert get_user_ai_client(user=user, base=base) is base
    with pytest.raises(HTTPException) as exc:
        get_user_ai_client(user=user, base=base)
    assert exc.value.status_code == 429
    # A different user is unaffected.
    other = {"_id": "507f1f77bcf86cd799439012", "preferences": CONSENTED}
    assert get_user_ai_client(user=other, base=base) is base


async def test_private_client_is_offline_and_schema_valid():
    private = PrivateAIClient()
    q = await private.generate_question(system="s", user='topic "Python decorators", difficulty 3')
    assert q.question and q.topic == "Python decorators"
    evaluation = await private.generate_evaluation(system="s", user="x")
    assert "external AI model was used" in evaluation.knowledgeEvidence
    with pytest.raises(AIServiceError) as exc:
        await private.transcribe_audio(audio_bytes=b"x", filename="a.webm")
    assert exc.value.kind == "not_configured"


async def test_docx_zip_bomb_is_rejected():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("word/document.xml", b"0" * (50 * 1024 * 1024))
    assert len(buf.getvalue()) < 1024 * 1024  # tiny on the wire, huge unpacked
    with pytest.raises(DocumentParseError):
        extract_text_from_docx(buf.getvalue())
