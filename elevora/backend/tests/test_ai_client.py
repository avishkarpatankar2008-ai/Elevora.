<<<<<<< HEAD
"""Deterministic, network-free tests for ELEVORA's free-only AI router."""

=======
"""Unit tests for the AI client's failure handling.

No network is touched: a stub stands in for the OpenAI SDK surface, so these
tests are about *our* behavior — what we retry, what we refuse to retry, what
we validate, and above all what a user is allowed to see when a provider
misbehaves.
"""

import asyncio
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
from types import SimpleNamespace

import httpx
import openai
import pytest

from app.config import get_settings
from app.services import ai_client as ai_client_module
from app.services.ai_client import AIServiceError, OpenAIClient


def _completion(content: str | None, *, finish_reason: str = "stop"):
<<<<<<< HEAD
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content, reasoning=None), finish_reason=finish_reason)]
=======
    """Minimal stand-in for a chat completion response."""
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=content, reasoning=None),
                finish_reason=finish_reason,
            )
        ]
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
    )


class _StubCompletions:
    def __init__(self, script):
<<<<<<< HEAD
        self.script = list(script)
=======
        self._script = script
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
        self.calls: list[dict] = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
<<<<<<< HEAD
        result = self.script.pop(0)
=======
        result = self._script.pop(0)
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
        if isinstance(result, Exception):
            raise result
        return result


class _StubClient:
    def __init__(self, script):
        self.chat = SimpleNamespace(completions=_StubCompletions(script))


<<<<<<< HEAD
def _empty_keys(monkeypatch):
    settings = get_settings()
    for field in ("groq_api_key", "gemini_api_key", "openrouter_api_key"):
        monkeypatch.setattr(settings, field, "")
    monkeypatch.setattr(settings, "ai_max_retries_per_model", 0)
    monkeypatch.setattr(settings, "ai_cache_ttl_seconds", 0)
    monkeypatch.setattr(settings, "ai_cache_max_entries", 0)


def _groq_client(script) -> tuple[OpenAIClient, _StubCompletions]:
    client = OpenAIClient()
    stub = _StubClient(script)
    client._groq_client = stub  # type: ignore[assignment]
    return client, stub.chat.completions


def _openrouter_client(client: OpenAIClient, script) -> _StubCompletions:
    stub = _StubClient(script)
    client._openrouter_client = stub  # type: ignore[assignment]
    return stub.chat.completions


def _request(url="https://api.groq.com/openai/v1/chat/completions"):
    return httpx.Request("POST", url)


async def test_missing_provider_keys_uses_deterministic_fallback(monkeypatch):
    _empty_keys(monkeypatch)
    client = OpenAIClient()
    question = await client.generate_question(system="s", user='topic "algorithms"')
    assert question.question
    assert "algorithms" in question.question


def test_six_model_chain_uses_only_known_free_tier_variants():
    chain = OpenAIClient.MODEL_CHAIN
    assert len(chain) == 6
    assert chain[0] == ("groq", "openai/gpt-oss-120b")
    assert chain[1] == ("gemini", "gemini-3.6-flash")
    assert chain[2] == ("gemini", "gemini-3.5-flash-lite")
    openrouter_ids = [model for provider, model in chain if provider == "openrouter"]
    assert len(openrouter_ids) == 3
    assert all(model.endswith(":free") for model in openrouter_ids)
    assert len({model for _, model in chain}) == 6
=======
def _client_with(script) -> tuple[OpenAIClient, _StubCompletions]:
    client = OpenAIClient()
    stub = _StubClient(script)
    client._openrouter_client = stub  # type: ignore[assignment]
    return client, stub.chat.completions


def _request() -> httpx.Request:
    return httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")


# ------------------------------------------------------------- configuration


async def test_missing_api_key_is_a_configuration_error_not_a_crash():
    client = OpenAIClient()
    with pytest.raises(AIServiceError) as exc:
        await client.generate_question(system="s", user="u")
    assert exc.value.kind == "not_configured"
    assert "isn't configured" in exc.value.user_message
    # The variable name belongs in the logs, not in the user-facing copy.
    assert "OPENROUTER_API_KEY" not in exc.value.user_message


# ------------------------------------------------------------------ parsing
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7


def test_extract_json_handles_markdown_fences():
    raw = '```json\n{"question": "Why?", "topic": "t", "difficulty": 2, "isFollowUp": false, "targetClaim": null}\n```'
