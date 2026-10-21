"""AI provider client for the ELEVORA interview engine.

Providers
---------
<<<<<<< HEAD
* Text routes over an explicit six-model, free-tier-only allowlist: Groq first,
  Gemini second/third, then three explicit OpenRouter ``:free`` endpoints.
* Voice transcription uses Groq's documented free-tier Whisper endpoint.
  Question playback is browser-side Web Speech; no paid TTS call is made.
=======
* Text (question generation, answer analysis, resume/JD extraction, final
  evaluation) -> OpenRouter, which speaks the OpenAI-compatible Chat
  Completions API.
* Voice (speech-to-text, text-to-speech) -> OpenAI.
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

Reliability rules this module enforces
--------------------------------------
1. Every network call has a bounded timeout. A hung provider must never hang
   an interview indefinitely.
2. Transient failures (timeouts, connection errors, 429s, 5xx) are retried a
   small, fixed number of times with linear backoff.
<<<<<<< HEAD
3. JSON is requested through an explicit schema in the prompt, then parsed and
   validated locally; malformed or out-of-schema output advances to the next model.
4. Provider quota exhaustion is tracked per model with a cooldown; the router
   never tries a paid model or bypasses a provider's quota.
5. Output is validated with Pydantic before it is trusted. Invalid output
   triggers sequential failover. If configured providers all fail, only safe,
   explicitly marked deterministic fallbacks are returned.
6. An ephemeral bounded cache and concurrency semaphore limit duplicate and
   burst requests; no prompt data is persisted to disk or MongoDB by the cache.
"""

import asyncio
import hashlib
import json
import re
import time
from collections import OrderedDict
from typing import Any, Literal, Protocol

import httpx
=======
3. Providers that reject structured-output parameters get one automatic retry
   without them — the JSON schema is already described in the prompt, so this
   degrades reliability slightly instead of failing outright.
4. Every failure surfaces as :class:`AIServiceError` carrying a
   ``user_message`` that is safe to show a candidate. Provider payloads,
   stack traces and raw model output are logged server-side only.
5. AI output is validated with Pydantic before it is trusted. Malformed or
   missing fields are an error, never a silently coerced guess.
