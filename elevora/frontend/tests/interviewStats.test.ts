import { describe, expect, it } from "vitest";
import {
  applyHistoryQuery,
  averageScore,
  bestScore,
  dimensionAverages,
  minutesPractised,
  practiceStreakWeeks,
  scoreTrend,
} from "@/lib/interviewStats";
import type { Interview, InterviewReport } from "@/lib/types";

function makeInterview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: "i1",
    userId: "u1",
    category: "software-engineer",
    status: "completed",
    difficulty: "medium",
    language: "English",
    durationMinutes: 20,
    createdAt: "2026-01-05T10:00:00.000Z",
    updatedAt: "2026-01-05T10:30:00.000Z",
    questionNumber: 5,
    ...overrides,
  } as Interview;
}

function makeReport(overrides: Partial<InterviewReport> = {}): InterviewReport {
  return {
    interviewId: "i1",
    overallScore: 70,
    categoryScores: {},
    weights: {},
    dimensions: {},
    strengths: [],
    weaknesses: [],
    recommendedPractice: [],
    confidence: "medium",
    generatedAt: "2026-01-05T10:31:00.000Z",
    ...overrides,
  } as InterviewReport;
}

describe("dashboard score maths", () => {
  it("averages only the scores that exist, and returns null when there are none", () => {
    expect(averageScore([])).toBeNull();
    expect(averageScore([makeReport({ overallScore: 70 })])).toBe(70);
    // 70 + 81 = 151 / 2 = 75.5 -> 76 (rounded, never truncated silently).
    expect(averageScore([makeReport({ overallScore: 70 }), makeReport({ overallScore: 81 })])).toBe(76);
  });

  it("reports the best score and null when nothing is scored", () => {
    expect(bestScore([])).toBeNull();
    expect(bestScore([makeReport({ overallScore: 40 }), makeReport({ overallScore: 88 })])).toBe(88);
  });

  it("builds the trend oldest-first and skips unscored interviews", () => {
    const interviews = [
      makeInterview({ id: "new", createdAt: "2026-02-01T10:00:00.000Z" }),
      makeInterview({ id: "old", createdAt: "2026-01-01T10:00:00.000Z" }),
      makeInterview({ id: "unscored", createdAt: "2026-01-15T10:00:00.000Z" }),
    ];
    const reports = {
      new: makeReport({ interviewId: "new", overallScore: 80 }),
      old: makeReport({ interviewId: "old", overallScore: 60 }),
    };
    const trend = scoreTrend(interviews, reports);
    expect(trend.map((point) => point.score)).toEqual([60, 80]);
  });

  it("averages dimensions across scored reports and leaves unmeasured ones null", () => {
    const first = makeReport({
      dimensions: {
        knowledge: { score: 4, evidence: "a" },
        delivery: { score: 3, evidence: "b" },
        webcam: { score: null, evidence: "camera off" },
      },
    });
    const second = makeReport({
      dimensions: {
        knowledge: { score: 5, evidence: "a" },
        delivery: { score: null, evidence: "text only" },
      },
    });
    const averages = dimensionAverages([first, second]);
    expect(averages.knowledge).toBe(4.5);
    expect(averages.delivery).toBe(3); // only the measured report counts
    expect(averages.webcam).toBeNull(); // never zero-filled
    expect(averages.communication).toBeNull();
  });

  it("counts whole weeks, not days, for the practice streak", () => {
    const now = new Date("2026-03-10T12:00:00.000Z"); // Tuesday
    const interviews = [
      makeInterview({ id: "a", updatedAt: "2026-03-09T10:00:00.000Z" }), // this week
      makeInterview({ id: "b", updatedAt: "2026-03-02T10:00:00.000Z" }), // last week
      makeInterview({ id: "c", updatedAt: "2026-02-16T10:00:00.000Z" }), // gap!
    ];
    expect(practiceStreakWeeks(interviews, now)).toBe(2);
    expect(practiceStreakWeeks([], now)).toBe(0);
    expect(
      practiceStreakWeeks([makeInterview({ status: "draft", updatedAt: "2026-03-09T10:00:00.000Z" })], now)
    ).toBe(0);
  });

  it("sums the planned minutes of sessions that were actually started", () => {
    expect(
      minutesPractised([
        makeInterview({ status: "completed", durationMinutes: 20 }),
        makeInterview({ status: "in_progress", durationMinutes: 15 }),
        makeInterview({ status: "draft", durationMinutes: 60 }),
      ])
    ).toBe(35);
  });
});

describe("history search, filter and sort", () => {
  const interviews = [
    makeInterview({ id: "a", role: "Backend Engineer", company: "Acme", createdAt: "2026-01-01T10:00:00.000Z" }),
    makeInterview({ id: "b", role: "Data Analyst", createdAt: "2026-02-01T10:00:00.000Z", status: "in_progress" }),
    makeInterview({ id: "c", role: "QA Engineer", createdAt: "2026-03-01T10:00:00.000Z" }),
  ];
  const reports = { a: makeReport({ interviewId: "a", overallScore: 55 }), c: makeReport({ interviewId: "c", overallScore: 90 }) };

  it("searches role, company and category", () => {
    expect(applyHistoryQuery(interviews, reports, { query: "acme", filter: "all", sort: "recent" }).map((i) => i.id)).toEqual(["a"]);
    expect(applyHistoryQuery(interviews, reports, { query: "qa", filter: "all", sort: "recent" }).map((i) => i.id)).toEqual(["c"]);
  });

  it("filters by status", () => {
    expect(applyHistoryQuery(interviews, reports, { query: "", filter: "in_progress", sort: "recent" }).map((i) => i.id)).toEqual(["b"]);
  });

  it("sorts by score with unscored interviews last, never as zero", () => {
    expect(applyHistoryQuery(interviews, reports, { query: "", filter: "all", sort: "score" }).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts oldest-first when asked", () => {
    expect(applyHistoryQuery(interviews, reports, { query: "", filter: "all", sort: "oldest" }).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