<<<<<<< HEAD
    assert OpenAIClient._extract_json(raw, schema_name="question_generation")["question"] == "Why?"


def test_extract_json_handles_prose_wrapper_and_does_not_echo_invalid_content(caplog):
    assert OpenAIClient._extract_json('Sure: {"question": "Why?"} Hope that helps.', schema_name="question_generation") == {"question": "Why?"}
    with pytest.raises(AIServiceError) as exc:
        OpenAIClient._extract_json("SECRET_MODEL_SPEW", schema_name="question_generation")
    assert "SECRET_MODEL_SPEW" not in str(exc.value)
    assert "SECRET_MODEL_SPEW" not in caplog.text


def test_schema_validation_rejects_missing_extra_and_coerced_fields():
    valid = {"question": "Why?", "topic": "t", "difficulty": 3, "isFollowUp": False, "targetClaim": None}
    assert OpenAIClient._validate_data(valid, "question_generation")["difficulty"] == 3
    with pytest.raises(AIServiceError):
        OpenAIClient._validate_data({"question": "Why?"}, "question_generation")
    with pytest.raises(AIServiceError):
        OpenAIClient._validate_data({**valid, "unexpected": "extra"}, "question_generation")
    with pytest.raises(AIServiceError):
        OpenAIClient._validate_data({**valid, "difficulty": "3"}, "question_generation")


def test_normalize_unwraps_named_wrapper():
    wrapped = {"question_generation": {"question": "Q", "topic": "t", "difficulty": 3, "isFollowUp": False, "targetClaim": None}}
    assert OpenAIClient._normalize_output(wrapped, ai_client_module.QUESTION_SCHEMA, "question_generation")["question"] == "Q"


async def test_valid_primary_groq_response_uses_fixed_model_id(monkeypatch):
    _empty_keys(monkeypatch)
    client, completions = _groq_client([
        _completion('{"question": "Q", "topic": "T", "difficulty": 3, "isFollowUp": false, "targetClaim": null}')
    ])
    question = await client.generate_question(system="s", user="u")
    assert question.question == "Q"
    assert completions.calls[0]["model"] == "openai/gpt-oss-120b"
    assert completions.calls[0]["timeout"] > 0


async def test_invalid_model_output_fails_over_sequentially(monkeypatch):
    _empty_keys(monkeypatch)
    client, groq_calls = _groq_client([_completion("not json")])
    router_calls = _openrouter_client(client, [
        _completion('{"question": "Fallback provider question", "topic": "T", "difficulty": 2, "isFollowUp": false, "targetClaim": null}')
    ])
    response = await client.generate_question(system="s", user="u")
    assert response.question == "Fallback provider question"
    assert groq_calls.calls[0]["model"] == "openai/gpt-oss-120b"
    assert router_calls.calls[0]["model"] == "minimax/minimax-m3:free"


async def test_rate_limit_is_not_retried_immediately_and_uses_next_provider(monkeypatch):
    _empty_keys(monkeypatch)
    monkeypatch.setattr(get_settings(), "ai_quota_cooldown_seconds", 20)
    rate_limited = openai.RateLimitError("quota", response=httpx.Response(429, request=_request()), body=None)
    client, groq_calls = _groq_client([rate_limited])
    router_calls = _openrouter_client(client, [
        _completion('{"question": "Recovered", "topic": "T", "difficulty": 2, "isFollowUp": false, "targetClaim": null}')
    ])
    result = await client.generate_question(system="s", user="u")
    assert result.question == "Recovered"
    assert len(groq_calls.calls) == 1
    assert client.quota_snapshot()["openai/gpt-oss-120b"]["rate_limited"] == 1
    assert router_calls.calls[0]["model"].endswith(":free")


async def test_timeout_retries_are_bounded(monkeypatch):
    _empty_keys(monkeypatch)
    monkeypatch.setattr(get_settings(), "ai_max_retries_per_model", 1)
    sleeps = []
    async def no_sleep(seconds):
        sleeps.append(seconds)
    monkeypatch.setattr(ai_client_module.asyncio, "sleep", no_sleep)
    client, completions = _groq_client([
        openai.APITimeoutError(request=_request()),
        _completion('{"question": "Recovered", "topic": "T", "difficulty": 2, "isFollowUp": false, "targetClaim": null}'),
    ])
    result = await client.generate_question(system="s", user="u")
    assert result.question == "Recovered"
    assert len(completions.calls) == 2
    assert len(sleeps) == 1