"""

import asyncio
import json
from typing import Literal, Protocol
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

import openai
from openai import AsyncOpenAI

from app.config import get_settings
from app.core.logging import get_logger
from app.schemas.ai import AnswerAnalysis, QuestionGeneration
from app.schemas.ai_evaluation import EvaluationDraft
from app.schemas.candidate import CandidateProfile
from app.schemas.job import JobProfile

logger = get_logger(__name__)

AIErrorKind = Literal["not_configured", "unavailable", "rate_limited", "timeout", "invalid_response"]

# Candidate-facing copy per failure kind. Deliberately free of provider names,
# status codes, and stack traces.
_USER_MESSAGES: dict[str, str] = {
    "not_configured": (
        "The AI interviewer isn't configured on this server yet. "
        "An administrator needs to add the AI provider API key."
    ),
    "unavailable": (
        "The AI interviewer is temporarily unavailable. Your interview state has "
        "been preserved — please try again in a moment."
    ),
    "rate_limited": (
        "The AI service is receiving too many requests right now. "
        "Please wait a few seconds and try again."
    ),
    "timeout": (
        "The AI interviewer took too long to respond. Your interview state has "
        "been preserved — please try again."
    ),
    "invalid_response": (
        "The AI returned a response we couldn't use. Your interview state has "
        "been preserved — please try again."
    ),
}


class AIServiceError(Exception):
    """Raised for AI provider failures or invalid AI output.

    ``user_message`` is safe to return to a client. ``str(exc)`` is the
    internal detail and is only ever logged.
    """

    def __init__(
        self,
        message: str,
        *,
        kind: AIErrorKind = "unavailable",
        user_message: str | None = None,
    ) -> None:
        super().__init__(message)
        self.kind: AIErrorKind = kind
        self.user_message = user_message or _USER_MESSAGES.get(kind, _USER_MESSAGES["unavailable"])


# ============================================================================
# QUESTION GENERATION SCHEMA
# ============================================================================

QUESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "question": {"type": "string"},
        "topic": {"type": "string"},
        "difficulty": {"type": "integer"},
        "isFollowUp": {"type": "boolean"},
        "targetClaim": {"type": ["string", "null"]},
    },
    "required": ["question", "topic", "difficulty", "isFollowUp", "targetClaim"],
    "additionalProperties": False,
}

# ============================================================================
# ANSWER ANALYSIS SCHEMA
# ============================================================================

ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "quality": {"type": "integer"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
        "isRelevant": {"type": "boolean"},
        "hasContradiction": {"type": "boolean"},
        "followUpNeeded": {"type": "boolean"},
        "followUpReason": {"type": ["string", "null"]},
        "missingEvidence": {"type": ["string", "null"]},
    },
    "required": [
        "quality",
        "strengths",
        "weaknesses",
        "isRelevant",
        "hasContradiction",
        "followUpNeeded",
        "followUpReason",
        "missingEvidence",
    ],
    "additionalProperties": False,
}

# ============================================================================
# CANDIDATE PROFILE SCHEMA
# ============================================================================

CANDIDATE_PROFILE_SCHEMA = {
    "type": "object",
    "properties": {
        "skills": {"type": "array", "items": {"type": "string"}},
        "education": {"type": "array", "items": {"type": "string"}},
        "experience": {"type": "array", "items": {"type": "string"}},
        "projects": {"type": "array", "items": {"type": "string"}},
        "technologies": {"type": "array", "items": {"type": "string"}},
        "achievements": {"type": "array", "items": {"type": "string"}},
        "claims": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "skills",
        "education",
        "experience",
        "projects",
        "technologies",
        "achievements",
        "claims",
    ],
    "additionalProperties": False,
}

# ============================================================================
# JOB PROFILE SCHEMA
# ============================================================================

JOB_PROFILE_SCHEMA = {
    "type": "object",
    "properties": {
        "role": {"type": ["string", "null"]},
        "company": {"type": ["string", "null"]},
        "industry": {"type": ["string", "null"]},
        "requiredSkills": {"type": "array", "items": {"type": "string"}},
        "preferredSkills": {"type": "array", "items": {"type": "string"}},
        "responsibilities": {"type": "array", "items": {"type": "string"}},
        "seniority": {"type": ["string", "null"]},
    },
    "required": [
        "role",
        "company",
        "industry",
        "requiredSkills",
        "preferredSkills",
        "responsibilities",
        "seniority",
    ],
    "additionalProperties": False,
}

# ============================================================================
# EVALUATION SCHEMA
# ============================================================================

EVALUATION_SCHEMA = {
    "type": "object",
    "properties": {
        "knowledgeScore": {"type": "integer"},
        "knowledgeEvidence": {"type": "string"},
        "communicationScore": {"type": "integer"},
        "communicationEvidence": {"type": "string"},
        "relevanceScore": {"type": "integer"},
        "relevanceEvidence": {"type": "string"},
        "problemSolvingScore": {"type": "integer"},
        "problemSolvingEvidence": {"type": "string"},
        "interviewHandlingScore": {"type": "integer"},
        "interviewHandlingEvidence": {"type": "string"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
        "recommendedPractice": {"type": "array", "items": {"type": "string"}},
        "improvedAnswer": {"type": ["string", "null"]},
    },
    "required": [
        "knowledgeScore",
        "knowledgeEvidence",
        "communicationScore",
        "communicationEvidence",
        "relevanceScore",
        "relevanceEvidence",
        "problemSolvingScore",
        "problemSolvingEvidence",
        "interviewHandlingScore",
        "interviewHandlingEvidence",
        "strengths",
        "weaknesses",
        "recommendedPractice",
        "improvedAnswer",
    ],
    "additionalProperties": False,
}


# ============================================================================
# AI CLIENT INTERFACE
# ============================================================================


class AIClient(Protocol):
    """Interface used by the interview engine.

    Tests provide a scripted implementation of this protocol (see
    ``tests/conftest.py::FakeAIClient``), which is why every method here is a
    keyword-only async function returning a Pydantic model.
    """

    async def generate_question(self, *, system: str, user: str) -> QuestionGeneration: ...

    async def analyze_answer(self, *, system: str, user: str) -> AnswerAnalysis: ...

    async def transcribe_audio(self, *, audio_bytes: bytes, filename: str) -> str: ...

    async def synthesize_speech(self, *, text: str) -> bytes: ...

    async def extract_candidate_profile(self, *, system: str, user: str) -> CandidateProfile: ...

    async def extract_job_profile(self, *, system: str, user: str) -> JobProfile: ...

    async def generate_evaluation(self, *, system: str, user: str) -> EvaluationDraft: ...


# ============================================================================
# REAL AI CLIENT
# ============================================================================

# Errors worth retrying: transient by nature.
_RETRYABLE_OPENAI_ERRORS = (
    openai.APITimeoutError,
    openai.APIConnectionError,
    openai.RateLimitError,
    openai.InternalServerError,
)


class OpenAIClient:
<<<<<<< HEAD
    """Free-only provider router implementing the existing ``AIClient`` API.

    The historical class name remains for compatibility with dependency wiring.
    Text model IDs are deliberately hard-coded below and cannot be overridden
    with an environment variable. Configure API keys from free-tier-only
    provider projects; a key linked to billing can defeat a provider's own
    free-tier guardrails, which the API itself does not expose for verification.
    """

    # Read by the consent gate (core/ai_deps.py): this client sends candidate
    # content to third-party providers, so it needs the user's consent first.
    transmits_externally = True

    # Verified against official model/rate-limit pages on 2026-10-19. OpenRouter
    # entries include the mandatory :free variant; no paid slug is in this list.
    # Keep this ordered: Groq is primary and the other five are fallbacks.
    MODEL_CHAIN: tuple[tuple[str, str], ...] = (
        ("groq", "openai/gpt-oss-120b"),
        ("gemini", "gemini-3.6-flash"),
        ("gemini", "gemini-3.5-flash-lite"),
        ("openrouter", "minimax/minimax-m3:free"),
        ("openrouter", "deepseek/deepseek-r1:free"),
        ("openrouter", "google/gemma-4-26b-a4b-it:free"),
    )

    def __init__(self) -> None:
        self._groq_client: AsyncOpenAI | None = None
        self._openrouter_client: AsyncOpenAI | None = None
        self._gemini_http_client: httpx.AsyncClient | None = None
        self._quota_state: dict[str, dict[str, Any]] = {}
        # A 429 may represent an account/project-wide quota, not only one model.
        # Cool down the provider too so sibling IDs cannot be used to evade it.
        self._provider_cooldown_until: dict[str, float] = {}
        self._cache: OrderedDict[str, tuple[float, dict[str, Any]]] = OrderedDict()
        self._cache_lock = asyncio.Lock()
        self._request_semaphore = asyncio.Semaphore(get_settings().ai_max_concurrent_requests)

    @property
    def openrouter_client(self) -> AsyncOpenAI:
        if self._openrouter_client is not None:
            return self._openrouter_client
        settings = get_settings()
        if not settings.openrouter_api_key:
            raise AIServiceError("OPENROUTER_API_KEY is not set.", kind="not_configured")
        headers = {"X-Title": "ELEVORA"}
        if settings.openrouter_referer or settings.frontend_origin:
            headers["HTTP-Referer"] = settings.openrouter_referer or settings.frontend_origin
        self._openrouter_client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            max_retries=0,
            default_headers=headers,
=======
    """ELEVORA's AI provider: OpenRouter for text, OpenAI for voice."""

    def __init__(self) -> None:
        self._openrouter_client: AsyncOpenAI | None = None
        self._openai_client: AsyncOpenAI | None = None

    # ------------------------------------------------------------------ clients

    @property
    def openrouter_client(self) -> AsyncOpenAI:
        """Lazy OpenRouter client (OpenAI-compatible SDK, different base URL)."""
        if self._openrouter_client is not None:
            return self._openrouter_client

        settings = get_settings()
        if not settings.openrouter_api_key:
            raise AIServiceError(
                "OPENROUTER_API_KEY is not set.",
                kind="not_configured",
            )
        self._openrouter_client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            max_retries=0,  # retries are handled explicitly below
            default_headers={
                "HTTP-Referer": settings.openrouter_attribution_referer,
                "X-Title": "ELEVORA",
            },
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
        )
        return self._openrouter_client

    @property
