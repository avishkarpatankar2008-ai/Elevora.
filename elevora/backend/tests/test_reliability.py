"""Reliability tests: the failure paths where the engine previously lost data,
double-charged the AI, or got stuck.

Each test corresponds to a concrete durability rule:

* one in-flight operation per interview (claims), with self-healing after a
  crash and explicit release on failure;
* exactly one turn recorded per answered question, even under duplicate
  submission (enforced by the unique (interviewId, sequence) index);
* a failed step leaves the interview in a state the candidate can retry from,
  never half-applied.
"""

import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.services.ai_client import AIServiceError

PAYLOAD = {
    "category": "software-engineer",
    "difficulty": "medium",
    "language": "English",
    "durationMinutes": 5,  # -> maxQuestions = 4
}


async def _new_interview(client) -> dict:
    return (await client.post("/interviews", json=PAYLOAD)).json()


async def _started_interview(client, fake_ai_client) -> dict:
    interview = await _new_interview(client)
    fake_ai_client.queue_question(question="Q1?", topic="Databases", difficulty=3)
    resp = await client.post(f"/interviews/{interview['id']}/start")
    assert resp.status_code == 200, resp.text
    return interview


async def _turns(test_db, interview_id: str) -> list[dict]:
    return [t async for t in test_db.interview_turns.find({"interviewId": interview_id})]


# --------------------------------------------------------------- start interview


async def test_question_generation_failure_on_start_leaves_a_startable_draft(
    client, user_payload, fake_ai_client
):
    """A failed first AI call must not leave the interview 'in progress' with no
    question — the candidate would be stuck in a room with nothing to answer."""
    await client.post("/auth/register", json=user_payload)
    interview = await _new_interview(client)

    fake_ai_client.fail_next(
        "generate_question", AIServiceError("provider exploded", kind="unavailable")
    )
    resp = await client.post(f"/interviews/{interview['id']}/start")
    assert resp.status_code == 502

    after = (await client.get(f"/interviews/{interview['id']}")).json()
    assert after["status"] == "draft"
    assert after["pendingQuestion"] is None

    # The claim was released, so a retry works immediately.
    fake_ai_client.queue_question(question="Q1?", topic="Databases", difficulty=3)
    retry = await client.post(f"/interviews/{interview['id']}/start")
    assert retry.status_code == 200
    assert retry.json()["pendingQuestion"]["question"] == "Q1?"


async def test_two_concurrent_starts_produce_one_interview_start(
    client, user_payload, fake_ai_client
):
    await client.post("/auth/register", json=user_payload)
    interview = await _new_interview(client)
    fake_ai_client.queue_question(question="Opening question?")

    first, second = await asyncio.gather(
        client.post(f"/interviews/{interview['id']}/start"),
        client.post(f"/interviews/{interview['id']}/start"),
    )
    codes = sorted([first.status_code, second.status_code])
    assert codes[0] == 200, codes
    assert codes[1] in (400, 409), codes  # "already started" either way
    # The loser must not have triggered a second billed question generation.
    assert len(fake_ai_client.question_calls) == 1


async def test_a_stale_start_claim_does_not_block_a_retry(client, user_payload, fake_ai_client, test_db):
    """Simulates a request killed mid-flight: the claim timestamp is old, so the
    next candidate attempt must be allowed through."""
    await client.post("/auth/register", json=user_payload)
    interview = await _new_interview(client)

    await test_db.interviews.update_one(
        {"_id": ObjectId(interview["id"])},
        {"$set": {"claimStartedAt": datetime.now(timezone.utc) - timedelta(hours=1)}},
    )

    fake_ai_client.queue_question(question="Q1?", topic="Databases", difficulty=3)
    resp = await client.post(f"/interviews/{interview['id']}/start")
    assert resp.status_code == 200, resp.text


# ---------------------------------------------------------------- answer flow


async def test_duplicate_answer_submission_records_exactly_one_turn(
    client, user_payload, fake_ai_client, test_db
):
    """Double-clicking Submit must not create two turns or two AI bills."""
    await client.post("/auth/register", json=user_payload)
    interview = await _started_interview(client, fake_ai_client)
    fake_ai_client.queue_analysis(quality=4, followUpNeeded=False)
    fake_ai_client.queue_question(question="Q2?", topic="Databases", difficulty=3)

    body = {"answer": "My answer.", "question": "Q1?"}
    first, second = await asyncio.gather(
        client.post(f"/interviews/{interview['id']}/answer", json=body),
        client.post(f"/interviews/{interview['id']}/answer", json=body),
    )
    codes = sorted([first.status_code, second.status_code])
    assert codes == [200, 409], codes

    turns = await _turns(test_db, interview["id"])
    assert len(turns) == 1
    assert turns[0]["sequence"] == 1
    assert len(fake_ai_client.analysis_calls) == 1