async def test_when_all_configured_models_fail_returns_explicit_deterministic_question(monkeypatch):
    _empty_keys(monkeypatch)
    client, completions = _groq_client([
        openai.APITimeoutError(request=_request()),
    ])
    result = await client.generate_question(system="s", user='Please discuss topic "data structures" difficulty 2')
    assert "data structures" in result.question
    assert result.difficulty == 2  # parsed from the deterministic prompt context
    assert completions.calls[0]["model"] == "openai/gpt-oss-120b"


async def test_all_models_in_cooldown_uses_deterministic_fallback(monkeypatch):
    _empty_keys(monkeypatch)
    client, _ = _groq_client([])
    client._model_state("openai/gpt-oss-120b")["cooldown_until"] = 10**12
    result = await client.generate_question(system="s", user="u")
    assert result.question


class _FakeGeminiResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class _FakeGeminiHttpClient:
    def __init__(self, response):
        self.response = response
        self.calls: list[dict] = []

    async def post(self, url, **kwargs):
        self.calls.append({"url": url, **kwargs})
        return self.response


async def test_gemini_request_uses_server_key_json_mode_and_parses_candidate(monkeypatch):
    _empty_keys(monkeypatch)
    monkeypatch.setattr(get_settings(), "gemini_api_key", "server-side-test-key")
    client = OpenAIClient()
    http_client = _FakeGeminiHttpClient(_FakeGeminiResponse(200, {
        "candidates": [{"content": {"parts": [{"text": '{"question":"Gemini question"}'}]}}]
    }))
    client._gemini_http_client = http_client  # type: ignore[assignment]

    raw = await client._request_gemini("gemini-3.6-flash", [
        {"role": "system", "content": "Follow the schema"},
        {"role": "user", "content": "Make a question"},
    ])

    assert raw == '{"question":"Gemini question"}'
    assert http_client.calls[0]["url"] == "models/gemini-3.6-flash:generateContent"
    assert http_client.calls[0]["headers"]["x-goog-api-key"] == "server-side-test-key"
    assert http_client.calls[0]["json"]["systemInstruction"]["parts"][0]["text"] == "Follow the schema"
    assert http_client.calls[0]["json"]["generationConfig"]["responseMimeType"] == "application/json"


async def test_gemini_rate_limit_enters_sequential_failover_path(monkeypatch):
    _empty_keys(monkeypatch)
    monkeypatch.setattr(get_settings(), "gemini_api_key", "server-side-test-key")
    client = OpenAIClient()
    client._gemini_http_client = _FakeGeminiHttpClient(_FakeGeminiResponse(429, {}))  # type: ignore[assignment]

    with pytest.raises(AIServiceError) as exc:
        await client._request_gemini("gemini-3.6-flash", [
            {"role": "system", "content": "s"}, {"role": "user", "content": "u"}
        ])
    assert exc.value.kind == "rate_limited"


async def test_gemini_quota_cooldown_skips_sibling_model_ids(monkeypatch):
    _empty_keys(monkeypatch)
    monkeypatch.setattr(get_settings(), "gemini_api_key", "server-side-test-key")
    client = OpenAIClient()
    gemini_http = _FakeGeminiHttpClient(_FakeGeminiResponse(429, {}))
    client._gemini_http_client = gemini_http  # type: ignore[assignment]
    router_calls = _openrouter_client(client, [
        _completion('{"question": "OpenRouter recovered", "topic": "T", "difficulty": 2, "isFollowUp": false, "targetClaim": null}')
    ])

    response = await client.generate_question(system="s", user="u")

    assert response.question == "OpenRouter recovered"
    assert len(gemini_http.calls) == 1  # not retried against Gemini's sibling ID
    assert router_calls.calls[0]["model"] == "minimax/minimax-m3:free"
    assert client.quota_snapshot()["gemini-3.6-flash"]["provider_cooldown_remaining_seconds"] > 0


async def test_server_side_tts_is_disabled_in_free_only_mode():
=======
    data = OpenAIClient._extract_json(raw, schema_name="question_generation")
    assert data["question"] == "Why?"


def test_extract_json_handles_prose_wrapper():
    raw = 'Sure! Here it is: {"question": "Why?"} Hope that helps.'
    assert OpenAIClient._extract_json(raw, schema_name="question_generation") == {"question": "Why?"}


