"""
AI client for the ELEVORA interview engine.

TEXT AI
-------
All text-generation features use OpenRouter:

    - Question generation
    - Answer analysis
    - Candidate profile extraction
    - Job profile extraction
    - Final evaluation

VOICE AI
--------
Voice features remain on OpenAI:

    - Speech-to-text
    - Text-to-speech

Why?
----
OpenRouter provides an OpenAI-compatible Chat Completions API.
The application therefore does not need to use the OpenAI Responses API
for the text-generation pipeline.

This also fixes the previous error:

    'AsyncOpenAI' object has no attribute 'responses'

The free OpenRouter router can expose different models/providers with
different structured-output capabilities, so this implementation asks the
model for strict JSON in the prompt and validates the result locally with
Pydantic.

IMPORTANT
---------
Never put OPENROUTER_API_KEY or OPENAI_API_KEY in source code.
Set them as environment variables in Render.
"""

import json
from typing import Protocol

from openai import AsyncOpenAI

from app.config import get_settings
from app.schemas.ai import AnswerAnalysis, QuestionGeneration
from app.schemas.ai_evaluation import EvaluationDraft
from app.schemas.candidate import CandidateProfile
from app.schemas.job import JobProfile


settings = get_settings()


class AIServiceError(Exception):
    """Raised for AI provider failures or invalid AI output."""


# ============================================================================
# QUESTION GENERATION SCHEMA
# ============================================================================

QUESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "question": {
            "type": "string",
        },
        "topic": {
            "type": "string",
        },
        "difficulty": {
            "type": "integer",
        },
        "isFollowUp": {
            "type": "boolean",
        },
        "targetClaim": {
            "type": ["string", "null"],
        },
    },
    "required": [
        "question",
        "topic",
        "difficulty",
        "isFollowUp",
        "targetClaim",
    ],
    "additionalProperties": False,
}


# ============================================================================
# ANSWER ANALYSIS SCHEMA
# ============================================================================

ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "quality": {
            "type": "integer",
        },
        "strengths": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "weaknesses": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "isRelevant": {
            "type": "boolean",
        },
        "hasContradiction": {
            "type": "boolean",
        },
        "followUpNeeded": {
            "type": "boolean",
        },
        "followUpReason": {
            "type": ["string", "null"],
        },
        "missingEvidence": {
            "type": ["string", "null"],
        },
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
        "skills": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "education": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "experience": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "projects": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "technologies": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "achievements": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "claims": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
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
        "role": {
            "type": ["string", "null"],
        },
        "company": {
            "type": ["string", "null"],
        },
        "industry": {
            "type": ["string", "null"],
        },
        "requiredSkills": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "preferredSkills": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "responsibilities": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "seniority": {
            "type": ["string", "null"],
        },
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
        "knowledgeScore": {
            "type": "integer",
        },
        "knowledgeEvidence": {
            "type": "string",
        },
        "communicationScore": {
            "type": "integer",
        },
        "communicationEvidence": {
            "type": "string",
        },
        "relevanceScore": {
            "type": "integer",
        },
        "relevanceEvidence": {
            "type": "string",
        },
        "problemSolvingScore": {
            "type": "integer",
        },
        "problemSolvingEvidence": {
            "type": "string",
        },
        "interviewHandlingScore": {
            "type": "integer",
        },
        "interviewHandlingEvidence": {
            "type": "string",
        },
        "strengths": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "weaknesses": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "recommendedPractice": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "improvedAnswer": {
            "type": ["string", "null"],
        },
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
    """
    Interface used by the interview engine.

    FakeAIClient can implement this protocol for tests.
    """

    async def generate_question(
        self,
        *,
        system: str,
        user: str,
    ) -> QuestionGeneration:
        ...

    async def analyze_answer(
        self,
        *,
        system: str,
        user: str,
    ) -> AnswerAnalysis:
        ...

    async def transcribe_audio(
        self,
        *,
        audio_bytes: bytes,
        filename: str,
    ) -> str:
        ...

    async def synthesize_speech(
        self,
        *,
        text: str,
    ) -> bytes:
        ...

    async def extract_candidate_profile(
        self,
        *,
        system: str,
        user: str,
    ) -> CandidateProfile:
        ...

    async def extract_job_profile(
        self,
        *,
        system: str,
        user: str,
    ) -> JobProfile:
        ...

    async def generate_evaluation(
        self,
        *,
        system: str,
        user: str,
    ) -> EvaluationDraft:
        ...


# ============================================================================
# REAL AI CLIENT
# ============================================================================

