"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DimensionBar } from "@/components/DimensionBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ApiError, interviewsApi } from "@/lib/api";
import {
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  INTERVIEW_CATEGORIES,
  type Confidence,
  type Interview,
  type InterviewReport,
} from "@/lib/types";

function categoryLabel(value: string) {
  return INTERVIEW_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const CONFIDENCE_COPY: Record<Confidence, string> = {
  low: "Low confidence — a short or narrow session, so treat these scores as a rough signal rather than a verdict.",
  medium: "Medium confidence — a reasonable sample of questions to draw conclusions from.",
  high: "High confidence — enough breadth and length here to trust the scores.",
};

function scoreTone(score: number) {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-accent-300";
  return "text-danger";
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 52;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <div
      className="relative grid h-32 w-32 shrink-0 place-items-center"
      role="img"
      aria-label={`Overall score ${score} out of 100`}
    >
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="#EA580C"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-semibold ${scoreTone(score)}`}>{score}</span>
        <span className="text-xs text-ink-400">/ 100</span>
      </div>
    </div>
  );
}

function ScoreExplanation({ report }: { report: InterviewReport }) {
  const entries = DIMENSION_ORDER.filter(
    (key) => typeof report.weights?.[key] === "number" && report.weights[key] > 0
  );
  if (entries.length === 0) return null;

  return (
    <Card>
      <p className="text-sm font-medium text-ink-900">How this score was computed</p>
      <p className="mt-2 text-sm leading-6 text-ink-600">
        Each dimension is scored 0–5, converted to a 0–100 percentage, then combined by weight.
        Dimensions with no measurement (for example, webcam when the camera was off) are excluded
        entirely and the remaining weights are renormalized — a missing measurement is never
        counted as a zero.
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {entries.map((key) => (
          <li key={key} className="flex items-center justify-between gap-4">
            <span className="text-ink-600">
              {DIMENSION_LABELS[key]}{" "}
              <span className="text-ink-400">({report.dimensions[key].score}/5)</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-accent-300">
              {Math.round(report.weights[key] * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ReportView({
  interview,
  report,
  onRegenerate,
  isRegenerating,
  regenerateError,
}: {
  interview: Interview;
  report: InterviewReport;
  onRegenerate: () => void;
  isRegenerating: boolean;
  regenerateError: string | null;
}) {
  const availableDimensions = DIMENSION_ORDER.filter(
    (key) => report.dimensions[key].score !== null
  );
  const missingDimensions = DIMENSION_ORDER.filter((key) => report.dimensions[key].score === null);

  return (
    <div className="mt-6 space-y-6">
      <Card className="flex flex-wrap items-center gap-6">
        <ScoreRing score={report.overallScore} />
        <div className="min-w-[240px] flex-1">
          <p className="text-sm font-medium text-ink-900">
            {categoryLabel(interview.category)}
            {interview.role ? ` — ${interview.role}` : ""}
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-600">{CONFIDENCE_COPY[report.confidence]}</p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-400">
            <div className="flex gap-1">
              <dt>Difficulty</dt>
              <dd className="capitalize text-ink-600">{interview.difficulty}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Generated</dt>
              <dd className="text-ink-600">{new Date(report.generatedAt).toLocaleString()}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Dimensions scored</dt>
              <dd className="text-ink-600">
                {availableDimensions.length} of {DIMENSION_ORDER.length}
              </dd>
            </div>
          </dl>
        </div>
        <Button variant="secondary" onClick={onRegenerate} isLoading={isRegenerating}>
          Regenerate report
        </Button>
      </Card>

      {regenerateError && <Alert tone="error">{regenerateError}</Alert>}

      <Card>
        <p className="text-sm font-medium text-ink-900">Dimension breakdown</p>
        <div className="mt-4 space-y-5">
          {DIMENSION_ORDER.map((key) => (
            <DimensionBar
              key={key}
              label={DIMENSION_LABELS[key]}
              dimension={report.dimensions[key]}
            />
          ))}
        </div>
        {missingDimensions.length > 0 && (
          <p className="mt-5 text-xs leading-5 text-ink-400">
            {missingDimensions.map((key) => DIMENSION_LABELS[key]).join(", ")}{" "}
            {missingDimensions.length === 1 ? "is" : "are"} not available for this session. Delivery
            needs at least one answer recorded by voice; webcam needs the camera on for part of the
            interview. Nothing here was estimated to fill the gap.
          </p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-medium text-ink-900">Strengths</h2>
          {report.strengths.length === 0 ? (
            <p className="mt-2 text-sm text-ink-600">Nothing specific stood out this time.</p>
          ) : (
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-6 text-ink-600">
              {report.strengths.map((strength) => (
                <li key={strength}>{strength}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-ink-900">Weaknesses</h2>
          {report.weaknesses.length === 0 ? (
            <p className="mt-2 text-sm text-ink-600">Nothing specific stood out this time.</p>
          ) : (
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-6 text-ink-600">
              {report.weaknesses.map((weakness) => (
                <li key={weakness}>{weakness}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ScoreExplanation report={report} />

      {report.recommendedPractice.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-ink-900">What to practice next</h2>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-6 text-ink-600">
            {report.recommendedPractice.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link
            href="/interviews/new"
            className="mt-3 inline-block text-sm text-accent-300 hover:text-accent"
          >
            Start a targeted practice interview →
          </Link>
        </Card>
      )}

      {report.improvedAnswer && (
        <Card className="bg-white/[.03]">
          <h2 className="text-sm font-medium text-ink-900">
            A stronger version of one of your answers
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-600">
            {report.improvedAnswer}
          </p>
          <p className="mt-3 text-xs text-ink-400">
            Written by the AI from your own transcript — it&apos;s a model of how to structure an
            answer, not a script to memorize.
          </p>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href={`/interviews/${interview.id}`}>
          <Button variant="secondary">Review the transcript</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

function ResultsContent({ id }: { id: string }) {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
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
          // 404 means "no report yet", which is an empty state, not an error.
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? "Interview not found."
            : "Couldn't load this interview."
        );
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [id]);

  async function handleGenerate() {
    setGenerateError(null);
    setIsGenerating(true);
    try {
      setReport(await interviewsApi.generateReport(id));
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : "Couldn't generate the report. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
        <Alert tone="error">{loadError}</Alert>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-accent-300 hover:text-accent">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (isLoading || !interview) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 text-sm text-ink-600 lg:px-8" role="status">
        Loading report…
      </div>
    );
  }

  return (
    <div className={`mx-auto px-5 py-10 lg:px-8 ${report ? "max-w-4xl" : "max-w-2xl"}`}>
      <Link href="/dashboard" className="text-sm text-accent-300 hover:text-accent">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink-900">Performance report</h1>

      {interview.status !== "completed" && (
        <Card className="mt-6 bg-white/[.03]">
          <p className="text-sm leading-6 text-ink-600">
            {interview.status === "abandoned"
              ? "This interview was ended early and won't be scored — only completed interviews get a report."
              : interview.status === "in_progress"
                ? "This interview is still in progress. Finish it to get a report."
                : "This interview hasn't started yet."}
          </p>
          <Link
            href={`/interviews/${id}`}
            className="mt-3 inline-block text-sm text-accent-300 hover:text-accent"
          >
            Go to the interview →
          </Link>
        </Card>
      )}

      {interview.status === "completed" && !report && (
        <Card className="mt-6">
          <p className="text-sm leading-6 text-ink-600">
            This interview is complete but hasn&apos;t been scored yet. Generating a report sends
            the full transcript to the AI evaluator — it never happens automatically, so you decide
            when that happens.
          </p>
          {generateError && (
            <Alert tone="error" className="mt-3">
              {generateError}
            </Alert>
          )}
          <div className="mt-4">
            <Button onClick={handleGenerate} isLoading={isGenerating}>
              Generate report
            </Button>
          </div>
        </Card>
      )}

      {report && (
        <ReportView
          interview={interview}
          report={report}
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
