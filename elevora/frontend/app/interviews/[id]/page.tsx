"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/Alert";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/Skeleton";
import { InterviewTimer } from "@/components/InterviewTimer";
import { AnswerComposer } from "@/components/interview/AnswerComposer";
import { ConversationTimeline, ConversationTurnView } from "@/components/interview/ConversationTimeline";
import { RoomControls } from "@/components/interview/RoomControls";
import { SessionPanel } from "@/components/interview/SessionPanel";
import { ResumeJdUpload } from "@/components/ResumeJdUpload";
import type { CameraStatus } from "@/components/CameraPreview";
import type { RecordingState } from "@/components/VoiceControls";
import { ApiError, interviewsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INTERVIEW_CATEGORIES, type Interview, type InterviewTurn } from "@/lib/types";
import { WebcamAnalyticsTracker, type TrackerStatus } from "@/lib/webcamAnalytics";

function categoryLabel(value: string) {
  return INTERVIEW_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

const STATUS_TONE = {
  draft: "neutral",
  in_progress: "blue",
  completed: "success",
  abandoned: "warning",
} as const;

const STATUS_COPY: Record<Interview["status"], string> = {
  draft: "Ready to start",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Ended early",
};

function interviewTitle(interview: Interview) {
  const parts = [
    categoryLabel(interview.category),
    interview.role,
    interview.company,
    interview.exam,
  ].filter(Boolean);
  return parts.join(" · ");
}

function supportsMicrophone() {
  return (
    typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

// ---------------------------------------------------------------------------
// Draft: the session exists but hasn't started, so it is still configurable.
// ---------------------------------------------------------------------------

function DraftView({
  interview,
  onUpdated,
}: {
  interview: Interview;
  onUpdated: (interview: Interview) => void;
}) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setError(null);
    setIsStarting(true);
    try {
      await interviewsApi.start(interview.id);
      onUpdated(await interviewsApi.get(interview.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the interview. Try again.");
      setIsStarting(false);
    }
  }

  const facts: [string, string][] = [
    ["Difficulty", interview.difficulty],
    ["Length", `${interview.durationMinutes} minutes`],
    ["Language", interview.language],
    ...(interview.experienceLevel
      ? ([["Experience", interview.experienceLevel]] as [string, string][])
      : []),
    ...(interview.maxQuestions ? ([["Questions", `${interview.maxQuestions}`]] as [string, string][]) : []),
  ];

  return (
    <div className="mt-6 space-y-5">
      <Card>
        <h2 className="text-sm font-semibold text-ink">Session plan</h2>
        <p className="mt-1 text-xs text-ink-mute">
          The interviewer plans roughly one question every three minutes and ends by question count,
          not by a clock.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-[0.12em] text-ink-mute">{label}</dt>
              <dd className="mt-1 text-sm font-medium capitalize text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <ResumeJdUpload interview={interview} onUpdated={onUpdated} />

      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button size="lg" onClick={handleStart} isLoading={isStarting}>
          Start interview
        </Button>
        <p className="text-xs leading-5 text-ink-mute">
          The resume, job description and settings lock once you start. You can still end early at
          any point.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live room
// ---------------------------------------------------------------------------

function LiveInterviewView({
  interview,
  turns,
  onUpdate,
  onExited,
}: {
  interview: Interview;
  turns: InterviewTurn[];
  onUpdate: (interview: Interview, newTurn?: InterviewTurn) => void;
  onExited: () => void;
}) {
  const { user } = useAuth();
  const [answer, setAnswer] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  // Honours the saved "start with the camera on" preference, defaulting to on.
  const [cameraEnabled, setCameraEnabled] = useState(
    user?.preferences.cameraEnabledByDefault ?? true
  );
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [analyticsStatus, setAnalyticsStatus] = useState<TrackerStatus>("idle");
  const [analyticsSamples, setAnalyticsSamples] = useState(0);
  const [recordSignal, setRecordSignal] = useState(0);
  const [stopSignal, setStopSignal] = useState(0);
  const [micAvailable, setMicAvailable] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trackerRef = useRef<WebcamAnalyticsTracker | null>(null);
  if (trackerRef.current === null) trackerRef.current = new WebcamAnalyticsTracker();

  useEffect(() => {
    setMicAvailable(supportsMicrophone());
  }, []);

  const handleFrameSample = useCallback((video: HTMLVideoElement) => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    void tracker.sample(video).then(() => {
      setAnalyticsStatus((previous) =>
        previous === tracker.getStatus() ? previous : tracker.getStatus()
      );
      setAnalyticsSamples(tracker.getSampleCount());
    });
  }, []);

  async function submitWebcamMetricsIfAvailable() {
    const aggregate = trackerRef.current?.getAggregate();
    if (!aggregate) return; // camera off, model failed to load, or too few samples
    try {
      await interviewsApi.submitWebcamMetrics(interview.id, aggregate);
    } catch {
      // Best-effort by design: the report shows "Not available" for webcam
      // rather than a fabricated number.
    }
  }

  function applyResult(
    questionJustAnswered: NonNullable<Interview["pendingQuestion"]>,
    answerText: string,
    result: {
      status: Interview["status"];
      questionNumber: number;
      maxQuestions: number;
      difficultyLevel: number;
      pendingQuestion?: Interview["pendingQuestion"];
    },
    speechMetrics?: InterviewTurn["speechMetrics"]
  ) {
    const newTurn: InterviewTurn = {
      sequence: result.questionNumber,
      question: questionJustAnswered.question,
      answer: answerText,
      topic: questionJustAnswered.topic,
      difficulty: questionJustAnswered.difficulty,
      isFollowUp: questionJustAnswered.isFollowUp,
      createdAt: new Date().toISOString(),
      speechMetrics,
    };
    onUpdate(
      {
        ...interview,
        status: result.status,
        questionNumber: result.questionNumber,
        maxQuestions: result.maxQuestions,
        difficultyLevel: result.difficultyLevel,
        pendingQuestion: result.pendingQuestion,
      },
      newTurn
    );
    if (result.status === "completed") void submitWebcamMetricsIfAvailable();
  }

  async function handleTextSubmit() {
    const questionJustAnswered = interview.pendingQuestion;
    if (!questionJustAnswered || !answer.trim()) return;

    setError(null);
    setIsBusy(true);
    try {
      const result = await interviewsApi.answer(
        interview.id,
        answer.trim(),
        questionJustAnswered.question
      );
      applyResult(questionJustAnswered, answer.trim(), result);
      setAnswer("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong submitting your answer. Your text is still in the box — try again."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAudioRecorded(blob: Blob) {
    const questionJustAnswered = interview.pendingQuestion;
    if (!questionJustAnswered) return;
    setError(null);
    setIsBusy(true);
    try {
      const result = await interviewsApi.answerAudio(
        interview.id,
        blob,
        "answer.webm",
        questionJustAnswered.question
      );
      applyResult(questionJustAnswered, result.transcript, result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't submit your voice answer. Try the text box instead — your recording was not lost in the interview record."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExit() {
    setIsExiting(true);
    setError(null);
    try {
      // Webcam metrics must land before /exit — that endpoint only accepts them
      // while the interview is in progress.
      await submitWebcamMetricsIfAvailable();
      await interviewsApi.exit(interview.id);
      onExited();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't end the interview. Try again.");
      setIsExiting(false);
      setConfirmExit(false);
    }
  }

  const answeredSoFar = turns.length;
  const questionNumberShown = Math.min(
    answeredSoFar + (interview.pendingQuestion ? 1 : 0),
    interview.maxQuestions ?? Number.POSITIVE_INFINITY
  );
  const progressPercent = interview.maxQuestions
    ? Math.min(100, (answeredSoFar / interview.maxQuestions) * 100)
    : null;

  return (
    <div className="flex flex-col">
      {/* Status strip ---------------------------------------------------- */}
      <div className="glass mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl px-4 py-3">
        <span className="flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              recordingState === "recording" ? "animate-pulse-soft bg-danger" : "bg-blue/70"
            }`}
          />
          <span className="text-ink-soft" aria-live="polite">
            {recordingState === "idle"
              ? "Microphone ready"
              : recordingState === "recording"
                ? "Recording…"
                : "Transcribing…"}
          </span>
        </span>

        {interview.maxQuestions && (
          <span className="flex flex-1 items-center gap-3">
            <span className="whitespace-nowrap text-sm text-ink-soft">
              Question <span className="font-semibold text-ink">{Math.max(1, questionNumberShown)}</span> of{" "}
              {interview.maxQuestions}
            </span>
            <span
              className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08] sm:block"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={interview.maxQuestions}
              aria-valuenow={Math.min(answeredSoFar, interview.maxQuestions)}
              aria-label="Interview progress"
            >
              <span
                className="block h-full rounded-full bg-gradient-to-r from-blue to-plum transition-[width] duration-500 ease-spring"
                style={{ width: `${progressPercent}%` }}
              />
            </span>
          </span>
        )}

        <span className="flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              cameraStatus === "active" ? "bg-success" : "bg-ink-mute"
            }`}
          />
          <span className="text-ink-mute">
            {cameraEnabled && cameraStatus === "active" ? "Camera active" : "Camera off"}
          </span>
        </span>

        <Button variant="ghost" size="sm" onClick={() => setConfirmExit(true)} disabled={isBusy}>
          End interview
        </Button>
      </div>

      {/* Conversation + session panel ------------------------------------ */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0">
          <ConversationTimeline
            interview={interview}
            turns={turns}
            isSpeaking={isSpeaking}
            onSpeakingChange={setIsSpeaking}
            awaitingNextQuestion={isBusy && !interview.pendingQuestion}
            autoPlayQuestion={user?.preferences.autoPlayQuestion ?? false}
          />

          {interview.pendingQuestion ? (
            <AnswerComposer
              textareaRef={textareaRef}
              answer={answer}
              onAnswerChange={setAnswer}
              onSubmit={handleTextSubmit}
              onRecorded={handleAudioRecorded}
              onRecordingStateChange={setRecordingState}
              disabled={recordingState !== "idle"}
              isBusy={isBusy}
              error={error}
              startSignal={recordSignal}
              stopSignal={stopSignal}
              micAvailable={micAvailable}
            />
          ) : (
            <p className="mt-6 text-sm text-ink-soft" role="status">
              {isBusy ? "Generating the next question…" : "Finishing up…"}
            </p>
          )}
        </div>

        <div className="lg:sticky lg:top-24">
          <SessionPanel
            interview={interview}
            turns={turns}
            questionNumberShown={Math.max(1, questionNumberShown)}
            cameraEnabled={cameraEnabled}
            onToggleCamera={() => setCameraEnabled((previous) => !previous)}
            cameraStatus={cameraStatus}
            onFrameSample={handleFrameSample}
            analyticsStatus={analyticsStatus}
            analyticsSamples={analyticsSamples}
            recordingState={recordingState}
            isSpeaking={isSpeaking}
          />
        </div>
      </div>

      <RoomControls
        recordingState={recordingState}
        cameraEnabled={cameraEnabled}
        cameraStatus={cameraStatus}
        isBusy={isBusy}
        canSubmit={Boolean(answer.trim()) && Boolean(interview.pendingQuestion)}
        onRecord={() => {
          setRecordSignal((signal) => signal + 1);
        }}
        onStopRecording={() => setStopSignal((signal) => signal + 1)}
        onToggleCamera={() => setCameraEnabled((previous) => !previous)}
        onFocusText={() => textareaRef.current?.focus()}
        onSubmit={handleTextSubmit}
        confirmExit={confirmExit}
        onRequestExit={() => setConfirmExit(true)}
        onCancelExit={() => setConfirmExit(false)}
        onConfirmExit={handleExit}
        isExiting={isExiting}
        showNextLocked={Boolean(interview.pendingQuestion)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Terminal states
// ---------------------------------------------------------------------------

function CompletedView({ interview }: { interview: Interview }) {
  return (
    <Card className="mt-6" tone="brand">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="success">Interview completed</Badge>
        <span className="text-xs text-ink-mute">
          {interview.questionNumber} questions answered
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        The transcript above is what you actually said. Generate the scored, evidence-based report
        whenever you&apos;re ready — it analyses the answers in this session and nothing else.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href={`/results/${interview.id}`}>View performance report</ButtonLink>
        <ButtonLink href="/interviews/new" variant="secondary">Practise again</ButtonLink>
      </div>
    </Card>
  );
}

function AbandonedView() {
  return (
    <Card className="mt-6" tone="warning">
      <Badge tone="warning">Ended early</Badge>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        Whatever you answered before exiting is saved above. This session isn&apos;t scored — start a
        new interview when you&apos;re ready to try again.
      </p>
      <div className="mt-4">
        <ButtonLink href="/interviews/new" variant="secondary">Start a new interview</ButtonLink>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Data loading shell
// ---------------------------------------------------------------------------

function InterviewRoom({ id }: { id: string }) {
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      interviewsApi.get(id, controller.signal),
      interviewsApi.turns(id, controller.signal).catch(() => [] as InterviewTurn[]),
    ])
      .then(([interviewData, turnsData]) => {
        setInterview(interviewData);
        setTurns(turnsData);
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
    return () => controller.abort();
  }, [id]);

  const refetchTurns = useCallback(async () => {
    try {
      setTurns(await interviewsApi.turns(id));
    } catch {
      // Non-fatal: the room still renders from the state it already has.
    }
  }, [id]);

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await interviewsApi.remove(id);
      router.push("/dashboard");
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : "Couldn't delete this interview. Try again."
      );
      setIsDeleting(false);
    }
  }

  const heading = useMemo(() => (interview ? interviewTitle(interview) : ""), [interview]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Alert tone="error">{loadError}</Alert>
        <div className="mt-5 flex gap-2">
          <ButtonLink href="/dashboard" variant="secondary">Back to dashboard</ButtonLink>
          <Button variant="ghost" onClick={() => router.refresh()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !interview) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-8 w-72" />
        <Skeleton className="mt-6 h-16 rounded-2xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <p className="sr-only" role="status">
          Loading interview…
        </p>
      </div>
    );
  }

  const isLive = interview.status === "in_progress";

  return (
    <div className={`mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${isLive ? "max-w-6xl" : "max-w-4xl"}`}>
      <Link href="/dashboard" className="text-sm text-ink-mute transition-colors hover:text-ink">
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{heading}</h1>
          <p className="mt-1 text-xs text-ink-mute">
            Started{" "}
            {new Date(interview.startedAt ?? interview.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <Badge tone={STATUS_TONE[interview.status]}>{STATUS_COPY[interview.status]}</Badge>
      </div>

      {interview.status === "draft" && <DraftView interview={interview} onUpdated={setInterview} />}

      {isLive && (
        <LiveInterviewView
          interview={interview}
          turns={turns}
          onUpdate={(updated, newTurn) => {
            setInterview(updated);
            if (newTurn) setTurns((previous) => [...previous, newTurn]);
            if (updated.status === "completed") void refetchTurns();
          }}
          onExited={() => setInterview({ ...interview, status: "abandoned", pendingQuestion: undefined })}
        />
      )}

      {(interview.status === "completed" || interview.status === "abandoned") && (
        <>
          <div className="mt-6 space-y-6">
            {turns.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-ink-soft">
                No answers were recorded in this session.
              </p>
            ) : (
              turns.map((turn) => <ConversationTurnView key={turn.sequence} turn={turn} />)
            )}
          </div>
          {interview.status === "completed" ? (
            <CompletedView interview={interview} />
          ) : (
            <AbandonedView />
          )}
        </>
      )}

      <div className="mt-10 border-t border-line pt-6">
        {isLive ? (
          <p className="text-xs leading-5 text-ink-mute">
            Deleting is disabled while an interview is in progress — end it first so your transcript
            is written completely.
          </p>
        ) : (
          <>
            <Button variant="danger" size="sm" onClick={handleDelete} isLoading={isDeleting}>
              Delete this interview
            </Button>
            <p className="mt-2 text-xs leading-5 text-ink-mute">
              Deletes the interview, its transcript and any generated report. This can&apos;t be
              undone.
            </p>
            {deleteError && (
              <Alert tone="error" className="mt-3">
                {deleteError}
              </Alert>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function InterviewDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <InterviewRoom id={params.id} />
    </ProtectedRoute>
  );
}