def test_extract_json_rejects_empty_and_garbage():
    with pytest.raises(AIServiceError) as empty:
        OpenAIClient._extract_json("   ", schema_name="question_generation")
    assert empty.value.kind == "invalid_response"
    assert "no text output" in str(empty.value)

    with pytest.raises(AIServiceError):
        OpenAIClient._extract_json("not json at all", schema_name="question_generation")


def test_extract_json_error_never_echoes_model_output():
    """Raw model text can be long, and is not the user's business."""
    with pytest.raises(AIServiceError) as exc:
        OpenAIClient._extract_json("SECRET_MODEL_SPEW", schema_name="question_generation")
    assert "SECRET_MODEL_SPEW" not in str(exc.value)
    assert "SECRET_MODEL_SPEW" not in exc.value.user_message


def test_normalize_unwraps_named_wrapper():
    schema = ai_client_module.QUESTION_SCHEMA
    wrapped = {"question_generation": {"question": "Q", "topic": "t", "difficulty": 3, "isFollowUp": False, "targetClaim": None}}
    normalized = OpenAIClient._normalize_output(wrapped, schema, "question_generation")
    assert normalized["question"] == "Q"


def test_normalize_leaves_valid_output_alone():
    schema = ai_client_module.QUESTION_SCHEMA
    payload = {"question": "Q", "topic": "t", "difficulty": 3, "isFollowUp": False, "targetClaim": None}
    assert OpenAIClient._normalize_output(payload, schema, "question_generation") == payload


# ------------------------------------------------------------ happy path


async def test_valid_response_is_parsed_into_a_model():
    client, _ = _client_with([_completion('{"question": "Q", "topic": "T", "difficulty": 3, "isFollowUp": false, "targetClaim": null}')])
    question = await client.generate_question(system="s", user="u")
    assert question.question == "Q"
    assert question.difficulty == 3


async def test_out_of_range_difficulty_fails_validation():
    client, _ = _client_with([_completion('{"question": "Q", "topic": "T", "difficulty": 99, "isFollowUp": false, "targetClaim": null}')])
    with pytest.raises(AIServiceError) as exc:
        await client.generate_question(system="s", user="u")
    assert exc.value.kind == "invalid_response"


# --------------------------------------------------------- failure handling


async def test_missing_choices_is_an_error():
    client, _ = _client_with([SimpleNamespace(choices=[])])
    with pytest.raises(AIServiceError) as exc:
        await client.generate_question(system="s", user="u")
    assert exc.value.kind == "invalid_response"


async def test_truncated_response_is_reported_as_such():
    client, _ = _client_with([_completion(None, finish_reason="length")])
    with pytest.raises(AIServiceError) as exc:
        await client.generate_question(system="s", user="u")
    assert exc.value.kind == "invalid_response"
    assert "truncated" in str(exc.value)


async def test_rate_limit_is_retried_then_succeeds(monkeypatch):
    monkeypatch.setattr(get_settings(), "openrouter_max_attempts", 2)
    slept: list[float] = []

    async def _no_sleep(seconds):
        slept.append(seconds)

    monkeypatch.setattr(ai_client_module.asyncio, "sleep", _no_sleep)

    rate_limited = openai.RateLimitError("slow down", response=httpx.Response(429, request=_request()), body=None)
    client, completions = _client_with(
        [rate_limited, _completion('{"question": "Q", "topic": "T", "difficulty": 2, "isFollowUp": false, "targetClaim": null}')]
    )

    question = await client.generate_question(system="s", user="u")
    assert question.question == "Q"
    assert len(completions.calls) == 2
    assert slept == [2.0]  # backoff happened between attempts


async def test_rate_limit_exhausts_attempts_with_user_safe_message(monkeypatch):
    monkeypatch.setattr(get_settings(), "openrouter_max_attempts", 2)

    async def _no_sleep(_seconds):
        return None

    monkeypatch.setattr(ai_client_module.asyncio, "sleep", _no_sleep)

    rate_limited = openai.RateLimitError("429 too many requests", response=httpx.Response(429, request=_request()), body=None)
    client, _ = _client_with([rate_limited, rate_limited])

    with pytest.raises(AIServiceError) as exc:
        await client.generate_question(system="s", user="u")
    assert exc.value.kind == "rate_limited"
    assert "429" not in exc.value.user_message
    assert "wait a few seconds" in exc.value.user_message.lower()