async def test_late_duplicate_does_not_answer_the_next_question(
    client, user_payload, fake_ai_client, test_db
):
    """The dangerous variant: the retry arrives after the engine already moved
    on. Without the question echo, the same answer text would be recorded
    against Q2 — silently stealing a question from the candidate."""
    await client.post("/auth/register", json=user_payload)
    interview = await _started_interview(client, fake_ai_client)
    fake_ai_client.queue_analysis(quality=4, followUpNeeded=False)
    fake_ai_client.queue_question(question="Q2?", topic="Databases", difficulty=3)

    first = await client.post(
        f"/interviews/{interview['id']}/answer", json={"answer": "My answer.", "question": "Q1?"}
    )
    assert first.status_code == 200

    late = await client.post(
        f"/interviews/{interview['id']}/answer", json={"answer": "My answer.", "question": "Q1?"}
    )
    assert late.status_code == 409
    assert "already been answered" in late.json()["detail"]

    turns = await _turns(test_db, interview["id"])
    assert len(turns) == 1
    after = (await client.get(f"/interviews/{interview['id']}")).json()
    assert after["pendingQuestion"]["question"] == "Q2?"
    # Only the first submission was analysed.
    assert len(fake_ai_client.analysis_calls) == 1


async def test_unique_index_rejects_a_second_turn_with_the_same_sequence(test_db):
    """The final backstop: even if application logic were wrong, the database
    refuses to store two turns numbered the same."""
    interview_id = str(ObjectId())
    await test_db.interview_turns.insert_one(
        {"interviewId": interview_id, "sequence": 1, "question": "q", "answer": "a"}
    )
    with pytest.raises(DuplicateKeyError):
        await test_db.interview_turns.insert_one(
            {"interviewId": interview_id, "sequence": 1, "question": "q2", "answer": "a2"}
        )


async def test_analysis_failure_preserves_the_pending_question_and_records_no_turn(
    client, user_payload, fake_ai_client, test_db
):
    """If the AI analysis call fails, the answer was never accepted — the
    candidate must be able to send it again, and the transcript must not show a
    half-processed turn."""
    await client.post("/auth/register", json=user_payload)
    interview = await _started_interview(client, fake_ai_client)
    question_before = (await client.get(f"/interviews/{interview['id']}")).json()["pendingQuestion"]

    fake_ai_client.fail_next("analyze_answer", AIServiceError("timeout", kind="timeout"))
    resp = await client.post(f"/interviews/{interview['id']}/answer", json={"answer": "attempt"})
    assert resp.status_code == 502

    after = (await client.get(f"/interviews/{interview['id']}")).json()
    assert after["status"] == "in_progress"
    assert after["pendingQuestion"] == question_before
    assert await _turns(test_db, interview["id"]) == []

    # Retry succeeds and records exactly one turn.
    fake_ai_client.queue_analysis(quality=3, followUpNeeded=False)
    fake_ai_client.queue_question(question="Next question?")
    retry = await client.post(f"/interviews/{interview['id']}/answer", json={"answer": "attempt"})
    assert retry.status_code == 200
    assert len(await _turns(test_db, interview["id"])) == 1


async def test_answer_rejects_oversized_text_before_calling_the_ai(
    client, user_payload, fake_ai_client
):
    await client.post("/auth/register", json=user_payload)
    interview = await _started_interview(client, fake_ai_client)

    resp = await client.post(
        f"/interviews/{interview['id']}/answer", json={"answer": "x" * 9000}
    )
    assert resp.status_code == 422
    assert fake_ai_client.analysis_calls == []


async def test_answer_rejects_whitespace_only_text(client, user_payload, fake_ai_client):
    await client.post("/auth/register", json=user_payload)
    interview = await _started_interview(client, fake_ai_client)

    resp = await client.post(f"/interviews/{interview['id']}/answer", json={"answer": "   \n\t "})
    assert resp.status_code == 422
    assert fake_ai_client.analysis_calls == []


# ---------------------------------------------------------------- exit / state


