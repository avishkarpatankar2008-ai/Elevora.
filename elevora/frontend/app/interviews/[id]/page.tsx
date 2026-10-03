"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { CameraPreview, type CameraStatus } from "@/components/CameraPreview";
import { Card } from "@/components/Card";
import { InterviewTimer } from "@/components/InterviewTimer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ResumeJdUpload } from "@/components/ResumeJdUpload";
import { Textarea } from "@/components/Textarea";
import { VoiceControls, type RecordingState } from "@/components/VoiceControls";
import { ApiError, interviewsApi } from "@/lib/api";
import { INTERVIEW_CATEGORIES, type Interview, type InterviewTurn } from "@/lib/types";
import { WebcamAnalyticsTracker, type TrackerStatus } from "@/lib/webcamAnalytics";

function categoryLabel(value: string) {
  return INTERVIEW_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const STATUS_COPY: Record<Interview["status"], string> = {
  draft: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Ended early",
};

/** Delivery numbers that were actually measured from this answer's audio. */
function SpeechMetricsRow({ turn }: { turn: Pick<InterviewTurn, "speechMetrics"> }) {
  const metrics = turn.speechMetrics;
  if (!metrics) return null;
  return (
    <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-400">
      <div className="flex gap-1">
        <dt>Pace</dt>
        <dd className="text-ink-600">{Math.round(metrics.wordsPerMinute)} WPM</dd>
      </div>
      <div className="flex gap-1">
        <dt>Fillers</dt>
        <dd className="text-ink-600">{metrics.fillerCount}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Longest pause</dt>
        <dd className="text-ink-600">{metrics.longestPauseSeconds.toFixed(1)}s</dd>
      </div>
    </dl>
  );
}

/** A completed Q&A exchange, rendered the same way whether it came from
 * history (GET /turns) or was just answered in this session. */
function TurnBubbles({ turn }: { turn: InterviewTurn }) {
  return (
    <article className="space-y-3">
      <div className={`rounded-xl p-4 ${turn.isFollowUp ? "bg-accent-100" : "bg-surface-muted"}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-300">
          {turn.isFollowUp ? "Interviewer follows up" : `Interviewer · ${turn.topic}`}
        </p>
        <p className="mt-1.5 text-sm leading-6 text-ink-900">{turn.question}</p>
      </div>
      <div className="rounded-xl border border-white/[0.08] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">You</p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink-600">{turn.answer}</p>
        <SpeechMetricsRow turn={turn} />
      </div>
    </article>
  );
}

/**
 * Fetches and plays the current question as spoken audio.
 *
 * Playback is user-initiated (never autoplayed) so it isn't blocked by browser
 * autoplay policies. The object URL is revoked on unmount so repeated plays
 * don't leak memory.
 */
function PlayQuestionButton({
  interviewId,
  onSpeakingChange,
}: {
  interviewId: string;
  onSpeakingChange?: (speaking: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      cleanup();
      onSpeakingChange?.(false);
    };
  }, [cleanup, onSpeakingChange]);

  async function handlePlay() {
    setError(null);
    setIsLoading(true);
    try {
      const blob = await interviewsApi.questionAudio(interviewId);
      cleanup();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onplay = () => {
          setIsPlaying(true);
          onSpeakingChange?.(true);
        };
        const stop = () => {
          setIsPlaying(false);
          onSpeakingChange?.(false);
        };
        audioRef.current.onended = stop;
        audioRef.current.onpause = stop;
        audioRef.current.onerror = () => {
          stop();
          setError("The audio couldn't be played. Read the question above instead.");
        };
      }
      audioRef.current.src = url;
      await audioRef.current.play();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't load the question audio. Read it above instead."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="ghost"
        onClick={handlePlay}
        isLoading={isLoading}
        className="px-2 py-1.5 text-sm"
      >
        {isPlaying ? "🔊 Playing…" : "🔊 Play question aloud"}
      </Button>
      {error && <span className="text-sm text-ink-400">{error}</span>}
    </div>
  );
}

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

  return (
    <>
      <Card className="mt-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-ink-400">Difficulty</dt>
            <dd className="mt-1 capitalize text-ink-900">{interview.difficulty}</dd>
          </div>
          <div>
            <dt className="text-ink-400">Duration</dt>
            <dd className="mt-1 text-ink-900">{interview.durationMinutes} minutes</dd>
          </div>
          {interview.experienceLevel && (
            <div>
              <dt className="text-ink-400">Experience level</dt>
              <dd className="mt-1 capitalize text-ink-900">{interview.experienceLevel}</dd>
            </div>
          )}
          <div>
            <dt className="text-ink-400">Language</dt>
            <dd className="mt-1 text-ink-900">{interview.language}</dd>
          </div>
        </dl>
      </Card>

      <ResumeJdUpload interview={interview} onUpdated={onUpdated} />

      {error && <Alert tone="error" className="mt-4">{error}</Alert>}

      <div className="mt-6">
        <Button onClick={handleStart} isLoading={isStarting}>
          Start interview
        </Button>
        <p className="mt-2 text-xs text-ink-400">
          You can&apos;t change the resume, job description, or settings after this point.
        </p>
      </div>
    </>
  );
}

const RECORDING_LABEL: Record<RecordingState, string> = {
  idle: "Mic idle",
  recording: "Recording",
  processing: "Transcribing…",
};

const CAMERA_LABEL: Record<CameraStatus, string> = {
  idle: "Camera off",
  requesting: "Requesting camera…",
  active: "Camera on",
  denied: "Camera blocked",
  unavailable: "Camera unavailable",
  disconnected: "Camera disconnected",
};

function RoomStatusBar({
  interview,
  recordingState,
  cameraStatus,
  isSpeaking,
  cameraEnabled,
  onToggleCamera,
  onExit,
  isExiting,
}: {
  interview: Interview;
  recordingState: RecordingState;
  cameraStatus: CameraStatus;
  isSpeaking: boolean;
  cameraEnabled: boolean;
  onToggleCamera: () => void;
  onExit: () => void;
  isExiting: boolean;
}) {
  const [confirmingExit, setConfirmingExit] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {interview.startedAt && (
            <InterviewTimer startedAt={interview.startedAt} targetMinutes={interview.durationMinutes} />
          )}
          <span className="text-ink-600" aria-live="polite">
            {RECORDING_LABEL[recordingState]}
          </span>
          <button
            type="button"
            onClick={onToggleCamera}
            className="text-ink-600 underline-offset-2 hover:text-ink-900 hover:underline"
          >
            {CAMERA_LABEL[cameraStatus]} {cameraEnabled ? "(turn off)" : "(turn on)"}
          </button>
          {isSpeaking && <span className="text-accent-300">🔊 Question playing…</span>}
        </div>

        {confirmingExit ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-600">
              End now? What you&apos;ve answered is saved but won&apos;t be scored.
            </span>
            <Button variant="danger" onClick={onExit} isLoading={isExiting}>
              Confirm exit
            </Button>
            <Button variant="ghost" onClick={() => setConfirmingExit(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setConfirmingExit(true)}>
            End interview
          </Button>
        )}
      </div>
    </div>
  );
}

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
  const [answer, setAnswer] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [analyticsStatus, setAnalyticsStatus] = useState<TrackerStatus>("idle");
  const [analyticsSamples, setAnalyticsSamples] = useState(0);

  const trackerRef = useRef<WebcamAnalyticsTracker | null>(null);
  if (trackerRef.current === null) trackerRef.current = new WebcamAnalyticsTracker();

  const handleFrameSample = useCallback((video: HTMLVideoElement) => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    void tracker.sample(video).then(() => {
      setAnalyticsStatus((previous) => (previous === tracker.getStatus() ? previous : tracker.getStatus()));
      setAnalyticsSamples(tracker.getSampleCount());
    });
  }, []);

  async function submitWebcamMetricsIfAvailable() {
    const aggregate = trackerRef.current?.getAggregate();
    if (!aggregate) return; // camera off, model failed to load, or too few samples
    try {
      await interviewsApi.submitWebcamMetrics(interview.id, aggregate);
    } catch {
      // Best-effort: the report shows "Not available" for webcam rather than
      // a fabricated number.
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
    if (result.status === "completed") {
      void submitWebcamMetricsIfAvailable();
    }
  }

  async function handleTextSubmit(e: FormEvent) {
    e.preventDefault();
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
          : "Something went wrong submitting your answer. Your text is still below — try again."
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
      setError(err instanceof ApiError ? err.message : "Couldn't submit your voice answer. Try the text box instead.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExit() {
    setIsExiting(true);
    setError(null);
    try {
      // Webcam metrics must land before /exit — the endpoint only accepts
      // them while the interview is in progress.
      await submitWebcamMetricsIfAvailable();
      await interviewsApi.exit(interview.id);
      onExited();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't end the interview. Try again.");
      setIsExiting(false);
    }
  }

  const answeredSoFar = turns.length;
  const questionNumberShown = Math.min(answeredSoFar + (interview.pendingQuestion ? 1 : 0), interview.maxQuestions ?? Infinity);

  return (
    <div className="flex flex-col gap-4">
      <RoomStatusBar
        interview={interview}
        recordingState={recordingState}
        cameraStatus={cameraStatus}
        isSpeaking={isSpeaking}
        cameraEnabled={cameraEnabled}
        onToggleCamera={() => setCameraEnabled((previous) => !previous)}
        onExit={handleExit}
        isExiting={isExiting}
      />

      {interview.maxQuestions && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-400">
            Question {questionNumberShown} of {interview.maxQuestions}
          </p>
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={interview.maxQuestions}
            aria-valuenow={Math.min(answeredSoFar, interview.maxQuestions)}
            aria-label="Interview progress"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-300 transition-[width] duration-500"
              style={{ width: `${(answeredSoFar / interview.maxQuestions) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          {turns.map((turn) => (
            <TurnBubbles key={turn.sequence} turn={turn} />
          ))}

          {interview.pendingQuestion && (
            <div>
              <div
                className={`rounded-xl p-4 ${
                  interview.pendingQuestion.isFollowUp ? "bg-accent-100" : "bg-surface-muted"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-300">
                  {interview.pendingQuestion.isFollowUp
                    ? "Interviewer follows up"
                    : `Interviewer · ${interview.pendingQuestion.topic}`}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-ink-900">
                  {interview.pendingQuestion.question}
                </p>
              </div>
              <PlayQuestionButton interviewId={interview.id} onSpeakingChange={setIsSpeaking} />
            </div>
          )}

          {interview.pendingQuestion ? (
            <div className="flex flex-col gap-4">
              <VoiceControls
                onRecorded={handleAudioRecorded}
                onStateChange={setRecordingState}
                disabled={isBusy}
              />

              <form onSubmit={handleTextSubmit} className="flex flex-col gap-3">
                <Textarea
                  name="answer"
                  label="Your answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={5}
                  placeholder="Type your answer here, or record it above…"
                  disabled={isBusy}
                  hint={`${answer.trim() ? answer.trim().split(/\s+/).length : 0} words`}
                />
                {error && <Alert tone="error">{error}</Alert>}
                <div>
                  <Button type="submit" isLoading={isBusy} disabled={!answer.trim()}>
                    Submit answer
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <p className="text-sm text-ink-400" role="status">
              Finishing up…
            </p>
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <CameraPreview
            enabled={cameraEnabled}
            onStatusChange={setCameraStatus}
            onFrameSample={handleFrameSample}
            footnote="Self-view only. Frames stay in your browser; only aggregate rates are saved with this interview."
          />
          <p className="mt-2 text-xs leading-5 text-ink-400">
            {cameraEnabled && cameraStatus === "active" && analyticsStatus === "ready" && (
              <>On-device analysis running · {analyticsSamples} samples</>
            )}
            {cameraEnabled && cameraStatus === "active" && analyticsStatus === "initializing" && (
              <>Starting on-device analysis…</>
            )}
            {cameraEnabled && cameraStatus === "active" && analyticsStatus === "failed" && (
              <>
                On-device analysis couldn&apos;t start in this browser, so the webcam part of your
                report will say &ldquo;Not available&rdquo;. The interview itself is unaffected.
              </>
            )}
            {(!cameraEnabled || cameraStatus !== "active") && (
              <>
                Webcam scoring needs the camera on for part of the session. With it off, the report
                shows &ldquo;Not available&rdquo; for webcam rather than a guess.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function CompletedView({ interviewId }: { interviewId: string }) {
  return (
    <Card className="mt-6 bg-surface-muted">
      <p className="text-sm font-medium text-ink-900">Interview completed</p>
      <p className="mt-2 text-sm text-ink-600">
        The transcript above is what you actually said. Generate a scored, evidence-based report
        whenever you&apos;re ready to see how it went.
      </p>
      <Link href={`/results/${interviewId}`} className="mt-3 inline-block text-sm text-accent-300 hover:text-accent">
        View performance report →
      </Link>
    </Card>
  );
}

function AbandonedView() {
  return (
    <Card className="mt-6 bg-surface-muted">
      <p className="text-sm font-medium text-ink-900">You ended this interview early</p>
      <p className="mt-2 text-sm text-ink-600">
        Whatever you answered before exiting is saved above. This session won&apos;t be scored —
        start a new interview when you&apos;re ready to try again.
      </p>
    </Card>
  );
}

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
            ? "Interview not found."
            : "Couldn't load this interview."
        );
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [id]);

  async function refetchTurns() {
    try {
      setTurns(await interviewsApi.turns(id));
    } catch {
      // Non-fatal: the room still renders from local state.
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await interviewsApi.remove(id);
      router.push("/dashboard");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete this interview.");
      setIsDeleting(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-6">
        <Alert tone="error">{loadError}</Alert>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-accent-300 hover:text-accent">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (isLoading || !interview) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 text-sm text-ink-600 sm:px-6" role="status">
        Loading interview…
      </div>
    );
  }

  const isLive = interview.status === "in_progress";

  return (
    <div className={`mx-auto px-5 py-8 sm:px-6 lg:py-10 ${isLive ? "max-w-5xl" : "max-w-3xl"}`}>
      <Link href="/dashboard" className="text-sm text-accent-300 hover:text-accent">
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
          {categoryLabel(interview.category)}
          {interview.role ? ` — ${interview.role}` : ""}
        </h1>
        <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-xs text-ink-600">
          {STATUS_COPY[interview.status]}
        </span>
      </div>

      {interview.status === "draft" && (
        <DraftView
          interview={interview}
          onUpdated={setInterview}
        />
      )}

      {isLive && (
        <div className="mt-6">
          <LiveInterviewView
            interview={interview}
            turns={turns}
            onUpdate={(updated, newTurn) => {
              setInterview(updated);
              if (newTurn) setTurns((previous) => [...previous, newTurn]);
              if (updated.status === "completed") void refetchTurns();
            }}
            onExited={() =>
              setInterview({ ...interview, status: "abandoned", pendingQuestion: undefined })
            }
          />
        </div>
      )}

      {(interview.status === "completed" || interview.status === "abandoned") && (
        <>
          <div className="mt-6 space-y-6">
            {turns.map((turn) => (
              <TurnBubbles key={turn.sequence} turn={turn} />
            ))}
          </div>
          {interview.status === "completed" ? (
            <CompletedView interviewId={interview.id} />
          ) : (
            <AbandonedView />
          )}
        </>
      )}

      <div className="mt-10 border-t border-white/[0.08] pt-6">
        {isLive ? (
          <p className="text-xs text-ink-400">
            Delete is disabled while an interview is in progress — end it first.
          </p>
        ) : (
          <>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              Delete this interview
            </Button>
            <p className="mt-2 text-xs text-ink-400">
              Deletes the interview, its transcript, and any generated report. This can&apos;t be
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