async def test_timeout_is_classified_as_timeout(monkeypatch):
    monkeypatch.setattr(get_settings(), "openrouter_max_attempts", 1)
    client, _ = _client_with([openai.APITimeoutError(request=_request())])

    with pytest.raises(AIServiceError) as exc:
        await client.generate_question(system="s", user="u")
    assert exc.value.kind == "timeout"
    assert "took too long" in exc.value.user_message


async def test_connection_error_is_classified_as_unavailable(monkeypatch):
    monkeypatch.setattr(get_settings(), "openrouter_max_attempts", 1)
    client, _ = _client_with([openai.APIConnectionError(request=_request())])

    with pytest.raises(AIServiceError) as exc:
        await client.generate_question(system="s", user="u")
    assert exc.value.kind == "unavailable"
    assert "temporarily unavailable" in exc.value.user_message


async def test_authentication_error_is_not_retried(monkeypatch):
    monkeypatch.setattr(get_settings(), "openrouter_max_attempts", 3)
    auth_error = openai.AuthenticationError("bad key", response=httpx.Response(401, request=_request()), body=None)
    client, completions = _client_with([auth_error])

    with pytest.raises(AIServiceError) as exc:
        await client.generate_question(system="s", user="u")
    assert exc.value.kind == "not_configured"
    assert len(completions.calls) == 1  # retrying a bad key is pointless
    assert "bad key" not in exc.value.user_message


async def test_unsupported_structured_output_falls_back_once(monkeypatch):
    """Providers that reject `response_format` get one automatic retry without
    it rather than failing the whole interview."""
    monkeypatch.setattr(get_settings(), "openrouter_max_attempts", 3)
    bad_request = openai.BadRequestError(
        "response_format not supported", response=httpx.Response(400, request=_request()), body=None
    )
    client, completions = _client_with(
        [bad_request, _completion('{"question": "Q", "topic": "T", "difficulty": 2, "isFollowUp": false, "targetClaim": null}')]
    )

    question = await client.generate_question(system="s", user="u")
    assert question.question == "Q"
    assert "response_format" in completions.calls[0]
    assert "response_format" not in completions.calls[1]


async def test_request_always_sets_a_timeout(monkeypatch):
    """No provider call may be unbounded — that is what turns a slow provider
    into a frozen interview."""
    client, completions = _client_with(
        [_completion('{"question": "Q", "topic": "T", "difficulty": 2, "isFollowUp": false, "targetClaim": null}')]
    )
    await client.generate_question(system="s", user="u")

    timeout = completions.calls[0]["timeout"]
    assert isinstance(timeout, (int, float))
    assert timeout > 0


async def test_unexpected_exception_is_not_swallowed_as_a_provider_error(monkeypatch):
    """Programmer errors must surface (and be logged), not be quietly rewrapped
    as 'the AI is unavailable'."""

    class _Exploding:
        async def create(self, **kwargs):
            raise RuntimeError("bug in our code")

    client = OpenAIClient()
    client._openrouter_client = SimpleNamespace(  # type: ignore[assignment]
        chat=SimpleNamespace(completions=_Exploding())
    )

    with pytest.raises(RuntimeError):
        await client.generate_question(system="s", user="u")


# ------------------------------------------------------------------- voice


async def test_tts_is_not_configured_without_a_key():
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
    client = OpenAIClient()
    with pytest.raises(AIServiceError) as exc:
        await client.synthesize_speech(text="hello")
    assert exc.value.kind == "not_configured"
<<<<<<< HEAD
    assert "browser speech playback" in exc.value.user_message.lower()

=======
    assert "OPENAI_API_KEY" not in exc.value.user_message


async def test_tts_empty_audio_is_an_error():
    class _Speech:
        async def create(self, **kwargs):
            return SimpleNamespace(read=lambda: _empty())

    async def _empty():
        return b""

    client = OpenAIClient()
    client._openai_client = SimpleNamespace(audio=SimpleNamespace(speech=_Speech()))  # type: ignore[assignment]
    with pytest.raises(AIServiceError) as exc:
        await client.synthesize_speech(text="hello")
    assert exc.value.kind == "invalid_response"


# The asyncio import is used by the module under test; keep flake-free.
assert asyncio is not None
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