async def test_exit_cannot_downgrade_a_completed_interview(client, user_payload, fake_ai_client):
    """'Completed' is terminal: a stray exit click (or a slow duplicate request)
    must not turn a finished, report-eligible interview into an abandoned one."""
    await client.post("/auth/register", json=user_payload)
    interview = await _started_interview(client, fake_ai_client)

    for i in range(3):
        fake_ai_client.queue_analysis(quality=4, followUpNeeded=False)
        fake_ai_client.queue_question(
            question=f"Question {i + 2}?", topic="Databases", difficulty=3
        )
        await client.post(f"/interviews/{interview['id']}/answer", json={"answer": f"a{i}"})
    fake_ai_client.queue_analysis(quality=4, followUpNeeded=False)
    done = await client.post(f"/interviews/{interview['id']}/answer", json={"answer": "last"})
    assert done.json()["status"] == "completed"

    exit_attempt = await client.post(f"/interviews/{interview['id']}/exit")
    assert exit_attempt.status_code == 400

    after = (await client.get(f"/interviews/{interview['id']}")).json()
    assert after["status"] == "completed"
    # And the report is still generatable.
    fake_ai_client.queue_evaluation()
    assert (await client.post(f"/interviews/{interview['id']}/report")).status_code == 200


async def test_abandoned_interview_cannot_be_answered(client, user_payload, fake_ai_client):
    await client.post("/auth/register", json=user_payload)
    interview = await _started_interview(client, fake_ai_client)
    assert (await client.post(f"/interviews/{interview['id']}/exit")).status_code == 200

    resp = await client.post(f"/interviews/{interview['id']}/answer", json={"answer": "too late"})
    assert resp.status_code == 400
    assert fake_ai_client.analysis_calls == []


# -------------------------------------------------------------------- reports


async def test_report_failure_is_retryable_and_leaves_no_partial_report(
    client, user_payload, fake_ai_client, test_db
):
    await client.post("/auth/register", json=user_payload)
    interview = await _started_interview(client, fake_ai_client)
    for i in range(3):
        fake_ai_client.queue_analysis(quality=4, followUpNeeded=False)
        fake_ai_client.queue_question(question=f"Question {i + 2}?")
        await client.post(f"/interviews/{interview['id']}/answer", json={"answer": f"a{i}"})
    fake_ai_client.queue_analysis(quality=4, followUpNeeded=False)
    await client.post(f"/interviews/{interview['id']}/answer", json={"answer": "last"})

    fake_ai_client.fail_next("generate_evaluation", AIServiceError("boom", kind="unavailable"))
    failed = await client.post(f"/interviews/{interview['id']}/report")
    assert failed.status_code == 502

    doc = await test_db.interviews.find_one({"_id": ObjectId(interview["id"])})
    assert doc.get("report") is None
    assert doc.get("claimReportAt") is None  # claim released, not left dangling

    fake_ai_client.queue_evaluation()
    retry = await client.post(f"/interviews/{interview['id']}/report")
    assert retry.status_code == 200
    assert retry.json()["overallScore"] >= 0


async def test_in_flight_report_claim_blocks_a_second_generation(
    client, user_payload, fake_ai_client, test_db
):
    """Two 'Generate report' clicks: while one is in flight, the other must be
    rejected *before* it can bill a second evaluation call."""
    await client.post("/auth/register", json=user_payload)
    interview = await _started_interview(client, fake_ai_client)
    for i in range(3):
        fake_ai_client.queue_analysis(quality=4, followUpNeeded=False)
        fake_ai_client.queue_question(question=f"Question {i + 2}?")
        await client.post(f"/interviews/{interview['id']}/answer", json={"answer": f"a{i}"})
    fake_ai_client.queue_analysis(quality=4, followUpNeeded=False)
    await client.post(f"/interviews/{interview['id']}/answer", json={"answer": "last"})

    # Simulate a generation already in flight.
    await test_db.interviews.update_one(
        {"_id": ObjectId(interview["id"])},
        {"$set": {"reportClaimedAt": datetime.now(timezone.utc)}},
    )

    blocked = await client.post(f"/interviews/{interview['id']}/report")
    assert blocked.status_code == 409
    assert fake_ai_client.evaluation_calls == []

    # A claim older than the stale window is ignored, so a crashed request can
    # never block reports forever.
    await test_db.interviews.update_one(
        {"_id": ObjectId(interview["id"])},
        {"$set": {"reportClaimedAt": datetime.now(timezone.utc) - timedelta(hours=1)}},
    )
    fake_ai_client.queue_evaluation()
    assert (await client.post(f"/interviews/{interview['id']}/report")).status_code == 200
