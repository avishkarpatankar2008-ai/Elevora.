<<<<<<< HEAD
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
=======
"""Manual smoke test for the real AI providers.

Text generation runs on OpenRouter, speech-to-text and text-to-speech on
OpenAI. The automated suite covers the client's failure handling with stubs
(see tests/test_ai_client.py), but no test can confirm that a real key, a real
model id, and real network access work together. Run this once after
configuring credentials, and after changing the model ids.

Preconditions:
    OPENROUTER_API_KEY   set (text: questions, analysis, extraction, reports)
    OPENAI_API_KEY       set (voice: transcription + TTS)

Usage:
    cd backend
    source venv/bin/activate  (or however you activated your env)
    python -m scripts.smoke_test_ai
"""

>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
import asyncio

from app.schemas.profile import InterviewProfile
from app.services import prompts
from app.services.ai_client import AIServiceError, OpenAIClient


async def main() -> None:
<<<<<<< HEAD
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio_file", nargs="?", help="Optional recorded audio file to test Groq transcription")
    args = parser.parse_args()

=======
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
    client = OpenAIClient()
    profile = InterviewProfile(
        category="software-engineer",
        role="Backend Engineer",
        subjects=["Databases", "System Design"],
        questionTypes=["technical"],
        interviewerStyle="professional",
    )
<<<<<<< HEAD
    print("Free-only routing smoke test (no server-side TTS).")
    print(f"Configured chain: {[f'{provider}:{model}' for provider, model in client._configured_chain()] or 'none (deterministic fallback only)'}")

=======

    print("1. Generating an opening question (OpenRouter)...")
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
    try:
        question = await client.generate_question(
            system=prompts.question_system_prompt(profile),
            user=prompts.baseline_question_user_prompt("Databases", difficulty=3, previously_asked=[], opening=True),
        )
<<<<<<< HEAD
        print(f"1. Question generation: {question.question!r}")

        weak_answer = "I used a database once. It worked fine."
=======
    except AIServiceError as exc:
        print(f"   FAILED ({exc.kind}): {exc}")
        print(f"   User-facing message: {exc.user_message}")
        print("   Check OPENROUTER_API_KEY and OPENROUTER_MODEL.")
        return

    print(f"   question = {question.question!r}")
    print(f"   topic = {question.topic!r}, difficulty = {question.difficulty}, isFollowUp = {question.isFollowUp}")

    print("\n2. Analyzing a deliberately weak answer...")
    weak_answer = "I used a database once. It worked fine."
    try:
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
        analysis = await client.analyze_answer(
            system=prompts.analysis_system_prompt(profile),
            user=prompts.analysis_user_prompt(question.question, weak_answer, question.difficulty),
        )
<<<<<<< HEAD
        print(f"2. Answer analysis: quality={analysis.quality}, followUpNeeded={analysis.followUpNeeded}")

        sample_resume = (
            "Jane Doe. Skills: Python, PostgreSQL, System Design. "
            "Experience: Backend Engineer at Acme Corp, 2021-2024. "
            "Projects: Rebuilt the payments service, reducing p95 latency by 40%. "
            "Education: BS Computer Science, State University."
        )