class OpenAIClient:
    """
    ELEVORA AI provider.

    Text:
        OpenRouter

    Voice:
        OpenAI
    """

    def __init__(self) -> None:
        self._openrouter_client: AsyncOpenAI | None = None
        self._openai_client: AsyncOpenAI | None = None

    # ------------------------------------------------------------------------
    # OPENROUTER CLIENT
    # ------------------------------------------------------------------------

    @property
    def openrouter_client(self) -> AsyncOpenAI:
        """
        Lazy OpenRouter client.

        OpenRouter is OpenAI-compatible, so we can continue using the
        openai Python SDK while changing only the API endpoint and key.
        """

        if self._openrouter_client is None:

            if not settings.openrouter_api_key:
                raise AIServiceError(
                    "OPENROUTER_API_KEY is not set. "
                    "Add it to the backend environment."
                )

            self._openrouter_client = AsyncOpenAI(
                api_key=settings.openrouter_api_key,
                base_url="https://openrouter.ai/api/v1",
                default_headers={
                    "HTTP-Referer": settings.frontend_origin,
                    "X-Title": "ELEVORA",
                },
            )

        return self._openrouter_client

    # ------------------------------------------------------------------------
    # OPENAI CLIENT FOR VOICE ONLY
    # ------------------------------------------------------------------------

    @property
    def openai_client(self) -> AsyncOpenAI:
        """
        Lazy OpenAI client.

        This is ONLY used for:
            - speech-to-text
            - text-to-speech
        """

        if self._openai_client is None:

            if not settings.openai_api_key:
                raise AIServiceError(
                    "OPENAI_API_KEY is not set. "
                    "It is required for voice transcription/TTS."
                )

            self._openai_client = AsyncOpenAI(
                api_key=settings.openai_api_key
            )

        return self._openai_client

    # ------------------------------------------------------------------------
    # JSON PARSER
    # ------------------------------------------------------------------------

    @staticmethod
    def _extract_json(raw: str) -> dict:
        """
        Extract a JSON object from the model response.

        Free/routed models do not necessarily expose identical structured
        output support, so we validate JSON locally.

        Supports:
            {"key": "value"}

        and:

            ```json
            {"key": "value"}
            ```
        """

        if not raw or not raw.strip():
            raise AIServiceError(
                "OpenRouter response contained no text output."
            )

        text = raw.strip()

        # ------------------------------------------------------------
        # Remove Markdown JSON fences.
        # ------------------------------------------------------------

        if text.startswith("```"):

            lines = text.splitlines()

            if lines:
                first = lines[0].strip().lower()

                if first in {
                    "```",
                    "```json",
                }:
                    lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            text = "\n".join(lines).strip()

        # ------------------------------------------------------------
        # First attempt: entire response is JSON.
        # ------------------------------------------------------------

        try:

            parsed = json.loads(text)

            if isinstance(parsed, dict):
                return parsed

        except json.JSONDecodeError:
            pass

        # ------------------------------------------------------------
        # Second attempt: find JSON object inside surrounding text.
        # ------------------------------------------------------------

        start = text.find("{")
        end = text.rfind("}")

        if start >= 0 and end > start:

            candidate = text[start : end + 1]

            try:

                parsed = json.loads(candidate)

                if isinstance(parsed, dict):
                    return parsed

            except json.JSONDecodeError:
                pass

        raise AIServiceError(
            "OpenRouter returned invalid JSON. "
            f"Raw response: {raw[:1000]}"
        )

    # ------------------------------------------------------------------------
    # JSON INSTRUCTION
    # ------------------------------------------------------------------------

    @staticmethod
    def _json_instruction(
        schema: dict,
        schema_name: str,
    ) -> str:
        """
        Add the expected JSON structure to the system prompt.

        This avoids depending on provider-specific structured-output
        support when using the free router.
        """

        schema_text = json.dumps(
            schema,
            ensure_ascii=False,
            separators=(",", ":"),
        )

        return (
            "\n\n"
            "OUTPUT REQUIREMENTS:\n"
            f"You are returning data for the '{schema_name}' schema.\n"
            "\n"
            "Return ONLY one valid JSON object.\n"
            "Do NOT use Markdown.\n"
            "Do NOT use ``` fences.\n"
            "Do NOT add explanations before the JSON.\n"
            "Do NOT add explanations after the JSON.\n"
            "Do NOT add extra keys.\n"
            "Use exactly the keys and types defined below.\n"
            "\n"
            "JSON Schema:\n"
            f"{schema_text}"
        )

    # ------------------------------------------------------------------------
    # GENERIC OPENROUTER CALL
    # ------------------------------------------------------------------------

    async def _call(
        self,
        *,
        system: str,
        user: str,
        schema: dict,
        schema_name: str,
    ) -> dict:
        """
        Central text-generation method.

        IMPORTANT:
        The old code used:

            self.client.responses.create(...)

        That has been completely removed.

        ELEVORA now uses:

            OpenRouter
                ↓
            chat.completions.create()

        """

        system_with_schema = (
            system
            + self._json_instruction(
                schema,
                schema_name,
            )
        )

        try:

            response = (
                await self.openrouter_client
                .chat
                .completions
                .create(
                    model=settings.openrouter_model,

                    messages=[
                        {
                            "role": "system",
                            "content": system_with_schema,
                        },
                        {
                            "role": "user",
                            "content": user,
                        },
                    ],

                    # Keep generation controlled.
                    temperature=0.2,

                    # Prevent unexpectedly huge responses.
                    max_tokens=1200,
                )
            )

        except AIServiceError:
            raise

        except Exception as exc:

            raise AIServiceError(
                f"OpenRouter request failed: {exc}"
            ) from exc

        # ------------------------------------------------------------
        # Safely read the OpenRouter response.
        # ------------------------------------------------------------

        try:

            if not response.choices:
                raise AIServiceError(
                    "OpenRouter returned no choices."
                )

            raw = response.choices[0].message.content

        except AIServiceError:
            raise

        except (AttributeError, IndexError, TypeError) as exc:

            raise AIServiceError(
                f"Unexpected OpenRouter response shape: {exc}"
            ) from exc

        return self._extract_json(
            raw or ""
        )

    # =========================================================================
    # QUESTION GENERATION
    # =========================================================================

    async def generate_question(
        self,
        *,
        system: str,
        user: str,
    ) -> QuestionGeneration:

        data = await self._call(
            system=system,
            user=user,
            schema=QUESTION_SCHEMA,
            schema_name="question_generation",
        )

        try:

            return QuestionGeneration.model_validate(
                data
            )

        except Exception as exc:

            raise AIServiceError(
                "OpenRouter question output failed validation: "
                f"{exc}"
            ) from exc

    # =========================================================================
    # ANSWER ANALYSIS
    # =========================================================================

    async def analyze_answer(
        self,
        *,
        system: str,
        user: str,
    ) -> AnswerAnalysis:

        data = await self._call(
            system=system,
            user=user,
            schema=ANALYSIS_SCHEMA,
            schema_name="answer_analysis",
        )

        try:

            return AnswerAnalysis.model_validate(
                data
            )

        except Exception as exc:

            raise AIServiceError(
                "OpenRouter analysis output failed validation: "
                f"{exc}"
            ) from exc

    # =========================================================================
    # SPEECH TO TEXT
    # =========================================================================

    async def transcribe_audio(
        self,
        *,
        audio_bytes: bytes,
        filename: str,
    ) -> str:
        """
        Speech-to-text stays on OpenAI.

        This method does NOT use OpenRouter.
        """

        try:

            transcript = (
                await self.openai_client
                .audio
                .transcriptions
                .create(
                    model=settings.openai_transcribe_model,
                    file=(
                        filename,
                        audio_bytes,
                    ),
                )
            )

        except AIServiceError:
            raise

        except Exception as exc:

            raise AIServiceError(
                f"OpenAI transcription failed: {exc}"
            ) from exc

        text = getattr(
            transcript,
            "text",
            None,
        )

        if text is None:

            raise AIServiceError(
                "OpenAI transcription response "
                "had no 'text' field."
            )

        return text

    # =========================================================================
    # TEXT TO SPEECH
    # =========================================================================

    async def synthesize_speech(
        self,
        *,
        text: str,
    ) -> bytes:
        """
        Text-to-speech stays on OpenAI.

        This method does NOT use OpenRouter.
        """

        try:

            response = (
                await self.openai_client
                .audio
                .speech
                .create(
                    model=settings.openai_tts_model,
                    voice=settings.openai_tts_voice,
                    input=text,
                )
            )

        except AIServiceError:
            raise

        except Exception as exc:

            raise AIServiceError(
                f"OpenAI speech synthesis failed: {exc}"
            ) from exc

        try:

            return await response.read()

        except AttributeError as exc:

            raise AIServiceError(
                "Unexpected response shape from "
                "audio.speech.create(): "
                f"{exc}"
            ) from exc

    # =========================================================================
    # CANDIDATE PROFILE
    # =========================================================================

    async def extract_candidate_profile(
        self,
        *,
        system: str,
        user: str,
    ) -> CandidateProfile:

        data = await self._call(
            system=system,
            user=user,
            schema=CANDIDATE_PROFILE_SCHEMA,
            schema_name="candidate_profile",
        )

        try:

            return CandidateProfile.model_validate(
                data
            )

        except Exception as exc:

            raise AIServiceError(
                "OpenRouter candidate-profile output "
                f"failed validation: {exc}"
            ) from exc

    # =========================================================================
    # JOB PROFILE
    # =========================================================================

    async def extract_job_profile(
        self,
        *,
        system: str,
        user: str,
    ) -> JobProfile:

        data = await self._call(
            system=system,
            user=user,
            schema=JOB_PROFILE_SCHEMA,
            schema_name="job_profile",
        )

        try:

            return JobProfile.model_validate(
                data
            )

        except Exception as exc:

            raise AIServiceError(
                "OpenRouter job-profile output "
                f"failed validation: {exc}"
            ) from exc

    # =========================================================================
    # FINAL EVALUATION
    # =========================================================================

    async def generate_evaluation(
        self,
        *,
        system: str,
        user: str,
    ) -> EvaluationDraft:

        data = await self._call(
            system=system,
            user=user,
            schema=EVALUATION_SCHEMA,
            schema_name="evaluation_draft",
        )

        try:

            return EvaluationDraft.model_validate(
                data
            )

        except Exception as exc:

            raise AIServiceError(
                "OpenRouter evaluation output "
                f"failed validation: {exc}"
            ) from exc
