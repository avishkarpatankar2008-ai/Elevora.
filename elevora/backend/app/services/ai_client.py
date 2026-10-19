"""AI provider client for the ELEVORA interview engine.

Providers
---------
* Text (question generation, answer analysis, resume/JD extraction, final
  evaluation) -> OpenRouter, which speaks the OpenAI-compatible Chat
  Completions API.
* Voice (speech-to-text, text-to-speech) -> OpenAI.

Reliability rules this module enforces
--------------------------------------
1. Every network call has a bounded timeout. A hung provider must never hang
   an interview indefinitely.
2. Transient failures (timeouts, connection errors, 429s, 5xx) are retried a
   small, fixed number of times with linear backoff.
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
        )
        return self._openrouter_client

    @property
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

        logger.warning("%s: invalid JSON from provider: %s", schema_name, raw[:500])
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

    # ---------------------------------------------------------- openrouter call

    async def _chat_json(
        self,
        *,
        system: str,
        user: str,
        schema: dict,
        schema_name: str,
    ) -> dict:
        """One OpenRouter chat-completions call returning validated-shape JSON."""
        settings = get_settings()
        client = self.openrouter_client  # raises not_configured when unset

        messages = [
            {"role": "system", "content": system + self._json_instruction(schema, schema_name)},
            {"role": "user", "content": user},
        ]

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

    @staticmethod
    def _classify_retryable(schema_name: str, exc: Exception) -> AIServiceError:
        if isinstance(exc, openai.RateLimitError):
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

        data = self._extract_json(raw, schema_name=schema_name)
        return self._normalize_output(data, schema, schema_name)

    def _parse_model(self, model_cls, data: dict, *, schema_name: str):
        try:
            return model_cls.model_validate(data)
        except Exception as exc:  # pydantic ValidationError (and anything else)
            logger.warning("%s: output failed validation: %s", schema_name, exc)
            raise AIServiceError(
                f"{schema_name}: output failed validation ({type(exc).__name__}).",
                kind="invalid_response",
            ) from exc

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

    # ============================================================== text to speech

    async def synthesize_speech(self, *, text: str) -> bytes:
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
