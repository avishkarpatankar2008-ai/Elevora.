"use client";

import { useMemo } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { HistoryTable } from "@/components/HistoryTable";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScoreRing } from "@/components/ScoreRing";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { StatCard } from "@/components/StatCard";
import { DimensionRadar } from "@/components/charts/DimensionRadar";
import { ScoreTrendChart } from "@/components/charts/ScoreTrendChart";
import { useAuth } from "@/lib/auth-context";
import {
  averageScore,
  bestScore,
  dimensionAverages,
  MAX_REPORT_FETCH_HINT,
  minutesPractised,
  practiceStreakWeeks,
  scoreTrend,
} from "@/lib/interviewStats";
import { useInterviewOverview } from "@/lib/useInterviewOverview";

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user } = useAuth();
  const { interviews, reports, isLoading, isLoadingScores, error, reload } = useInterviewOverview();

  const reportList = useMemo(() => Object.values(reports), [reports]);
  const average = useMemo(() => averageScore(reportList), [reportList]);
  const best = useMemo(() => bestScore(reportList), [reportList]);
  const streak = useMemo(() => practiceStreakWeeks(interviews), [interviews]);
  const minutes = useMemo(() => minutesPractised(interviews), [interviews]);
  const trend = useMemo(() => scoreTrend(interviews, reports), [interviews, reports]);
  const averages = useMemo(() => dimensionAverages(reportList), [reportList]);
  const completed = useMemo(
    () => interviews.filter((interview) => interview.status === "completed"),
    [interviews]
  );
  const inProgress = useMemo(
    () => interviews.filter((interview) => interview.status === "in_progress"),
    [interviews]
  );
  const scoredCount = reportList.length;
  const summaryLimit = Math.min(completed.length, MAX_REPORT_FETCH_HINT);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Header ------------------------------------------------------------ */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {greeting(new Date())}, {user?.name?.split(" ")[0] || "there"}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            {scoredCount > 0
              ? `Your summary is built from the ${scoredCount} scored interview${scoredCount === 1 ? "" : "s"} out of ${completed.length} completed.`
              : "Complete an interview and generate a report to start building your performance picture."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink href="/interviews/new" className="sm:w-auto w-full" size="lg">
              Start new interview
            </ButtonLink>
          {inProgress.length > 0 && (
            <ButtonLink href={`/interviews/${inProgress[0].id} className="sm:w-auto w-full" `} size="lg" variant="secondary">
                Resume session
              </ButtonLink>
          )}
        </div>
      </div>

      {error && (
        <Card className="mt-6" tone="danger">
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={reload}>
            Try again
          </Button>
        </Card>
      )}

      {/* Metrics ----------------------------------------------------------- */}
      <section aria-labelledby="metrics-heading" className="mt-8">
        <h2 id="metrics-heading" className="sr-only">
          Performance metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)
          ) : (
            <>
              <StatCard
                label="Average score"
                value={average !== null ? average : "—"}
                hint={
                  average !== null
                    ? `${scoredCount} scored interview${scoredCount === 1 ? "" : "s"} · best ${best}`
                    : "No scored interviews yet"
                }
              />
              <StatCard
                label="Completed"
                value={completed.length}
                hint={
                  inProgress.length > 0
                    ? `${inProgress.length} session${inProgress.length === 1 ? "" : "s"} in progress`
                    : "All sessions finished"
                }
              />
              <StatCard
                label="Practice streak"
                value={`${streak}w`}
                hint={streak === 0 ? "Complete one this week to start" : "Consecutive weeks with a session"}
              />
              <StatCard
                label="Time on record"
                value={`${minutes}m`}
                hint="Planned minutes across started sessions"
              />
            </>
          )}
        </div>
      </section>

      {/* Overview ---------------------------------------------------------- */}
      <section aria-labelledby="overview-heading" className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <Card className="min-h-[320px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="overview-heading" className="text-sm font-semibold text-ink">
                Score over time
              </h2>
              <p className="mt-1 text-xs text-ink-mute">
                {trend.length > 1
                  ? `Last ${trend.length} scored interviews, oldest first.`
                  : "Two or more scored interviews are needed to draw a trend."}
              </p>
            </div>
            {isLoadingScores && <span className="skeleton h-2 w-24" />}
          </div>

          <div className="mt-4">
            {isLoading ? (
              <Skeleton className="h-56 rounded-xl" />
            ) : trend.length > 1 ? (
              <ScoreTrendChart points={trend} />
            ) : (
              <EmptyState
                title={scoredCount === 0 ? "No scores yet" : "Not enough data for a trend"}
                description={
                  scoredCount === 0
                    ? "Reports are generated from a completed interview's transcript. Finish one, then generate its report to see this chart fill in."
                    : "Complete and score one more interview and your progress line will appear here."
                }
                action={
                  <ButtonLink
                    href={
                      completed.length > 0 && scoredCount === 0
                        ? `/results/${completed[0].id}`
                        : "/interviews/new"
                    }
                    variant="secondary"
                  >
                    {completed.length > 0 && scoredCount === 0
                      ? "Score a completed interview"
                      : "Start an interview"}
                  </ButtonLink>
                }
              />
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          <h2 className="text-sm font-semibold text-ink">Dimension profile</h2>
          <p className="mt-1 text-xs text-ink-mute">
            Average across measured dimensions. Unavailable metrics are omitted, never zeroed.
          </p>
          <div className="mt-4 flex-1">
            {isLoading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : scoredCount === 0 ? (
              <p className="py-10 text-center text-sm leading-6 text-ink-soft">
                Dimension averages appear once you have at least one scored report.
              </p>
            ) : (
              <DimensionRadar averages={averages} />
            )}
          </div>
          {summaryLimit > 0 && scoredCount > 0 && (
            <p className="mt-2 text-[11px] leading-5 text-ink-mute">
              Based on your {scoredCount} most recent scored interviews
              {completed.length > MAX_REPORT_FETCH_HINT ? ` (of ${completed.length} completed)` : ""}.
            </p>
          )}
        </Card>
      </section>

      {/* Recent highlight -------------------------------------------------- */}
      {scoredCount > 0 && !isLoading && (
        <section className="mt-5">
          <Card className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <ScoreRing score={reportList[0].overallScore} size={132} sublabel="latest" />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-sm font-semibold text-ink">Most recent report</h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {reportList[0].strengths[0]
                  ? `Standout: ${reportList[0].strengths[0]}`
                  : "Open the report for the full evidence behind each dimension."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <ButtonLink href={`/results/${reportList[0].interviewId} `} size="sm">Open report</ButtonLink>
                <ButtonLink href="/interviews/new" size="sm" variant="secondary">
                    Practise again
                  </ButtonLink>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* History ----------------------------------------------------------- */}
      <section aria-labelledby="history-heading" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="history-heading" className="text-lg font-semibold tracking-tight text-ink">
              Interview history
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {isLoading ? "Loading…" : `${interviews.length} session${interviews.length === 1 ? "" : "s"} in your account.`}
            </p>
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
            </div>
          ) : (
            <HistoryTable interviews={interviews} reports={reports} />
          )}
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
