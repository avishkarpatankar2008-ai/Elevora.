"""Private processing mode: an AI client that never touches the network.

Used whenever a user has not given informed consent to external AI processing
(the default). It satisfies the same protocol as the real client by returning
the schema-safe deterministic fallbacks, so every interview step still works
and scoring stays deterministic. Nothing the candidate provides (resume, job
description, transcript) is transmitted anywhere.
"""

from typing import Any

from app.schemas.ai import AnswerAnalysis, QuestionGeneration
from app.schemas.ai_evaluation import EvaluationDraft
from app.schemas.candidate import CandidateProfile
from app.schemas.job import JobProfile
from app.services.ai_client import AIServiceError, OpenAIClient


class PrivateAIClient:
    """Deterministic, offline implementation of the ``AIClient`` protocol."""

    transmits_externally = False

    @staticmethod
    def _fallback(schema_name: str, user: str) -> dict[str, Any]:
        return OpenAIClient._deterministic_fallback(schema_name, user)

    async def generate_question(self, *, system: str, user: str) -> QuestionGeneration:
        return QuestionGeneration.model_validate(self._fallback("question_generation", user))

    async def analyze_answer(self, *, system: str, user: str) -> AnswerAnalysis:
        return AnswerAnalysis.model_validate(self._fallback("answer_analysis", user))

    async def extract_candidate_profile(self, *, system: str, user: str) -> CandidateProfile:
        return CandidateProfile.model_validate(self._fallback("candidate_profile", user))

    async def extract_job_profile(self, *, system: str, user: str) -> JobProfile:
        return JobProfile.model_validate(self._fallback("job_profile", user))

    async def generate_evaluation(self, *, system: str, user: str) -> EvaluationDraft:
        data = self._fallback("evaluation_draft", user)
        # The shared fallback blames provider outages; here the cause is the
        # user's own privacy setting, and the report should say so.
        for key, value in list(data.items()):
            if isinstance(value, str):
                data[key] = value.replace(
                    "all configured free AI models were unavailable",
                    "private processing is on, so no external AI model was used",
                )
        return EvaluationDraft.model_validate(data)

    async def transcribe_audio(self, *, audio_bytes: bytes, filename: str) -> str:
        raise AIServiceError(
            "Voice transcription needs an external provider; private mode is on.",
            kind="not_configured",
            user_message=(
                "Voice transcription is off while private processing is enabled. "
                "Use a text answer, or allow external AI processing in Settings → Privacy."
            ),
        )

    async def synthesize_speech(self, *, text: str) -> bytes:
        raise AIServiceError(
            "Server-side text-to-speech is disabled.",
            kind="not_configured",
            user_message="Server-side question audio is disabled. Use browser speech playback or read the question above.",
        )