<<<<<<< HEAD
    def groq_client(self) -> AsyncOpenAI:
        if self._groq_client is not None:
            return self._groq_client
        settings = get_settings()
        if not settings.groq_api_key:
            raise AIServiceError("GROQ_API_KEY is not set.", kind="not_configured")
        self._groq_client = AsyncOpenAI(
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
            max_retries=0,
        )
        return self._groq_client

    @property
    def gemini_http_client(self) -> httpx.AsyncClient:
        if self._gemini_http_client is not None:
            return self._gemini_http_client
        if not get_settings().gemini_api_key:
            raise AIServiceError("GEMINI_API_KEY is not set.", kind="not_configured")
        self._gemini_http_client = httpx.AsyncClient(
            base_url="https://generativelanguage.googleapis.com/v1beta/",
            timeout=httpx.Timeout(get_settings().ai_timeout_seconds),
        )
        return self._gemini_http_client

    async def aclose(self) -> None:
        """Close provider connections during application shutdown."""
        for client in (self._groq_client, self._openrouter_client):
            if client is not None:
                await client.close()
        if self._gemini_http_client is not None:
            await self._gemini_http_client.aclose()
=======
    def openai_client(self) -> AsyncOpenAI:
        """Lazy OpenAI client, used only for speech-to-text and text-to-speech."""
        if self._openai_client is not None:
            return self._openai_client

        settings = get_settings()
        if not settings.openai_api_key:
            raise AIServiceError(
                "OPENAI_API_KEY is not set (required for voice transcription and TTS).",
                kind="not_configured",
            )
        self._openai_client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            max_retries=0,
        )
        return self._openai_client
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

    # ------------------------------------------------------------- json helpers

    @staticmethod
    def _extract_json(raw: str, *, schema_name: str) -> dict:
        """Parse a JSON object from a model response.

        The normal path is native structured output; this stays defensive
        because routed/free models occasionally add markdown fences or prose.
        Raw model text is never included in the raised message — it is logged
        instead (see ``_log_invalid_output``).
        """
        if not raw or not raw.strip():
            raise AIServiceError(
                f"{schema_name}: provider returned no text output.",
                kind="invalid_response",
            )

        text = raw.strip()

        if text.startswith("```"):
            lines = text.splitlines()
            if lines and lines[0].strip().lower() in {"```", "```json"}:
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        decoder = json.JSONDecoder()
        start = text.find("{")
        if start >= 0:
            try:
                parsed, _ = decoder.raw_decode(text[start:])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass

<<<<<<< HEAD
        logger.warning("%s: invalid JSON from provider (response_length=%d)", schema_name, len(raw))
=======
        logger.warning("%s: invalid JSON from provider: %s", schema_name, raw[:500])
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
        raise AIServiceError(
            f"{schema_name}: provider returned invalid JSON.",
            kind="invalid_response",
        )

    @staticmethod
    def _normalize_output(data: dict, schema: dict, schema_name: str) -> dict:
        """Unwrap the one accidental wrapper shape routed models produce.

        Expected ``{"question": "..."}`` is occasionally returned as
        ``{"question_generation": {...}}``. We unwrap only when the inner
        object clearly matches the expected schema — never blindly.
        """
        if not isinstance(data, dict):
            raise AIServiceError(
                f"{schema_name}: provider output was not a JSON object.",
                kind="invalid_response",
            )

        expected = set(schema.get("properties", {}).keys())

        if expected.intersection(data.keys()):
            question_value = data.get("question")
            if isinstance(question_value, dict) and set(question_value.keys()).intersection(expected):
                return question_value
            return data

        if len(data) == 1:
            only_key, only_value = next(iter(data.items()))
            if isinstance(only_value, dict) and (
                only_key == schema_name or expected.intersection(only_value.keys())
            ):
                return only_value

        return data

    @staticmethod
    def _json_instruction(schema: dict, schema_name: str) -> str:
        schema_text = json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
        return (
            "\n\nOUTPUT REQUIREMENTS:\n"
            f"You are returning data for the '{schema_name}' schema.\n\n"
            "Return ONLY one valid JSON object.\n"
            "Do NOT use Markdown.\n"
            "Do NOT use ``` fences.\n"
            "Do NOT add explanations before or after the JSON.\n"
            "Do NOT add extra keys.\n"
            "Use exactly the keys and types defined below.\n\n"
            "JSON Schema:\n"
            f"{schema_text}"
        )

