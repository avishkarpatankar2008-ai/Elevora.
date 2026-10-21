import { DIMENSION_ORDER, type Interview, type InterviewReport } from "./types";

/** How many recent reports the dashboard loads for its averages (see useInterviewOverview). */
export const MAX_REPORT_FETCH_HINT = 12;

/**
 * Pure derivations for the dashboard. Kept free of React and fetch so the
 * arithmetic can be unit-tested — every number the user sees on the overview
 * comes from one of these functions, and none of them invent data: when there
 * is nothing to measure they return null/0 and the UI says so.
 */

/** Average of the overall scores that actually exist. Null when nothing is scored. */
export function averageScore(reports: InterviewReport[]): number | null {
  if (reports.length === 0) return null;
  const total = reports.reduce((sum, report) => sum + report.overallScore, 0);
  return Math.round(total / reports.length);
}

/** Best score achieved, or null when no report exists. */
export function bestScore(reports: InterviewReport[]): number | null {
  if (reports.length === 0) return null;
  return Math.max(...reports.map((report) => report.overallScore));
}

export interface TrendPoint {
  label: string;
  /** ISO date of the interview, used for the tooltip/axis. */
  date: string;
  score: number;
}

/** Oldest → newest, one point per scored interview. */
export function scoreTrend(
  interviews: Interview[],
  reports: Record<string, InterviewReport>
): TrendPoint[] {
  return interviews
    .filter((interview) => reports[interview.id])
    .map((interview) => ({
      label: new Date(interview.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      date: interview.createdAt,
      score: reports[interview.id].overallScore,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export type DimensionAverages = Record<string, number | null>;

/** Per-dimension mean (0-5, 1 dp) across scored reports, null where never measured. */
export function dimensionAverages(reports: InterviewReport[]): DimensionAverages {
  const result: DimensionAverages = {};
  for (const dimension of DIMENSION_ORDER) {
    const scores = reports
      .map((report) => report.dimensions[dimension]?.score)
      .filter((score): score is number => typeof score === "number");
    result[dimension] = scores.length
      ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10
      : null;
  }
  return result;
}

/**
 * Consecutive calendar weeks (including this one) with at least one completed
 * interview. Counting weeks rather than days keeps the streak meaningful for a
 * practice habit; it never counts future dates, and a week with none ends it.
 */
export function practiceStreakWeeks(interviews: Interview[], now: Date = new Date()): number {
  const completed = interviews.filter((interview) => interview.status === "completed");
  if (completed.length === 0) return 0;

  const startOfWeek = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    // Weeks start on Monday.
    const day = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - day);
    return copy.getTime();
  };

  const weeks = new Set(
    completed.map((interview) => startOfWeek(new Date(interview.updatedAt ?? interview.createdAt)))
  );

  let streak = 0;
  const cursor = new Date(now);
  while (weeks.has(startOfWeek(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/** Total minutes of interviews that were actually started. */
export function minutesPractised(interviews: Interview[]): number {
  return interviews
    .filter((interview) => interview.status !== "draft")
    .reduce((sum, interview) => sum + (interview.durationMinutes || 0), 0);
}

export type HistorySort = "recent" | "oldest" | "score";
export type HistoryFilter = "all" | Interview["status"];

export interface HistoryQuery {
  query: string;
  filter: HistoryFilter;
  sort: HistorySort;
}

/** Search / filter / sort for the history table — client-side over the loaded page. */
export function applyHistoryQuery(
  interviews: Interview[],
  reports: Record<string, InterviewReport>,
  { query, filter, sort }: HistoryQuery
): Interview[] {
  const needle = query.trim().toLowerCase();
  const filtered = interviews.filter((interview) => {
    if (filter !== "all" && interview.status !== filter) return false;
    if (!needle) return true;
    return [interview.role, interview.company, interview.category, interview.exam, interview.industry]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(needle));
  });

  return [...filtered].sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sort === "score") {
      // Unscored interviews sort last rather than counting as zero.
      const aScore = reports[a.id]?.overallScore;
      const bScore = reports[b.id]?.overallScore;
      if (aScore === undefined && bScore === undefined) return 0;
      if (aScore === undefined) return 1;
      if (bScore === undefined) return -1;
      return bScore - aScore;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
