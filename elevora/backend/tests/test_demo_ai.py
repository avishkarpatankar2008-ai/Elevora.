"""Tests for the offline demo AI (app/services/demo_ai.py).

Two layers, mirroring how the rest of the backend is tested:

1. Unit tests: every demo method is driven through the REAL prompt builders
   in app/services/prompts.py, so the demo's prompt parsing can never drift
   from the templates the engine actually sends.
2. Integration tests: the complete product flow — register → create →
   start → adaptive answers (including a triggered follow-up) → completion →
   scored report — runs through the real HTTP endpoints with DemoAIClient as
   the injected AI, proving the flow works with no provider keys at all.

Plus the config guardrails: demo mode is development-only and is refused at
startup when ENV=production.
"""

import pytest

from app.config import Settings
from app.core.ai_deps import get_ai_client
from app.main import app
from app.schemas.profile import InterviewProfile
from app.services import prompts, similarity
from app.services.ai_client import AIServiceError
from app.services.demo_ai import DemoAIClient, score_answer_text
from tests.test_resume_jd import make_pdf_bytes

pytestmark = pytest.mark.asyncio

PROFILE = InterviewProfile(
    category="software-engineer",
    subjects=["Data Structures", "System Design", "APIs", "Databases", "Testing"],
    questionTypes=["technical", "problem-solving"],
    interviewerStyle="professional",
)


@pytest.fixture
def demo_ai():
    """Inject the real DemoAIClient (no voice delegate) as the app's AI."""
    demo = DemoAIClient()
    app.dependency_overrides[get_ai_client] = lambda: demo
    yield demo
    app.dependency_overrides.pop(get_ai_client, None)


# ---------------------------------------------------------------------------
# question generation
# ---------------------------------------------------------------------------


async def test_baseline_question_is_valid_and_echoes_topic_and_difficulty():
    demo = DemoAIClient()
    user = prompts.baseline_question_user_prompt("System Design", 4, [], opening=True)
    question = await demo.generate_question(system=prompts.question_system_prompt(PROFILE), user=user)
    assert question.topic == "System Design"
    assert question.difficulty == 4
    assert question.isFollowUp is False
    assert question.targetClaim is None
    assert len(question.question) > 20


async def test_topic_lands_on_matching_question_bank():
    demo = DemoAIClient()
    user = prompts.baseline_question_user_prompt("Databases", 3, [])
    question = await demo.generate_question(system=prompts.question_system_prompt(PROFILE), user=user)
    # The databases bank is all database questions; assert on-domain vocabulary.
    assert any(
        word in question.question.lower()
        for word in ("index", "query", "database", "sql", "transaction", "acid", "join", "deadlock", "key", "normali")
    )


async def test_frontend_subjects_do_not_land_on_system_design_questions():
    """"Component Architecture" contains 'architect' but is a frontend subject —
    it must draw from the frontend bank, not system design."""
    demo = DemoAIClient()
    system = prompts.question_system_prompt(PROFILE)
    for topic in ("Component Architecture", "State Management", "Accessibility"):
        question = await demo.generate_question(
            system=system,
            user=prompts.baseline_question_user_prompt(topic, 3, []),
        )
        assert "database" not in question.question.lower()
        assert "shard" not in question.question.lower()


async def test_unknown_topic_falls_back_to_generic_templates():
    demo = DemoAIClient()
    user = prompts.baseline_question_user_prompt("Underwater Basket Weaving", 2, [])
    question = await demo.generate_question(system=prompts.question_system_prompt(PROFILE), user=user)
    assert "Underwater Basket Weaving" in question.question
    assert question.topic == "Underwater Basket Weaving"


async def test_questions_do_not_repeat_within_a_session():
    """Rotation + the engine's own Jaccard check must keep a full session
    free of duplicates on one topic."""
    demo = DemoAIClient()
    system = prompts.question_system_prompt(PROFILE)
    asked: list[str] = []
    for _ in range(8):
        user = prompts.baseline_question_user_prompt("Data Structures", 3, asked)
        question = await demo.generate_question(system=system, user=user)
        assert question.question not in asked
        assert similarity.find_too_similar(question.question, asked) is None
        asked.append(question.question)


