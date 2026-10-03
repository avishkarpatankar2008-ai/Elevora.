"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/Alert";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { DimensionBar, type DimensionKind } from "@/components/DimensionBar";
import { EmptyState } from "@/components/EmptyState";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScoreRing } from "@/components/ScoreRing";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { ApiError, interviewsApi } from "@/lib/api";
import {
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  INTERVIEW_CATEGORIES,
  type Confidence,
  type Interview,
  type InterviewReport,
  type InterviewTurn,
} from "@/lib/types";

function categoryLabel(value: string) {
  return INTERVIEW_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

const CONFIDENCE_COPY: Record<Confidence, string> = {
  low: "Short or narrow session — treat these scores as a directional signal, not a verdict.",
  medium: "A reasonable sample of questions to draw conclusions from.",
  high: "Enough breadth and depth here to trust the scores.",
};

/**
 * Which evaluator produced each dimension. This is the honest spine of the
 * report: AI judgement, on-device measurement, and "not available" are three
 * different claims and are never blended into one number.
 */
const DIMENSION_KIND: Record<string, DimensionKind> = {
  knowledge: "ai",
  communication: "ai",
  relevance: "ai",
  problemSolving: "ai",
  interviewHandling: "ai",
  delivery: "measured",
  webcam: "measured",
};

const KIND_EXPLAINER: Record<Exclude<DimensionKind, "unavailable">, string> = {
  ai: "Judged by the AI evaluator from your transcript.",
  measured: "Measured on your own device or from your audio — never inferred.",
};

function SourceLegend({ report }: { report: InterviewReport }) {
  const available = DIMENSION_ORDER.filter((key) => report.dimensions[key].score !== null);
  const missing = DIMENSION_ORDER.filter((key) => report.dimensions[key].score === null);
  const aiCount = available.filter((key) => DIMENSION_KIND[key] === "ai").length;
  const measuredCount = available.filter((key) => DIMENSION_KIND[key] === "measured").length;

  return (
    <Card>
      <h2 className="text-sm font-semibold text-ink">How to read this report</h2>
      <p className="mt-1 text-sm leading-6 text-ink-soft">
        Three kinds of evidence appear below and are labelled at every step. Nothing is estimated to
        fill a gap, and a missing measurement is never scored as zero.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        <li className="rounded-xl border border-plum/25 bg-plum/[0.07] p-3.5">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-plum">
            AI-evaluated · {aiCount}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-ink-soft">{KIND_EXPLAINER.ai}</p>
        </li>
        <li className="rounded-xl border border-blue/25 bg-blue/[0.07] p-3.5">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-blue">
            Measured · {measuredCount}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-ink-soft">{KIND_EXPLAINER.measured}</p>
        </li>
        <li className="rounded-xl border border-line bg-white/[0.03] p-3.5">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-mute">
            Not available · {missing.length}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-ink-soft">
            {missing.length === 0
              ? "Every dimension was measurable in this session."
              : `${missing.map((key) => DIMENSION_LABELS[key]).join(", ")} — no data was collected for these, so no score is shown.`}
          </p>
        </li>
      </ul>
    </Card>
  );
}

function ScoreExplanation({ report }: { report: InterviewReport }) {
  const entries = DIMENSION_ORDER.filter(
    (key) => typeof report.weights?.[key] === "number" && report.weights[key] > 0
  );
  if (entries.length === 0) return null;

  return (
    <Card>
      <h2 className="text-sm font-semibold text-ink">How this score was computed</h2>
      <p className="mt-1 text-sm leading-6 text-ink-soft">
        Each dimension is scored 0–5, converted to a percentage, then combined by weight. Unmeasured
        dimensions are excluded entirely and the remaining weights are renormalised.
      </p>
      <ul className="mt-4 space-y-2.5">
        {entries.map((key) => (
          <li key={key} className="flex items-center gap-4">
            <span className="w-40 shrink-0 text-sm text-ink-soft">{DIMENSION_LABELS[key]}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-blue to-plum"
                style={{ width: `${Math.round(report.weights[key] * 100)}%` }}
              />
            </span>
            <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-ink-mute">
              {Math.round(report.weights[key] * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DimensionSection({
  title,
  description,
  keys,
  report,
}: {
  title: string;
  description: string;
  keys: string[];
  report: InterviewReport;
}) {
  if (keys.length === 0) return null;
  return (
    <Card>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-ink-mute">{description}</p>
      <div className="mt-5 space-y-6">
        {keys.map((key) => (
          <DimensionBar
            key={key}
            label={DIMENSION_LABELS[key]}
            dimension={report.dimensions[key]}
            kind={DIMENSION_KIND[key]}
          />
        ))}
      </div>
    </Card>
  );
}

function QuestionAnalysis({ turns }: { turns: InterviewTurn[] }) {
  if (turns.length === 0) {
    return (
      <Card>
        <h2 className="text-sm font-semibold text-ink">Question by question</h2>
        <p className="mt-2 text-sm text-ink-soft">
          No answers were recorded for this session, so there is nothing to break down.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Question by question</h2>
        <span className="text-xs text-ink-mute">{turns.length} answered</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-ink-mute">
        Your exact questions and answers. Delivery figures are measured from the audio of that
        answer where you answered by voice; text answers have no delivery measurement.
      </p>

      <ol className="mt-4 space-y-4">
        {turns.map((turn) => (
          <li key={turn.sequence} className="rounded-xl border border-line bg-navy-950/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-plum">
                Question {String(turn.sequence).padStart(2, "0")}
              </span>
              {turn.isFollowUp && <Badge tone="plum">Follow-up</Badge>}
              {turn.topic && <span className="text-xs text-ink-mute">{turn.topic}</span>}
              <span className="text-xs text-ink-mute">
                {turn.speechMetrics ? "Voice answer" : "Text answer"}
              </span>
            </div>

            <p className="mt-2.5 text-sm font-medium leading-6 text-ink">{turn.question}</p>

            <details className="mt-3 group">
              <summary className="cursor-pointer list-none text-xs font-medium text-blue hover:text-blue-soft">
                <span className="group-open:hidden">Show your answer</span>
                <span className="hidden group-open:inline">Hide your answer</span>
              </summary>
              <p className="mt-2 whitespace-pre-wrap border-l-2 border-line pl-3 text-sm leading-6 text-ink-soft">
                {turn.answer}
              </p>
            </details>

            {turn.speechMetrics && (
              <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line-soft pt-3 text-xs">
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-ink-mute">Pace</dt>
                  <dd className="font-medium text-ink-soft">
                    {Math.round(turn.speechMetrics.wordsPerMinute)} WPM
                  </dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-ink-mute">Fillers</dt>
                  <dd className="font-medium text-ink-soft">{turn.speechMetrics.fillerCount}</dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-ink-mute">Pauses</dt>
                  <dd className="font-medium text-ink-soft">{turn.speechMetrics.pauseCount}</dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-ink-mute">Longest pause</dt>
                  <dd className="font-medium text-ink-soft">
                    {turn.speechMetrics.longestPauseSeconds.toFixed(1)}s
                  </dd>
                </div>
              </dl>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function ReportView({
  interview,
  report,
  turns,
  onRegenerate,
  isRegenerating,
  regenerateError,
}: {
  interview: Interview;
  report: InterviewReport;
  turns: InterviewTurn[];
  onRegenerate: () => void;
  isRegenerating: boolean;
  regenerateError: string | null;
}) {
  const aiDimensions = DIMENSION_ORDER.filter((key) => DIMENSION_KIND[key] === "ai");
  const measuredDimensions = DIMENSION_ORDER.filter((key) => DIMENSION_KIND[key] === "measured");
  const availableCount = DIMENSION_ORDER.filter(
    (key) => report.dimensions[key].score !== null
  ).length;

  return (
    <div className="mt-6 space-y-5">
      {/* Headline ------------------------------------------------------- */}
      <Card variant="elevated" className="flex flex-col items-center gap-7 sm:flex-row sm:items-center">
        <ScoreRing score={report.overallScore} size={176} />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="eyebrow">Overall performance</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
            {categoryLabel(interview.category)}
            {interview.role ? ` · ${interview.role}` : ""}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
            {CONFIDENCE_COPY[report.confidence]}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-ink-mute sm:justify-start">
            <span className="flex items-baseline gap-1.5">
              <span>Confidence</span>
              <span className="font-medium capitalize text-ink-soft">{report.confidence}</span>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span>Dimensions scored</span>
              <span className="font-medium text-ink-soft">
                {availableCount} of {DIMENSION_ORDER.length}
              </span>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span>Generated</span>
              <span className="font-medium text-ink-soft">
                <time dateTime={report.generatedAt}>
                  {new Date(report.generatedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </span>
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button variant="secondary" onClick={onRegenerate} isLoading={isRegenerating}>
            Regenerate report
          </Button>
          <ButtonLink href={`/interviews/${interview.id} `} variant="ghost" className="w-full">
              Review transcript
            </ButtonLink>
        </div>
      </Card>

      {regenerateError && <Alert tone="error">{regenerateError}</Alert>}

      <SourceLegend report={report} />

      {/* Dimensions ----------------------------------------------------- */}
      <DimensionSection
        title="Technical knowledge & problem solving"
        description="Judged by the AI evaluator from what you said — each score cites the evidence it used."
        keys={aiDimensions.filter((key) => key === "knowledge" || key === "problemSolving")}
        report={report}
      />
      <DimensionSection
        title="Communication & answer quality"
        description="How clearly and relevantly you answered, judged from the transcript."
        keys={aiDimensions.filter((key) =>
          ["communication", "relevance", "interviewHandling"].includes(key)
        )}
        report={report}
      />
      <DimensionSection
        title="Speech & interview performance"
        description="Delivery is measured from your audio; camera presence is measured on your device. Neither is guessed."
        keys={measuredDimensions}
        report={report}
      />

      <ScoreExplanation report={report} />

      {/* Strengths / improvements --------------------------------------- */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-ink">Strengths</h2>
          {report.strengths.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              Nothing specific stood out in this session — try a longer interview for a clearer
              signal.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {report.strengths.map((strength) => (
                <li key={strength} className="flex gap-3 text-sm leading-6 text-ink-soft">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success"
                  />
                  {strength}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-ink">Areas to improve</h2>
          {report.weaknesses.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              No specific weaknesses were identified in this session.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {report.weaknesses.map((weakness) => (
                <li key={weakness} className="flex gap-3 text-sm leading-6 text-ink-soft">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-plum"
                  />
                  {weakness}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <QuestionAnalysis turns={turns} />

      {/* Recommendations ------------------------------------------------ */}
      <Card tone="brand">
        <h2 className="text-sm font-semibold text-ink">Recommendations</h2>
        {report.recommendedPractice.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            No specific practice suggestions were generated for this session.
          </p>
        ) : (
          <ol className="mt-3 space-y-2.5">
            {report.recommendedPractice.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-ink-soft">
                <span className="font-mono text-xs text-blue">{String(index + 1).padStart(2, "0")}</span>
                {item}
              </li>
            ))}
          </ol>
        )}
        <div className="mt-5">
          <ButtonLink href="/interviews/new">Start a targeted practice interview</ButtonLink>
        </div>
      </Card>

      {report.improvedAnswer && (
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-ink">
              A stronger version of one of your answers
            </h2>
            <Badge tone="plum">AI-written example</Badge>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-soft">
            {report.improvedAnswer}
          </p>
          <p className="mt-3 text-xs leading-5 text-ink-mute">
            Written by the AI from your own transcript — a model of how to structure an answer, not a
            script to memorise.
          </p>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 pb-4">
        <ButtonLink href={`/interviews/${interview.id} `} variant="secondary">Review the transcript</ButtonLink>
        <ButtonLink href="/dashboard" variant="ghost">Back to dashboard</ButtonLink>
      </div>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="mt-6 space-y-5" aria-busy="true">
      <Card className="flex flex-col items-center gap-7 sm:flex-row">
        <Skeleton className="h-44 w-44 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-3 w-full max-w-lg" />
          <Skeleton className="h-3 w-40" />
        </div>
      </Card>
      <SkeletonCard lines={3} />
      <SkeletonCard lines={5} />
      <p className="sr-only" role="status">
        Loading your performance report…
      </p>
    </div>
  );
}

function ResultsContent({ id }: { id: string }) {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    interviewsApi
      .get(id, controller.signal)
      .then(async (interviewData) => {
        setInterview(interviewData);
        try {
          setReport(await interviewsApi.getReport(id, controller.signal));
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (!(err instanceof ApiError && err.status === 404)) throw err;
          // 404 means "no report yet" — an empty state, not an error.
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? "This interview doesn't exist, or it belongs to another account."
            : "We couldn't load this interview. Check your connection and try again."
        );
      })
      .finally(() => setIsLoading(false));

    interviewsApi
      .turns(id, controller.signal)
      .then(setTurns)
      .catch(() => setTurns([]));

    return () => controller.abort();
  }, [id]);

  async function handleGenerate() {
    setGenerateError(null);
    setIsGenerating(true);
    try {
      setReport(await interviewsApi.generateReport(id));
    } catch (err) {
      setGenerateError(
        err instanceof ApiError
          ? err.message
          : "Couldn't generate the report. Check your connection and try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const heading = useMemo(
    () => (interview ? categoryLabel(interview.category) : "Performance report"),
    [interview]
  );

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Alert tone="error">{loadError}</Alert>
        <div className="mt-5">
          <ButtonLink href="/dashboard" variant="secondary">Back to dashboard</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${report ? "max-w-5xl" : "max-w-3xl"}`}>
      <Link href="/dashboard" className="text-sm text-ink-mute transition-colors hover:text-ink">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Performance report
      </h1>
      <p className="mt-1 text-sm text-ink-soft">{heading}</p>

      {isLoading && <ReportSkeleton />}

      {!isLoading && interview && interview.status !== "completed" && (
        <div className="mt-6">
          <EmptyState
            title={
              interview.status === "abandoned"
                ? "This session was ended early"
                : interview.status === "in_progress"
                  ? "This interview is still running"
                  : "This interview hasn't started"
            }
            description={
              interview.status === "abandoned"
                ? "Only completed interviews are scored, so there's no report to show. A new interview takes about a minute to set up."
                : interview.status === "in_progress"
                  ? "Finish all of its questions and the report becomes available — the scores need the full transcript."
                  : "Head into the interview room, configure the session and answer the questions. The report unlocks when the interview completes."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ButtonLink href={`/interviews/${id} `}>
                    {interview.status === "in_progress" ? "Continue interview" : "Go to the room"}
                  </ButtonLink>
                <ButtonLink href="/interviews/new" variant="secondary">New interview</ButtonLink>
              </div>
            }
          />
        </div>
      )}

      {!isLoading && interview?.status === "completed" && !report && (
        <Card className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Ready to be scored</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            This interview is complete but hasn&apos;t been evaluated yet. Generating the report
            sends the full transcript to the AI evaluator and takes a moment — it never happens
            automatically, so you decide when that is.
          </p>
          {generateError && (
            <Alert tone="error" className="mt-4">
              {generateError}
            </Alert>
          )}
          <div className="mt-5">
            <Button onClick={handleGenerate} isLoading={isGenerating} size="lg">
              Generate report
            </Button>
          </div>
        </Card>
      )}

      {!isLoading && report && interview && (
        <ReportView
          interview={interview}
          report={report}
          turns={turns}
          onRegenerate={handleGenerate}
          isRegenerating={isGenerating}
          regenerateError={generateError}
        />
      )}
    </div>
  );
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <ResultsContent id={params.id} />
    </ProtectedRoute>
  );
}