=======
    except AIServiceError as exc:
        print(f"   FAILED ({exc.kind}): {exc}")
        return

    print(f"   quality = {analysis.quality}")
    print(f"   strengths = {analysis.strengths}")
    print(f"   weaknesses = {analysis.weaknesses}")
    print(f"   followUpNeeded = {analysis.followUpNeeded}  missingEvidence = {analysis.missingEvidence!r}")

    print("\n3. Analyzing a deliberately strong, specific answer...")
    strong_answer = (
        "I optimized a Postgres query that scanned 2M rows by adding a composite "
        "index on (user_id, created_at), which cut p95 latency from 800ms to 40ms — "
        "verified with EXPLAIN ANALYZE before and after."
    )
    try:
        analysis2 = await client.analyze_answer(
            system=prompts.analysis_system_prompt(profile),
            user=prompts.analysis_user_prompt(question.question, strong_answer, question.difficulty),
        )
    except AIServiceError as exc:
        print(f"   FAILED ({exc.kind}): {exc}")
        return

    print(f"   quality = {analysis2.quality} (expect this higher than the weak answer's {analysis.quality})")
    print(f"   strengths = {analysis2.strengths}")

    print("\n4. Synthesizing speech for the opening question (OpenAI TTS)...")
    try:
        audio_bytes = await client.synthesize_speech(text=question.question)
    except AIServiceError as exc:
        print(f"   FAILED: {exc}")
        print("   Check OPENAI_API_KEY, OPENAI_TTS_MODEL and OPENAI_TTS_VOICE.")
        return
    print(f"   got {len(audio_bytes)} bytes back.")
    with open("smoke_test_question.mp3", "wb") as f:
        f.write(audio_bytes)
    print("   wrote smoke_test_question.mp3 in the current directory — play it and confirm")
    print("   it's actually the question being read aloud, not silence or garbage.")

    print("\n5. Transcribing that same audio back (round-trip sanity check)...")
    try:
        transcript = await client.transcribe_audio(audio_bytes=audio_bytes, filename="question.mp3")
    except AIServiceError as exc:
        print(f"   FAILED ({exc.kind}): {exc}")
        return
    print(f"   transcript = {transcript!r}")
    print("   Compare this to the original question text above — it won't match exactly")
    print("   (TTS/STT roundtrips rarely do) but it should be recognizably the same content.")

    print("\n6. Extracting a candidate profile from sample resume text...")
    sample_resume = (
        "Jane Doe. Skills: Python, PostgreSQL, System Design. "
        "Experience: Backend Engineer at Acme Corp, 2021-2024. "
        "Projects: Rebuilt the payments service, reducing p95 latency by 40%. "
        "Education: BS Computer Science, State University."
    )
    try:
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
        candidate = await client.extract_candidate_profile(
            system=prompts.RESUME_EXTRACTION_SYSTEM_PROMPT,
            user=prompts.resume_extraction_user_prompt(sample_resume),
        )
<<<<<<< HEAD
        print(f"3. Profile extraction: skills={candidate.skills}, projects={candidate.projects}")

        fake_turns = [{
=======
    except AIServiceError as exc:
        print(f"   FAILED ({exc.kind}): {exc}")
        return
    print(f"   skills = {candidate.skills}")
    print(f"   projects = {candidate.projects}")
    print("   Check nothing here was invented beyond what's in sample_resume above.")

    print("\n7. Generating an evaluation report from a tiny sample transcript...")
    fake_turns = [
        {
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
            "sequence": 1,
            "topic": "Databases",
            "difficulty": 3,
            "isFollowUp": False,
<<<<<<< HEAD
            "question": question.question,
            "answer": "I used an index and measured query latency before and after.",
            "evaluation": {"quality": 4, "hasContradiction": False},
        }]
=======
            "question": "Tell me about a time you optimized a slow query.",
            "answer": strong_answer,
            "evaluation": {"quality": 5, "hasContradiction": False},
        },
        {
            "sequence": 2,
            "topic": "System Design",
            "difficulty": 3,
            "isFollowUp": False,
            "question": "How would you design a URL shortener?",
            "answer": weak_answer,
            "evaluation": {"quality": 2, "hasContradiction": False},
        },
    ]
    try:
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
        evaluation = await client.generate_evaluation(
            system=prompts.evaluation_system_prompt(profile),
            user=prompts.evaluation_user_prompt(fake_turns),
        )
<<<<<<< HEAD
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
=======
    except AIServiceError as exc:
        print(f"   FAILED: {exc}")
        return
    print(f"   knowledgeScore = {evaluation.knowledgeScore}  evidence = {evaluation.knowledgeEvidence!r}")
    print(f"   strengths = {evaluation.strengths}")
    print(f"   weaknesses = {evaluation.weaknesses}")
    print("   Check each score's evidence actually references the fake transcript above,")
    print("   not something invented.")

    print("\nIf all seven steps produced sensible output, the integration is basically sound.")
    print("Things worth checking manually beyond this script:")
    print("  - Run start_interview -> submit_answer several times in a row via the API")
    print("    and confirm no repeated questions across ~10 turns.")
    print("  - Try an off-topic or contradictory answer and see whether hasContradiction/")
    print("    followUpNeeded behave sensibly — the prompts are a first draft, not tuned.")
    print("  - Run the full report generation via POST /interviews/{id}/report on a real")
    print("    completed interview and read the whole thing, not just this one call.")
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7


if __name__ == "__main__":
    asyncio.run(main())