async def test_regenerate_nudge_produces_a_different_question():
    demo = DemoAIClient()
    system = prompts.question_system_prompt(PROFILE)
    asked = ["What's the difference between an array and a linked list, and when does each one win?"]
    user = prompts.baseline_question_user_prompt("DSA", 2, asked)
    first = await demo.generate_question(system=system, user=user)
    retry_user = user + prompts.regenerate_unique_suffix(first.question)
    second = await demo.generate_question(system=system, user=retry_user)
    assert second.question != first.question
    assert similarity.find_too_similar(second.question, asked) is None


async def test_follow_up_probes_the_actual_answer():
    demo = DemoAIClient()
    previous = "How do you scale a system that has outgrown a single database?"
    answer = "We chose sharding and reduced p95 latency by 40% after rolling it out."
    user = prompts.follow_up_question_user_prompt(
        "Databases",
        4,
        previous,
        answer,
        "no measurement method given for the 40% reduction",
        [previous],
    )
    question = await demo.generate_question(system=prompts.question_system_prompt(PROFILE), user=user)
    assert question.isFollowUp is True
    assert question.topic == "Databases"
    assert question.difficulty == 4
    # The follow-up cites something real from the answer as the claim it probes.
    assert question.targetClaim
    assert "sharding" in question.targetClaim.lower()


# ---------------------------------------------------------------------------
# answer analysis
# ---------------------------------------------------------------------------


async def test_weak_answer_scores_low_with_honest_weaknesses():
    demo = DemoAIClient()
    user = prompts.analysis_user_prompt("What is a primary key?", "uh, not sure really", 3)
    analysis = await demo.analyze_answer(system=prompts.analysis_system_prompt(PROFILE), user=user)
    assert analysis.quality <= 2
    assert analysis.weaknesses
    assert analysis.followUpNeeded is False
    assert analysis.hasContradiction is False


async def test_strong_answer_scores_high_and_triggers_a_follow_up():
    demo = DemoAIClient()
    answer = (
        "I'd add a write-through Redis cache in front of the primary database, because it "
        "supports TTLs and atomic operations. For example, in my last project we cut p95 latency "
        "from 800ms to 120ms after rolling it out, and we chose Redis over Memcached since we "
        "needed sorted sets for the leaderboard feature."
    )
    user = prompts.analysis_user_prompt("How would you cache a hot read path?", answer, 4)
    analysis = await demo.analyze_answer(system=prompts.analysis_system_prompt(PROFILE), user=user)
    assert analysis.quality >= 4
    assert analysis.isRelevant is True
    assert analysis.strengths
    assert analysis.followUpNeeded is True
    assert analysis.missingEvidence  # the follow-up must have something to probe


async def test_off_topic_answer_is_flagged_not_relevant():
    demo = DemoAIClient()
    user = prompts.analysis_user_prompt(
        "What is a database index?",
        "I really enjoy hiking on weekends and photography is my favorite hobby.",
        3,
    )
    analysis = await demo.analyze_answer(system=prompts.analysis_system_prompt(PROFILE), user=user)
    assert analysis.isRelevant is False
    assert analysis.quality <= 3


async def test_score_answer_text_is_monotonic_in_specificity():
    vague = score_answer_text("Explain X.", "It is what it is.")
    detailed = score_answer_text(
        "Explain X.",
        "X works by doing Y first, then Z, because of W. For example, we reduced errors by 30% "
        "after adopting it, and we chose it over the alternative since it was simpler to operate.",
    )
    assert detailed["quality"] > vague["quality"]


# ---------------------------------------------------------------------------
# resume / JD extraction
# ---------------------------------------------------------------------------

RESUME_TEXT = """Jane Doe
jane@example.com | github.com/janedoe

Education
B.Tech Computer Science, Pune University, 2021, CGPA 8.7

Experience
Backend Engineer at Acme Corp (2021 - present)
Software Engineering Intern at Initech (2020 - 2021)

Projects
Built a real-time analytics dashboard with Django and React
Developed a URL shortener handling 2M requests per day using Redis and FastAPI

Skills
Python, Django, FastAPI, PostgreSQL, Redis, Docker, AWS, Git

Achievements
Reduced API p95 latency by 40% by introducing a caching layer
Led a team of 4 engineers during the platform migration
Won first place in the 2022 company hackathon
"""


