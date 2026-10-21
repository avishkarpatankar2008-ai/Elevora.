"""Manual smoke test for the free-only AI router.

This script intentionally does not call paid TTS or any model outside the
six-ID allowlist. It can exercise whichever free-tier provider keys are set.
No actual provider can be verified until credentials and network access exist.

Required for real model calls: at least one of GROQ_API_KEY, GEMINI_API_KEY,
OPENROUTER_API_KEY in backend/.env. Use keys attached to free-tier-only provider
projects; the code cannot inspect whether billing is enabled for a key.

Usage: cd backend && python -m scripts.smoke_test_ai [optional-answer.webm]
"""

import argparse
import asyncio

from app.schemas.profile import InterviewProfile
from app.services import prompts
from app.services.ai_client import AIServiceError, OpenAIClient


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio_file", nargs="?", help="Optional recorded audio file to test Groq transcription")
    args = parser.parse_args()

    client = OpenAIClient()
    profile = InterviewProfile(
        category="software-engineer",
        role="Backend Engineer",
        subjects=["Databases", "System Design"],
        questionTypes=["technical"],
        interviewerStyle="professional",
    )
    print("Free-only routing smoke test (no server-side TTS).")
    print(f"Configured chain: {[f'{provider}:{model}' for provider, model in client._configured_chain()] or 'none (deterministic fallback only)'}")

    try:
        question = await client.generate_question(
            system=prompts.question_system_prompt(profile),
            user=prompts.baseline_question_user_prompt("Databases", difficulty=3, previously_asked=[], opening=True),
        )
        print(f"1. Question generation: {question.question!r}")

        weak_answer = "I used a database once. It worked fine."
        analysis = await client.analyze_answer(
            system=prompts.analysis_system_prompt(profile),
            user=prompts.analysis_user_prompt(question.question, weak_answer, question.difficulty),
        )
        print(f"2. Answer analysis: quality={analysis.quality}, followUpNeeded={analysis.followUpNeeded}")

        sample_resume = (
            "Jane Doe. Skills: Python, PostgreSQL, System Design. "
            "Experience: Backend Engineer at Acme Corp, 2021-2024. "
            "Projects: Rebuilt the payments service, reducing p95 latency by 40%. "
            "Education: BS Computer Science, State University."
        )
        candidate = await client.extract_candidate_profile(
            system=prompts.RESUME_EXTRACTION_SYSTEM_PROMPT,
            user=prompts.resume_extraction_user_prompt(sample_resume),
        )
        print(f"3. Profile extraction: skills={candidate.skills}, projects={candidate.projects}")

        fake_turns = [{
            "sequence": 1,
            "topic": "Databases",
            "difficulty": 3,
            "isFollowUp": False,
            "question": question.question,
            "answer": "I used an index and measured query latency before and after.",
            "evaluation": {"quality": 4, "hasContradiction": False},
        }]
        evaluation = await client.generate_evaluation(
            system=prompts.evaluation_system_prompt(profile),
            user=prompts.evaluation_user_prompt(fake_turns),
        )
        print(f"4. Evaluation draft: knowledgeScore={evaluation.knowledgeScore}, evidence={evaluation.knowledgeEvidence!r}")

        if args.audio_file:
            with open(args.audio_file, "rb") as handle:
                audio_bytes = handle.read()
            transcript = await client.transcribe_audio(audio_bytes=audio_bytes, filename=args.audio_file)
            print(f"5. Groq transcription: {transcript!r}")
        else:
            print("5. Transcription skipped (pass an audio file to test the free Groq STT endpoint).")

        snapshot = client.quota_snapshot()
        if snapshot:
            print("Per-process model counters (requests/successes/failures/rate-limited):")
            for model_id, counts in snapshot.items():
                print(f"  {model_id}: {counts}")
            if not any(counts["successes"] for counts in snapshot.values()):
                print("WARNING: no model request succeeded; outputs may be deterministic fallbacks.")
        else:
            print("No live model requests were attempted; configured chain is empty or cache/fallback was used.")
    except AIServiceError as exc:
        print(f"SMOKE TEST FAILED ({exc.kind}): {exc.user_message}")
        raise SystemExit(1) from exc
    finally:
        await client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