<<<<<<< HEAD
    # --------------------------------------------------------- free-only routing

    @staticmethod
    def _schema_model(schema_name: str):
        models = {
            "question_generation": QuestionGeneration,
            "answer_analysis": AnswerAnalysis,
            "candidate_profile": CandidateProfile,
            "job_profile": JobProfile,
            "evaluation_draft": EvaluationDraft,
        }
        return models[schema_name]

    def _is_provider_configured(self, provider: str) -> bool:
        settings = get_settings()
        if provider == "groq":
            return bool(settings.groq_api_key or self._groq_client is not None)
        if provider == "gemini":
            return bool(settings.gemini_api_key)
        if provider == "openrouter":
            # The injected-client clause also keeps this class easy to test.
            return bool(settings.openrouter_api_key or self._openrouter_client is not None)
        return False

    def _configured_chain(self) -> list[tuple[str, str]]:
        return [(provider, model) for provider, model in self.MODEL_CHAIN if self._is_provider_configured(provider)]

    @staticmethod
    def _cache_key(system: str, user: str, schema_name: str) -> str:
        # Avoid retaining raw prompts as cache keys; only a one-way digest is kept.
        digest = hashlib.sha256()
        digest.update(schema_name.encode())
        digest.update(b"\0")
        digest.update(system.encode("utf-8", errors="replace"))
        digest.update(b"\0")
        digest.update(user.encode("utf-8", errors="replace"))
        return digest.hexdigest()

    async def _cache_get(self, key: str) -> dict[str, Any] | None:
        settings = get_settings()
        if settings.ai_cache_ttl_seconds <= 0 or settings.ai_cache_max_entries <= 0:
            return None
        async with self._cache_lock:
            found = self._cache.get(key)
            if not found:
                return None
            expires, value = found
            if expires <= time.monotonic():
                self._cache.pop(key, None)
                return None
            self._cache.move_to_end(key)
            return dict(value)

    async def _cache_set(self, key: str, value: dict[str, Any]) -> None:
        settings = get_settings()
        if settings.ai_cache_ttl_seconds <= 0 or settings.ai_cache_max_entries <= 0:
            return
        async with self._cache_lock:
            self._cache[key] = (time.monotonic() + settings.ai_cache_ttl_seconds, dict(value))
            self._cache.move_to_end(key)
            while len(self._cache) > settings.ai_cache_max_entries:
                self._cache.popitem(last=False)

    def _model_state(self, model_id: str) -> dict[str, Any]:
        return self._quota_state.setdefault(
            model_id,
            {"requests": 0, "successes": 0, "failures": 0, "rate_limited": 0, "cooldown_until": 0.0},
        )

    def quota_snapshot(self) -> dict[str, dict[str, int | float]]:
        """In-process diagnostic counters; never exposes credentials or prompts."""
        now = time.monotonic()
        provider_for_model = {model_id: provider for provider, model_id in self.MODEL_CHAIN}
        return {
            model: {
                "requests": state["requests"],
                "successes": state["successes"],
                "failures": state["failures"],
                "rate_limited": state["rate_limited"],
                "cooldown_remaining_seconds": max(0.0, state["cooldown_until"] - now),
                "provider_cooldown_remaining_seconds": max(
                    0.0, self._provider_cooldown_until.get(provider_for_model.get(model, ""), 0.0) - now
                ),
            }
            for model, state in self._quota_state.items()
        }

    async def _request_openai_compatible(
        self, provider: str, model_id: str, messages: list[dict[str, str]]
    ) -> str:
        settings = get_settings()
        client = self.groq_client if provider == "groq" else self.openrouter_client
        response = await client.chat.completions.create(
            model=model_id,
            messages=messages,
            temperature=0.1,
            max_tokens=2000,
            timeout=settings.ai_timeout_seconds,
        )
        choices = getattr(response, "choices", None)
        if not choices:
            raise AIServiceError(f"{model_id}: provider returned no choices.", kind="invalid_response")
        choice = choices[0]
        message = getattr(choice, "message", None)
        raw = getattr(message, "content", None) if message else None
        if not raw:
            finish_reason = getattr(choice, "finish_reason", None)
            raise AIServiceError(
                f"{model_id}: provider returned no text (finish_reason={finish_reason!r}).",
                kind="invalid_response",
            )
        return str(raw)

    async def _request_gemini(self, model_id: str, messages: list[dict[str, str]]) -> str:
        settings = get_settings()
        system_message = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_message = next((m["content"] for m in messages if m["role"] == "user"), "")
        response = await self.gemini_http_client.post(
            f"models/{model_id}:generateContent",
            headers={"x-goog-api-key": settings.gemini_api_key},
            json={
                "systemInstruction": {"parts": [{"text": system_message}]},
                "contents": [{"role": "user", "parts": [{"text": user_message}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2000, "responseMimeType": "application/json"},
            },
        )
        if response.status_code == 429:
            raise AIServiceError(f"{model_id}: provider quota/rate limit reached.", kind="rate_limited")
        if response.status_code in (401, 403):
            raise AIServiceError(f"{model_id}: provider authentication/permission failure.", kind="not_configured")
        if response.status_code >= 500:
            raise AIServiceError(f"{model_id}: provider service error {response.status_code}.", kind="unavailable")
        if response.status_code >= 400:
            raise AIServiceError(f"{model_id}: provider rejected the request ({response.status_code}).", kind="unavailable")
        try:
            payload = response.json()
            return "".join(
                part.get("text", "")
                for candidate in payload.get("candidates", [])[:1]
                for part in candidate.get("content", {}).get("parts", [])
            )
        except (ValueError, AttributeError, TypeError) as exc:
            raise AIServiceError(f"{model_id}: malformed provider response.", kind="invalid_response") from exc

    async def _call_model(self, provider: str, model_id: str, messages: list[dict[str, str]]) -> str:
        if provider == "gemini":
            return await self._request_gemini(model_id, messages)
        return await self._request_openai_compatible(provider, model_id, messages)

    @staticmethod
    def _validate_data(data: dict[str, Any], schema_name: str) -> dict[str, Any]:
        schema_definitions = {
            "question_generation": QUESTION_SCHEMA,
            "answer_analysis": ANALYSIS_SCHEMA,
            "candidate_profile": CANDIDATE_PROFILE_SCHEMA,
            "job_profile": JOB_PROFILE_SCHEMA,
            "evaluation_draft": EVALUATION_SCHEMA,
        }
        schema = schema_definitions[schema_name]
        properties = set(schema.get("properties", {}))
        required = set(schema.get("required", []))
        missing = required - set(data)
        unexpected = set(data) - properties
        if missing or (schema.get("additionalProperties") is False and unexpected):
            # Log shape only: never emit candidate/model-provided values here.
            logger.warning(
                "%s: output failed schema shape validation (missing=%d extra=%d)",
                schema_name,
                len(missing),
                len(unexpected),
            )
            raise AIServiceError(
                f"{schema_name}: output did not match the required schema shape.",
                kind="invalid_response",
            )
        try:
            # Strict Pydantic validation prevents string/number/bool coercion from
            # turning a malformed model response into a seemingly valid result.
            validated = OpenAIClient._schema_model(schema_name).model_validate(data, strict=True)
        except Exception as exc:
            raise AIServiceError(
                f"{schema_name}: output failed validation ({type(exc).__name__}).",
                kind="invalid_response",
            ) from exc
        return validated.model_dump(by_alias=True)

    @staticmethod
    def _deterministic_fallback(schema_name: str, user: str) -> dict[str, Any]:
        """Schema-safe fallback; never claims to have completed semantic AI analysis."""
        topic_match = re.search(r'''topic ["\']([^"\']+)["\']''', user, re.IGNORECASE)
        topic = topic_match.group(1).strip() if topic_match else "the topic under discussion"
        difficulty_match = re.search(r"difficulty\s+(\d+)", user, re.IGNORECASE)
        difficulty = max(1, min(5, int(difficulty_match.group(1)))) if difficulty_match else 3
        follow_up = "Set isFollowUp to true" in user or "follow-up question" in user.lower()

        if schema_name == "question_generation":
            if follow_up:
                question = f"Could you give a concrete example related to {topic}, including the steps taken and the outcome?"
            else:
                question = f"What is one important concept in {topic}, and how would you apply it to solve a practical problem?"
            return {"question": question, "topic": topic, "difficulty": difficulty, "isFollowUp": follow_up, "targetClaim": None}
        if schema_name == "answer_analysis":
            # Conservative fallback is deliberately neutral and transparently
            # says manual review is needed; it does not claim relevance/truth.
            return {
                "quality": 3,
                "strengths": ["Automated semantic analysis was unavailable; review the response manually."],
                "weaknesses": ["No model-based assessment was completed; verify correctness and evidence manually."],
                "isRelevant": True,
                "hasContradiction": False,
                "followUpNeeded": False,
                "followUpReason": "Automated analysis was unavailable.",
                "missingEvidence": "Manual review required; no semantic judgement was made.",
            }
        if schema_name == "candidate_profile":
            return {"skills": [], "education": [], "experience": [], "projects": [], "technologies": [], "achievements": [], "claims": []}
        if schema_name == "job_profile":
            return {"role": None, "company": None, "industry": None, "requiredSkills": [], "preferredSkills": [], "responsibilities": [], "seniority": None}
        if schema_name == "evaluation_draft":
            note = "Neutral fallback only: all configured free AI models were unavailable; this dimension was not assessed. Review the transcript manually."
            return {
                "knowledgeScore": 3, "knowledgeEvidence": note,
                "communicationScore": 3, "communicationEvidence": note,
                "relevanceScore": 3, "relevanceEvidence": note,
                "problemSolvingScore": 3, "problemSolvingEvidence": note,
                "interviewHandlingScore": 3, "interviewHandlingEvidence": note,
                "strengths": [], "weaknesses": ["Automated assessment unavailable; review transcript manually."],
                "recommendedPractice": ["Review answers against the rubric manually before acting on this report."],
                "improvedAnswer": None,
            }
        raise AIServiceError(f"No deterministic fallback is defined for {schema_name}.", kind="unavailable")
=======
    # ---------------------------------------------------------- openrouter call
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

    async def _chat_json(
        self,
        *,
        system: str,
        user: str,
        schema: dict,
        schema_name: str,
    ) -> dict:
<<<<<<< HEAD
        """Run sequential free-only failover, validate, and cache the result."""
        settings = get_settings()
        chain = self._configured_chain()
        if not chain:
            logger.warning("No free AI provider configured; using deterministic fallback schema=%s", schema_name)
            fallback = self._deterministic_fallback(schema_name, user)
            return self._validate_data(fallback, schema_name)

        cache_key = self._cache_key(system, user, schema_name)
        cached = await self._cache_get(cache_key)
        if cached is not None:
            return cached
=======
        """One OpenRouter chat-completions call returning validated-shape JSON."""
        settings = get_settings()
        client = self.openrouter_client  # raises not_configured when unset
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

        messages = [
            {"role": "system", "content": system + self._json_instruction(schema, schema_name)},
            {"role": "user", "content": user},
        ]
<<<<<<< HEAD
        last_error: AIServiceError | None = None
        async with self._request_semaphore:
            # Check again after waiting for a slot.
            cached = await self._cache_get(cache_key)
            if cached is not None:
                return cached

            any_model_attempted = False
            disabled_providers: set[str] = set()
            for provider, model_id in chain:
                if provider in disabled_providers:
                    continue
                if self._provider_cooldown_until.get(provider, 0.0) > time.monotonic():
                    # A recent provider-level quota/auth failure applies across its
                    # sibling model IDs; do not use model hopping to bypass it.
                    continue
                state = self._model_state(model_id)
                if state["cooldown_until"] > time.monotonic():
                    continue

                retries = settings.ai_max_retries_per_model
                for attempt in range(retries + 1):
                    any_model_attempted = True
                    state["requests"] += 1
                    try:
                        raw = await self._call_model(provider, model_id, messages)
                        parsed = self._extract_json(raw, schema_name=schema_name)
                        parsed = self._normalize_output(parsed, schema, schema_name)
                        validated = self._validate_data(parsed, schema_name)
                        state["successes"] += 1
                        state["cooldown_until"] = 0.0
                        await self._cache_set(cache_key, validated)
                        logger.info("AI route success schema=%s provider=%s model=%s", schema_name, provider, model_id)
                        return validated
                    except AIServiceError as exc:
                        last_error = exc
                        state["failures"] += 1
                        if exc.kind == "rate_limited":
                            cooldown_until = time.monotonic() + settings.ai_quota_cooldown_seconds
                            state["rate_limited"] += 1
                            state["cooldown_until"] = cooldown_until
                            self._provider_cooldown_until[provider] = cooldown_until
                            disabled_providers.add(provider)
                            # Never retry a 429 immediately or try sibling IDs from
                            # the same account during the same provider cooldown.
                            logger.warning("AI route rate limited schema=%s provider=%s model=%s; moving to another provider", schema_name, provider, model_id)
                            break
                        if exc.kind == "not_configured":
                            # Invalid provider credentials/permissions: don't repeat the same
                            # failed credential check for sibling models at this provider.
                            disabled_providers.add(provider)
                            state["cooldown_until"] = time.monotonic() + max(settings.ai_quota_cooldown_seconds, 300)
                            break
                        retryable = exc.kind in {"timeout", "unavailable"}
                        if retryable and attempt < retries:
                            await asyncio.sleep(min(0.5 * (attempt + 1), 1.0))
                            continue
                        # Invalid outputs always trigger sequential model failover.
                        break
                    except (openai.RateLimitError,) as exc:
                        state["failures"] += 1
                        state["rate_limited"] += 1
                        cooldown_until = time.monotonic() + settings.ai_quota_cooldown_seconds
                        state["cooldown_until"] = cooldown_until
                        self._provider_cooldown_until[provider] = cooldown_until
                        disabled_providers.add(provider)
                        last_error = self._classify_retryable(schema_name, exc)
                        break
                    except (openai.AuthenticationError, openai.PermissionDeniedError) as exc:
                        disabled_providers.add(provider)
                        state["failures"] += 1
                        cooldown_until = time.monotonic() + max(settings.ai_quota_cooldown_seconds, 300)
                        state["cooldown_until"] = cooldown_until
                        self._provider_cooldown_until[provider] = cooldown_until
                        last_error = AIServiceError(f"{model_id}: provider authentication/permission failure.", kind="not_configured")
                        logger.warning("AI route credentials/permissions rejected for model=%s", model_id)
                        break
                    except openai.NotFoundError as exc:
                        state["failures"] += 1
                        state["cooldown_until"] = time.monotonic() + 3600
                        last_error = AIServiceError(f"{model_id}: model is unavailable.", kind="unavailable")
                        logger.warning("AI route model id unavailable: %s", model_id)
                        break
                    except (openai.APITimeoutError, asyncio.TimeoutError, httpx.TimeoutException) as exc:
                        state["failures"] += 1
                        last_error = AIServiceError(f"{model_id}: provider timed out.", kind="timeout")
                        if attempt < retries:
                            await asyncio.sleep(min(0.5 * (attempt + 1), 1.0))
                            continue
                        break
                    except (openai.APIConnectionError, openai.InternalServerError, httpx.TransportError) as exc:
                        state["failures"] += 1
                        last_error = AIServiceError(f"{model_id}: provider unavailable.", kind="unavailable")
                        if attempt < retries:
                            await asyncio.sleep(min(0.5 * (attempt + 1), 1.0))
                            continue
                        break
                    except openai.OpenAIError as exc:
                        state["failures"] += 1
                        last_error = AIServiceError(f"{model_id}: provider rejected request ({type(exc).__name__}).", kind="unavailable")
                        logger.warning("AI route provider error model=%s type=%s", model_id, type(exc).__name__)
                        break
                    except Exception as exc:  # defensive provider parsing/SDK guard
                        state["failures"] += 1
                        last_error = AIServiceError(f"{model_id}: unexpected provider failure ({type(exc).__name__}).", kind="unavailable")
                        logger.warning("AI route failed schema=%s model=%s type=%s", schema_name, model_id, type(exc).__name__)
                        break

            # Missing credentials remain a configuration error. Once at least one
            # configured provider was actually attempted, use the safe deterministic
            # fallback instead of freezing the interview or inventing semantic scores.
            if not any_model_attempted and last_error is None:
                # All configured endpoints may be in a quota/auth cooldown from an
                # earlier request. Do not hammer them; use the explicit fallback.
                last_error = AIServiceError("All configured free models are cooling down.", kind="rate_limited")

        fallback = self._deterministic_fallback(schema_name, user)
        validated_fallback = self._validate_data(fallback, schema_name)
        logger.warning("AI route exhausted all free models; deterministic fallback schema=%s last_error=%s", schema_name, getattr(last_error, "kind", "unknown"))
        return validated_fallback
=======

        attempts = max(1, settings.openrouter_max_attempts)
        use_response_format = True
        last_error: AIServiceError | None = None

        for attempt in range(1, attempts + 1):
            request_kwargs: dict = {
                "model": settings.openrouter_model,
                "messages": messages,
                "temperature": 0.1,
                "max_tokens": 2000,
                "timeout": settings.openrouter_timeout_seconds,
            }
            if use_response_format:
                request_kwargs["response_format"] = {
                    "type": "json_schema",
                    "json_schema": {"name": schema_name, "strict": True, "schema": schema},
                }
                # OpenRouter-specific knobs; older SDKs pass them through extra_body.
                request_kwargs["extra_body"] = {
                    "provider": {"require_parameters": True},
                    "reasoning": {"exclude": True},
                }

            try:
                response = await client.chat.completions.create(**request_kwargs)
                return self._response_to_json(response, schema=schema, schema_name=schema_name)
            except openai.BadRequestError as exc:
                if use_response_format:
                    # Provider doesn't support json_schema/response_format.
                    # Retry once without it — the instructions are still in the
                    # system prompt, and local validation still runs.
                    logger.info(
                        "%s: provider rejected structured output, retrying without it (%s)",
                        schema_name,
                        exc,
                    )
                    use_response_format = False
                    last_error = AIServiceError(
                        f"{schema_name}: provider rejected structured output.", kind="unavailable"
                    )
                    continue
                logger.warning("%s: bad request to provider: %s", schema_name, exc)
                raise AIServiceError(
                    f"{schema_name}: provider rejected the request.",
                    kind="unavailable",
                ) from exc
            except openai.AuthenticationError as exc:
                logger.error("%s: provider authentication failed: %s", schema_name, exc)
                raise AIServiceError(
                    f"{schema_name}: provider authentication failed.",
                    kind="not_configured",
                    user_message=(
                        "The AI interviewer's API key was rejected by the provider. "
                        "An administrator needs to check the server configuration."
                    ),
                ) from exc
            except openai.NotFoundError as exc:
                logger.error(
                    "%s: model %r not found at provider: %s",
                    schema_name,
                    settings.openrouter_model,
                    exc,
                )
                raise AIServiceError(
                    f"{schema_name}: model {settings.openrouter_model!r} is unavailable.",
                    kind="not_configured",
                    user_message=(
                        "The configured AI model isn't available. "
                        "An administrator needs to check the server configuration."
                    ),
                ) from exc
            except _RETRYABLE_OPENAI_ERRORS as exc:
                last_error = self._classify_retryable(schema_name, exc)
                logger.warning(
                    "%s: attempt %d/%d failed (%s)", schema_name, attempt, attempts, exc
                )
            except openai.OpenAIError as exc:
                logger.error("%s: provider error: %s", schema_name, exc)
                raise AIServiceError(
                    f"{schema_name}: provider error ({type(exc).__name__}).",
                    kind="unavailable",
                ) from exc
            except asyncio.TimeoutError as exc:
                last_error = AIServiceError(f"{schema_name}: provider timed out.", kind="timeout")
                logger.warning("%s: attempt %d/%d timed out", schema_name, attempt, attempts)
                del exc

            if attempt < attempts and last_error is not None:
                await asyncio.sleep(min(2.0 * attempt, 4.0))

        assert last_error is not None  # loop always sets it before falling through
        raise last_error
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

    @staticmethod
    def _classify_retryable(schema_name: str, exc: Exception) -> AIServiceError:
        if isinstance(exc, openai.RateLimitError):
<<<<<<< HEAD
            return AIServiceError(f"{schema_name}: provider rate limit reached.", kind="rate_limited")
        if isinstance(exc, (openai.APITimeoutError, asyncio.TimeoutError, httpx.TimeoutException)):
            return AIServiceError(f"{schema_name}: provider timed out.", kind="timeout")
        return AIServiceError(f"{schema_name}: provider unavailable.", kind="unavailable")

    def _response_to_json(self, response, *, schema: dict, schema_name: str) -> dict:
        """Compatibility helper retained for existing unit tests and callers."""
        choices = getattr(response, "choices", None)
        if not choices:
            raise AIServiceError(f"{schema_name}: provider returned no choices.", kind="invalid_response")
        choice = choices[0]
        message = getattr(choice, "message", None)
        raw = getattr(message, "content", None) if message else None
        if not raw:
            finish_reason = getattr(choice, "finish_reason", None)
            raise AIServiceError(f"{schema_name}: provider returned no text output (finish_reason={finish_reason!r}).", kind="invalid_response")
=======
            return AIServiceError(
                f"{schema_name}: provider rate limit reached ({exc}).", kind="rate_limited"
            )
        if isinstance(exc, openai.APITimeoutError):
            return AIServiceError(f"{schema_name}: provider timed out ({exc}).", kind="timeout")
        return AIServiceError(
            f"{schema_name}: provider unreachable or failing ({type(exc).__name__}).",
            kind="unavailable",
        )

    def _response_to_json(self, response, *, schema: dict, schema_name: str) -> dict:
        """Pull the text out of a chat completion and parse it."""
        choices = getattr(response, "choices", None)
        if not choices:
            raise AIServiceError(
                f"{schema_name}: provider returned no choices.", kind="invalid_response"
            )

        choice = choices[0]
        message = getattr(choice, "message", None)
        raw = getattr(message, "content", None) if message else None

        if not raw:
            # Some reasoning-capable providers leak the useful content into a
            # reasoning field despite an empty content field.
            reasoning = getattr(message, "reasoning", None) if message else None
            if isinstance(reasoning, str) and reasoning.strip():
                raw = reasoning

        if not raw:
            finish_reason = getattr(choice, "finish_reason", None)
            if finish_reason == "length":
                raise AIServiceError(
                    f"{schema_name}: response was truncated at the token limit.",
                    kind="invalid_response",
                )
            raise AIServiceError(
                f"{schema_name}: provider returned no text output "
                f"(finish_reason={finish_reason!r}).",
                kind="invalid_response",
            )

>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
        data = self._extract_json(raw, schema_name=schema_name)
        return self._normalize_output(data, schema, schema_name)

    def _parse_model(self, model_cls, data: dict, *, schema_name: str):
        try:
            return model_cls.model_validate(data)
<<<<<<< HEAD
        except Exception as exc:
            logger.warning("%s: output failed validation: %s", schema_name, type(exc).__name__)
            raise AIServiceError(f"{schema_name}: output failed validation ({type(exc).__name__}).", kind="invalid_response") from exc
=======
        except Exception as exc:  # pydantic ValidationError (and anything else)
            logger.warning("%s: output failed validation: %s", schema_name, exc)
            raise AIServiceError(
                f"{schema_name}: output failed validation ({type(exc).__name__}).",
                kind="invalid_response",
            ) from exc
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

    # ======================================================== question generation

    async def generate_question(self, *, system: str, user: str) -> QuestionGeneration:
        data = await self._chat_json(
            system=system, user=user, schema=QUESTION_SCHEMA, schema_name="question_generation"
        )
        return self._parse_model(QuestionGeneration, data, schema_name="question_generation")

    # =========================================================== answer analysis

    async def analyze_answer(self, *, system: str, user: str) -> AnswerAnalysis:
        data = await self._chat_json(
            system=system, user=user, schema=ANALYSIS_SCHEMA, schema_name="answer_analysis"
        )
        return self._parse_model(AnswerAnalysis, data, schema_name="answer_analysis")

    # ============================================================== speech to text

    async def transcribe_audio(self, *, audio_bytes: bytes, filename: str) -> str:
<<<<<<< HEAD
        """Transcribe voice answers with Groq's free-tier Whisper endpoint."""
        settings = get_settings()
        if not settings.groq_api_key and self._groq_client is None:
            raise AIServiceError(
                "GROQ_API_KEY is not set for free-tier speech transcription.",
                kind="not_configured",
                user_message="Voice transcription isn't configured. You can continue with text answers.",
            )
        client = self.groq_client
        last_error: AIServiceError | None = None
        for attempt in range(settings.ai_max_retries_per_model + 1):
            try:
                response = await client.audio.transcriptions.create(
                    model="whisper-large-v3-turbo",
                    file=(filename, audio_bytes),
                    timeout=settings.ai_timeout_seconds,
                )
                transcript = getattr(response, "text", None)
                if not isinstance(transcript, str) or not transcript.strip():
                    raise AIServiceError("Groq transcription returned no text.", kind="invalid_response")
                return transcript
            except openai.RateLimitError as exc:
                raise AIServiceError("Groq speech transcription rate limit reached.", kind="rate_limited", user_message="Voice transcription is rate limited right now. Use a text answer or try again shortly.") from exc
            except openai.AuthenticationError as exc:
                raise AIServiceError("Groq speech transcription credentials were rejected.", kind="not_configured", user_message="Voice transcription isn't available because the server's free-tier key was rejected. You can continue with text answers.") from exc
            except (openai.APITimeoutError, asyncio.TimeoutError, httpx.TimeoutException) as exc:
                last_error = AIServiceError("Groq speech transcription timed out.", kind="timeout", user_message="Voice transcription took too long. You can continue with text answers.")
            except (openai.APIConnectionError, openai.InternalServerError, httpx.TransportError) as exc:
                last_error = AIServiceError("Groq speech transcription provider unavailable.", kind="unavailable", user_message="Voice transcription is temporarily unavailable. You can continue with text answers.")
            except openai.OpenAIError as exc:
                raise AIServiceError("Groq speech transcription failed.", kind="unavailable", user_message="Voice transcription is temporarily unavailable. You can continue with text answers.") from exc
            if attempt < settings.ai_max_retries_per_model:
                await asyncio.sleep(0.5)
        raise last_error or AIServiceError("Groq speech transcription failed.", kind="unavailable")
=======
        """Speech-to-text (OpenAI, not OpenRouter)."""
        settings = get_settings()
        client = self.openai_client  # raises not_configured when unset

        attempts = max(1, settings.openai_max_attempts)
        last_error: AIServiceError | None = None

        for attempt in range(1, attempts + 1):
            try:
                transcript = await client.audio.transcriptions.create(
                    model=settings.openai_transcribe_model,
                    file=(filename, audio_bytes),
                    timeout=settings.openai_timeout_seconds,
                )
            except openai.AuthenticationError as exc:
                logger.error("Transcription authentication failed: %s", exc)
                raise AIServiceError(
                    "transcription: provider authentication failed.",
                    kind="not_configured",
                    user_message=(
                        "Voice transcription isn't available because the server's API key was "
                        "rejected. You can continue with text answers."
                    ),
                ) from exc
            except _RETRYABLE_OPENAI_ERRORS as exc:
                last_error = self._classify_retryable("transcription", exc)
                logger.warning("Transcription attempt %d/%d failed: %s", attempt, attempts, exc)
            except openai.OpenAIError as exc:
                logger.error("Transcription failed: %s", exc)
                raise AIServiceError(
                    "transcription: provider error.",
                    kind="unavailable",
                    user_message=(
                        "Voice transcription is temporarily unavailable. "
                        "You can continue with text answers."
                    ),
                ) from exc

            if last_error is None:
                text = getattr(transcript, "text", None)
                if text is None:
                    raise AIServiceError(
                        "transcription: response had no 'text' field.",
                        kind="invalid_response",
                    )
                return text

            if attempt < attempts:
                await asyncio.sleep(min(1.5 * attempt, 3.0))

        assert last_error is not None
        raise last_error
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

    # ============================================================== text to speech

    async def synthesize_speech(self, *, text: str) -> bytes:
<<<<<<< HEAD
        """Server-side TTS is intentionally disabled to enforce free-only inference.

        The frontend uses the browser Web Speech API for question playback. This
        method remains on the interface for compatibility with fake/test clients
        and external integrations; production should not call a paid TTS provider.
        """
        raise AIServiceError(
            "Server-side text-to-speech is disabled in free-only mode.",
            kind="not_configured",
            user_message="Server-side question audio is disabled. Use browser speech playback or read the question above.",
        )
=======
        """Text-to-speech (OpenAI, not OpenRouter)."""
        settings = get_settings()
        client = self.openai_client  # raises not_configured when unset

        attempts = max(1, settings.openai_max_attempts)
        last_error: AIServiceError | None = None

        for attempt in range(1, attempts + 1):
            try:
                response = await client.audio.speech.create(
                    model=settings.openai_tts_model,
                    voice=settings.openai_tts_voice,
                    input=text,
                    timeout=settings.openai_timeout_seconds,
                )
                content = await response.read()
                if not content:
                    raise AIServiceError(
                        "speech synthesis: provider returned empty audio.",
                        kind="invalid_response",
                        user_message=(
                            "Question audio isn't available right now — read the question above "
                            "instead."
                        ),
                    )
                return content
            except openai.AuthenticationError as exc:
                logger.error("Speech synthesis authentication failed: %s", exc)
                raise AIServiceError(
                    "speech synthesis: provider authentication failed.",
                    kind="not_configured",
                    user_message=(
                        "Question audio isn't available because the server's API key was "
                        "rejected. Read the question above instead."
                    ),
                ) from exc
            except AIServiceError:
                raise
            except _RETRYABLE_OPENAI_ERRORS as exc:
                last_error = self._classify_retryable("speech synthesis", exc)
                logger.warning(
                    "Speech synthesis attempt %d/%d failed: %s", attempt, attempts, exc
                )
            except openai.OpenAIError as exc:
                logger.error("Speech synthesis failed: %s", exc)
                raise AIServiceError(
                    "speech synthesis: provider error.",
                    kind="unavailable",
                    user_message=(
                        "Question audio is temporarily unavailable — read the question above "
                        "instead."
                    ),
                ) from exc

            if attempt < attempts:
                await asyncio.sleep(min(1.5 * attempt, 3.0))

        assert last_error is not None
        raise last_error
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

    # ========================================================= candidate profile

    async def extract_candidate_profile(self, *, system: str, user: str) -> CandidateProfile:
        data = await self._chat_json(
            system=system, user=user, schema=CANDIDATE_PROFILE_SCHEMA, schema_name="candidate_profile"
        )
        return self._parse_model(CandidateProfile, data, schema_name="candidate_profile")

    # ================================================================ job profile

    async def extract_job_profile(self, *, system: str, user: str) -> JobProfile:
        data = await self._chat_json(
            system=system, user=user, schema=JOB_PROFILE_SCHEMA, schema_name="job_profile"
        )
        return self._parse_model(JobProfile, data, schema_name="job_profile")

    # ================================================================= evaluation

    async def generate_evaluation(self, *, system: str, user: str) -> EvaluationDraft:
        data = await self._chat_json(
            system=system, user=user, schema=EVALUATION_SCHEMA, schema_name="evaluation_draft"
        )
        return self._parse_model(EvaluationDraft, data, schema_name="evaluation_draft")