async def test_resume_extraction_pulls_only_what_is_present():
    demo = DemoAIClient()
    user = prompts.resume_extraction_user_prompt(RESUME_TEXT)
    profile = await demo.extract_candidate_profile(
        system=prompts.RESUME_EXTRACTION_SYSTEM_PROMPT, user=user
    )
    assert "Python" in profile.skills
    assert "Django" in profile.skills
    assert "PostgreSQL" in profile.technologies
    assert "Redis" in profile.technologies
    assert any("B.Tech" in item for item in profile.education)
    assert any("Acme Corp" in item for item in profile.experience)
    assert any("analytics dashboard" in item.lower() for item in profile.projects)
    # Claims are the checkable, number-bearing statements.
    assert any("40%" in claim for claim in profile.claims)
    assert any("team of 4" in claim for claim in profile.claims)


async def test_resume_extraction_on_empty_text_invents_nothing():
    demo = DemoAIClient()
    profile = await demo.extract_candidate_profile(
        system=prompts.RESUME_EXTRACTION_SYSTEM_PROMPT,
        user=prompts.resume_extraction_user_prompt("   "),
    )
    assert profile.skills == []
    assert profile.claims == []
    assert profile.education == []


JOB_TEXT = """Senior Backend Engineer at CloudScale (fintech)

We are hiring a Senior Backend Engineer to join our payments team.

Responsibilities:
- Design and build REST APIs used by millions of customers
- Own the reliability of our Kafka event pipeline
- Collaborate with product managers to ship quarterly

Requirements:
- 5+ years with Python and Django
- Strong PostgreSQL and Redis experience
- Docker and Kubernetes in production

Nice to have:
- GraphQL
- Terraform
"""


async def test_job_extraction_reads_role_company_and_skill_sections():
    demo = DemoAIClient()
    job = await demo.extract_job_profile(
        system=prompts.JOB_EXTRACTION_SYSTEM_PROMPT,
        user=prompts.job_extraction_user_prompt(JOB_TEXT),
    )
    assert job.role is not None and "Backend Engineer" in job.role
    assert job.company is not None and "CloudScale" in job.company
    assert job.industry == "Fintech"
    assert job.seniority == "senior"
    assert "Python" in job.requiredSkills
    assert "Django" in job.requiredSkills
    assert "Kubernetes" in job.requiredSkills
    assert "GraphQL" in job.preferredSkills
    assert "Terraform" in job.preferredSkills
    assert any("REST APIs" in item for item in job.responsibilities)


async def test_job_extraction_prefers_required_section_over_whole_text():
    """A technology mentioned only in the preferred section must not leak into
    requiredSkills."""
    demo = DemoAIClient()
    text = "Requirements:\n- Java and Spring\n\nNice to have:\n- Rust\n"
    job = await demo.extract_job_profile(
        system=prompts.JOB_EXTRACTION_SYSTEM_PROMPT,
        user=prompts.job_extraction_user_prompt(text),
    )
    assert "Java" in job.requiredSkills
    assert "Rust" not in job.requiredSkills
    assert "Rust" in job.preferredSkills


# ---------------------------------------------------------------------------
# final evaluation
# ---------------------------------------------------------------------------


def _turns_for_evaluation() -> list[dict]:
    return [
        {
            "sequence": 1,
            "topic": "System Design",
            "difficulty": 3,
            "question": "How do you scale a system that has outgrown a single database?",
            "answer": (
                "I'd shard the database by tenant, because it keeps queries local. For example, "
                "we reduced p95 latency by 40% after sharding, and we chose range sharding over "
                "hash sharding since our queries were usually tenant-scoped."
            ),
            "isFollowUp": False,
            "evaluation": {"quality": 5, "hasContradiction": False},
        },
        {
            "sequence": 2,
            "topic": "System Design",
            "difficulty": 4,
            "question": 'You mentioned "we reduced p95 latency by 40%". How did you measure it?',
            "answer": "We used Prometheus histograms on the API gateway and compared week over week.",
            "isFollowUp": True,
            "evaluation": {"quality": 4, "hasContradiction": False},
        },
        {
            "sequence": 3,
            "topic": "Testing",
            "difficulty": 3,
            "question": "What makes a test worth keeping?",
            "answer": "uh, I don't know, tests are fine I guess.",
            "isFollowUp": False,
            "evaluation": {"quality": 1, "hasContradiction": False},
        },
    ]


async def test_evaluation_aggregates_transcript_and_quotes_real_answers():
    demo = DemoAIClient()
    user = prompts.evaluation_user_prompt(_turns_for_evaluation())
    draft = await demo.generate_evaluation(
        system=prompts.evaluation_system_prompt(PROFILE), user=user
    )
    assert 0 <= draft.knowledgeScore <= 5
    assert draft.knowledgeScore >= 3  # two strong turns, one weak
    for evidence in (
        draft.knowledgeEvidence,
        draft.communicationEvidence,
        draft.relevanceEvidence,
        draft.problemSolvingEvidence,
        draft.interviewHandlingEvidence,
    ):
        assert evidence and len(evidence) > 10
    # Evidence must quote the candidate's actual words, never invent.
    assert "Prometheus" in draft.knowledgeEvidence or "sharding" in draft.knowledgeEvidence or "shard" in draft.problemSolvingEvidence
    assert draft.strengths and draft.weaknesses
    assert 1 <= len(draft.recommendedPractice) <= 3
    # The weakest turn (quality 1) is what improvedAnswer rewrites.
    assert draft.improvedAnswer is not None
    assert "worth keeping" in draft.improvedAnswer


async def test_evaluation_handles_contradictions_and_follow_up_counts():
    demo = DemoAIClient()
    turns = _turns_for_evaluation()
    turns[1]["evaluation"]["hasContradiction"] = True
    turns[1]["evaluation"]["quality"] = 2
    draft = await demo.generate_evaluation(
        system=prompts.evaluation_system_prompt(PROFILE),
        user=prompts.evaluation_user_prompt(turns),
    )
    assert "contradiction" in draft.interviewHandlingEvidence
    assert draft.interviewHandlingScore <= 2


async def test_evaluation_on_unparseable_transcript_invents_nothing():
    demo = DemoAIClient()
    draft = await demo.generate_evaluation(
        system=prompts.evaluation_system_prompt(PROFILE),
        user="total template drift — no transcript tags at all",
    )
    assert draft.knowledgeScore == 0
    assert "could not read the transcript" in draft.knowledgeEvidence


# ---------------------------------------------------------------------------
# voice is never faked
# ---------------------------------------------------------------------------


async def test_transcribe_without_provider_fails_honestly():
    demo = DemoAIClient()
    with pytest.raises(AIServiceError) as excinfo:
        await demo.transcribe_audio(audio_bytes=b"fake", filename="answer.webm")
    assert excinfo.value.kind == "not_configured"
    assert "type" in excinfo.value.user_message.lower() or "typed" in excinfo.value.user_message.lower()


async def test_synthesize_without_provider_fails_honestly():
    demo = DemoAIClient()
    with pytest.raises(AIServiceError) as excinfo:
        await demo.synthesize_speech(text="Tell me about yourself.")
    assert excinfo.value.kind == "not_configured"


class _VoiceStub:
    """Stand-in for a configured OpenAIClient — proves delegation works."""

    async def transcribe_audio(self, *, audio_bytes: bytes, filename: str) -> str:
        return "real transcription"

    async def synthesize_speech(self, *, text: str) -> bytes:
        return b"ID3real-audio"


async def test_voice_delegates_when_a_real_client_is_available():
    demo = DemoAIClient(voice_delegate=_VoiceStub())
    assert await demo.transcribe_audio(audio_bytes=b"x", filename="a.webm") == "real transcription"
    assert await demo.synthesize_speech(text="hi") == b"ID3real-audio"


# ---------------------------------------------------------------------------
# config guardrails
# ---------------------------------------------------------------------------


def _settings(**overrides) -> Settings:
    env = overrides.get("env", "development")
    base = {
        "env": env,
        "jwt_secret": "test-secret-value-long-enough-for-any-check-1234567890",
        "frontend_origin": "https://app.example.com" if env == "production" else "http://localhost:3000",
        "mongo_uri": "mongodb://real-host:27017" if env == "production" else "mongodb://localhost:27017",
    }
    base.update(overrides)
    return Settings(_env_file=None, **base)


async def test_demo_mode_resolution():
    assert _settings(env="development", ai_demo_mode="auto").demo_ai_enabled is True
    assert _settings(env="test", ai_demo_mode="auto").demo_ai_enabled is True
    assert _settings(env="production", ai_demo_mode="auto").demo_ai_enabled is False
    assert _settings(env="development", ai_demo_mode="off").demo_ai_enabled is False
    assert _settings(env="production", ai_demo_mode="off").demo_ai_enabled is False
    assert _settings(env="development", ai_demo_mode="on").demo_ai_enabled is True


async def test_production_refuses_forced_demo_mode():
    with pytest.raises(ValueError, match="AI_DEMO_MODE"):
        _settings(
            env="production",
            ai_demo_mode="on",
            mongo_uri="mongodb://real-host:27017",
            frontend_origin="https://app.example.com",
        )


async def test_get_ai_client_selection(monkeypatch):
    """The dependency itself: demo without a key (outside production), real
    client whenever a key exists, regardless of demo mode."""
    import app.core.ai_deps as ai_deps
    from app.services.ai_client import OpenAIClient

    get_ai_client.cache_clear()
    try:
        monkeypatch.setattr(ai_deps, "get_settings", lambda: _settings(openrouter_api_key=""))
        get_ai_client.cache_clear()
        assert isinstance(get_ai_client(), DemoAIClient)

        monkeypatch.setattr(ai_deps, "get_settings", lambda: _settings(openrouter_api_key="sk-or-real"))
        get_ai_client.cache_clear()
        assert isinstance(get_ai_client(), OpenAIClient)

        monkeypatch.setattr(
            ai_deps,
            "get_settings",
            lambda: _settings(openrouter_api_key="", ai_demo_mode="off"),
        )
        get_ai_client.cache_clear()
        assert isinstance(get_ai_client(), OpenAIClient)
    finally:
        get_ai_client.cache_clear()


# ---------------------------------------------------------------------------
# health reports the mode (never silent)
# ---------------------------------------------------------------------------


async def test_health_reports_ai_mode(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["aiMode"] in {"demo", "live", "not_configured"}


# ---------------------------------------------------------------------------
# INTEGRATION: the full product flow with no provider keys at all
# ---------------------------------------------------------------------------

STRONG_ANSWER = (
    "I'd put a write-through Redis cache in front of the database, because it supports TTLs and "
    "atomic counters. For example, we cut p95 latency from 800ms to 120ms after rolling it out, "
    "and we chose Redis over Memcached since we needed sorted sets for leaderboards."
)
MID_ANSWER = (
    "I would write unit tests for the core logic and integration tests for the API boundaries, "
    "then run them in CI on every pull request so regressions get caught early."
)
WEAK_ANSWER = "um, not really sure about that one."


async def _register(client, payload) -> None:
    resp = await client.post("/auth/register", json=payload)
    assert resp.status_code == 201, resp.text


async def test_full_flow_start_to_scored_report(client, demo_ai, user_payload):
    await _register(client, user_payload)

    created = await client.post(
        "/interviews",
        json={
            "category": "software-engineer",
            "difficulty": "medium",
            "language": "English",
            "durationMinutes": 15,  # → maxQuestions = 5 via the duration heuristic
        },
    )
    assert created.status_code == 201
    interview_id = created.json()["id"]

    started = await client.post(f"/interviews/{interview_id}/start")
    assert started.status_code == 200
    body = started.json()
    assert body["status"] == "in_progress"
    assert body["maxQuestions"] == 5
    pending = body["pendingQuestion"]
    assert pending["question"] and pending["isFollowUp"] is False

    answers = [STRONG_ANSWER, MID_ANSWER, WEAK_ANSWER, STRONG_ANSWER, MID_ANSWER]
    saw_follow_up = False
    question_number = 0
    seen_questions = {pending["question"]}
    body = started.json()
    for answer in answers:
        resp = await client.post(
            f"/interviews/{interview_id}/answer",
            json={"answer": answer, "question": pending["question"]},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        question_number += 1
        assert body["questionNumber"] == question_number
        evaluation = body["lastEvaluation"]
        assert 1 <= evaluation["quality"] <= 5
        if body["status"] == "completed":
            assert body["pendingQuestion"] is None
            break
        pending = body["pendingQuestion"]
        if pending["isFollowUp"]:
            saw_follow_up = True
            assert pending["topic"]
        assert pending["question"] not in seen_questions, "no question may repeat in a session"
        seen_questions.add(pending["question"])

    assert body["status"] == "completed", "the demo flow must reach completion"
    assert saw_follow_up, "a claim-bearing answer should have triggered a follow-up"

    # The STRONG answers mention numbers → analysis quality high; the WEAK
    # answer → low. The engine's adaptive difficulty must have moved.
    interview = (await client.get(f"/interviews/{interview_id}")).json()
    assert interview["status"] == "completed"
    assert interview["questionNumber"] == question_number

    turns = (await client.get(f"/interviews/{interview_id}/turns")).json()
    assert len(turns) == question_number
    assert any(t["isFollowUp"] for t in turns)
    assert any(t["speechMetrics"] is None for t in turns)  # text answers have none

    report_resp = await client.post(f"/interviews/{interview_id}/report")
    assert report_resp.status_code == 200, report_resp.text
    report = report_resp.json()
    assert 0 < report["overallScore"] <= 100
    for dimension in ("knowledge", "communication", "relevance", "problemSolving", "interviewHandling"):
        assert dimension in report["categoryScores"]
        assert report["dimensions"][dimension]["score"] is not None
        assert len(report["dimensions"][dimension]["evidence"]) > 10
    # No voice answers, no webcam → honestly unavailable, not zero.
    assert report["dimensions"]["delivery"]["score"] is None
    assert report["dimensions"]["webcam"]["score"] is None
    assert report["strengths"] and report["weaknesses"]
    assert 1 <= len(report["recommendedPractice"]) <= 3
    assert report["confidence"] in {"low", "medium", "high"}

    fetched = await client.get(f"/interviews/{interview_id}/report")
    assert fetched.status_code == 200
    assert fetched.json()["overallScore"] == report["overallScore"]


async def test_full_flow_with_resume_and_jd_grounding(client, demo_ai, user_payload):
    """Upload → extraction → start works through the demo path too."""
    await _register(client, user_payload)
    created = await client.post(
        "/interviews",
        json={"category": "software-engineer", "difficulty": "medium", "durationMinutes": 12},
    )
    interview_id = created.json()["id"]

    resume_pdf = make_pdf_bytes(
        [
            "John Smith",
            "Experience: Backend Engineer at Acme Corp (2019 - 2024)",
            "Skills: Python, Django, PostgreSQL, Docker, AWS",
            "Reduced API p95 latency by 40% by introducing a caching layer",
        ]
    )
    resp = await client.post(
        f"/interviews/{interview_id}/resume",
        files={"file": ("resume.pdf", resume_pdf, "application/pdf")},
    )
    assert resp.status_code == 200, resp.text
    candidate = resp.json()["candidateProfile"]
    assert "Python" in candidate["skills"]
    assert any("40%" in claim for claim in candidate["claims"])

    resp = await client.post(
        f"/interviews/{interview_id}/job-description",
        data={"text": JOB_TEXT},
    )
    assert resp.status_code == 200, resp.text
    job = resp.json()["jobProfile"]
    assert job["role"] and "Engineer" in job["role"]
    assert "Python" in job["requiredSkills"]

    started = await client.post(f"/interviews/{interview_id}/start")
    assert started.status_code == 200
    assert started.json()["pendingQuestion"]["question"]


async def test_voice_answer_in_demo_mode_fails_with_actionable_message(client, demo_ai, user_payload):
    """Voice is never faked: recording without an OPENAI key must return the
    honest, candidate-safe message — and leave the interview usable."""
    await _register(client, user_payload)
    created = await client.post(
        "/interviews", json={"category": "software-engineer", "durationMinutes": 12}
    )
    interview_id = created.json()["id"]
    started = await client.post(f"/interviews/{interview_id}/start")
    pending = started.json()["pendingQuestion"]

    resp = await client.post(
        f"/interviews/{interview_id}/answer/audio",
        files={"audio_file": ("answer.webm", b"fake-audio-bytes", "audio/webm")},
        data={"question": pending["question"]},
    )
    assert resp.status_code == 502, resp.text
    detail = resp.json()["detail"]
    assert "type" in detail.lower()  # points the candidate at typing

    # The text flow still works right after the failed voice attempt.
    resp = await client.post(
        f"/interviews/{interview_id}/answer",
        json={"answer": MID_ANSWER, "question": pending["question"]},
    )
    assert resp.status_code == 200


async def test_question_audio_in_demo_mode_fails_honestly(client, demo_ai, user_payload):
    await _register(client, user_payload)
    created = await client.post(
        "/interviews", json={"category": "software-engineer", "durationMinutes": 12}
    )
    interview_id = created.json()["id"]
    await client.post(f"/interviews/{interview_id}/start")
    resp = await client.get(f"/interviews/{interview_id}/question-audio")
    assert resp.status_code == 502
    assert "text-to-speech" in resp.json()["detail"].lower()
