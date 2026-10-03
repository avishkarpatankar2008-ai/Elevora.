"use client";

import { CameraPreview, type CameraStatus } from "@/components/CameraPreview";
import { InterviewTimer } from "@/components/InterviewTimer";
import type { TrackerStatus } from "@/lib/webcamAnalytics";
import type { Interview, InterviewTurn } from "@/lib/types";

type RecordingState = "idle" | "recording" | "processing";

const RECORDING_LABEL: Record<RecordingState, string> = {
  idle: "Microphone idle",
  recording: "Recording answer",
  processing: "Transcribing answer",
};

function CameraNote({
  cameraEnabled,
  cameraStatus,
  analyticsStatus,
  analyticsSamples,
}: {
  cameraEnabled: boolean;
  cameraStatus: CameraStatus;
  analyticsStatus: TrackerStatus;
  analyticsSamples: number;
}) {
  if (!cameraEnabled) {
    return (
      <>
        The camera is off. Webcam scoring needs it running for part of the session — with it off,
        your report says &ldquo;Not available&rdquo; for that dimension rather than guessing.
      </>
    );
  }
  if (cameraStatus === "denied") {
    return (
      <>
        Your browser is blocking the camera. Allow it in the site settings and turn the camera back
        on, or continue — the interview and every other score are unaffected.
      </>
    );
  }
  if (cameraStatus === "unavailable") {
    return (
      <>
        This browser doesn&apos;t provide a usable camera here. The interview continues normally;
        the webcam dimension will read &ldquo;Not available&rdquo;.
      </>
    );
  }
  if (cameraStatus === "active") {
    if (analyticsStatus === "ready") {
      return <>On-device analysis running · {analyticsSamples} frames sampled locally.</>;
    }
    if (analyticsStatus === "failed") {
      return (
        <>
          On-device analysis couldn&apos;t start in this browser, so the webcam dimension will read
          &ldquo;Not available&rdquo;. The interview itself is unaffected.
        </>
      );
    }
    return <>Starting on-device analysis…</>;
  }
  return <>Frames stay in this tab. Only aggregate rates are saved with the interview.</>;
}

/**
 * Right-hand session panel: self-view, live status, and the facts of this
 * session. Deliberately quiet — the question is the loudest thing on screen.
 */
export function SessionPanel({
  interview,
  turns,
  questionNumberShown,
  cameraEnabled,
  onToggleCamera,
  cameraStatus,
  onFrameSample,
  analyticsStatus,
  analyticsSamples,
  recordingState,
  isSpeaking,
}: {
  interview: Interview;
  turns: InterviewTurn[];
  questionNumberShown: number;
  cameraEnabled: boolean;
  onToggleCamera: () => void;
  cameraStatus: CameraStatus;
  onFrameSample: (video: HTMLVideoElement) => void;
  analyticsStatus: TrackerStatus;
  analyticsSamples: number;
  recordingState: RecordingState;
  isSpeaking: boolean;
}) {
  const voiceAnswers = turns.filter((turn) => turn.speechMetrics).length;
  const textAnswers = turns.length - voiceAnswers;

  return (
    <div className="flex flex-col gap-4">
      <section className="glass overflow-hidden rounded-2xl">
        {cameraEnabled ? (
          <>
            <CameraPreview
              enabled={cameraEnabled}
              onFrameSample={onFrameSample}
              className="rounded-none border-0"
            />
            <div className="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5">
              <span className="text-[11px] text-ink-mute">Self-view only</span>
              <button
                type="button"
                onClick={onToggleCamera}
                aria-pressed={true}
                className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                Turn off
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-4 px-4 py-4">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ink-mute/60" />
              <span className="text-xs font-medium text-ink-soft">Camera off</span>
            </div>
            <button
              type="button"
              onClick={onToggleCamera}
              aria-pressed={false}
              className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              Turn on
            </button>
          </div>
        )}

        <p className="border-t border-line px-4 py-3 text-[11px] leading-5 text-ink-mute">
          <CameraNote
            cameraEnabled={cameraEnabled}
            cameraStatus={cameraStatus}
            analyticsStatus={analyticsStatus}
            analyticsSamples={analyticsSamples}
          />
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-surface/70 p-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-mute">
          This session
        </h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-mute">Elapsed</dt>
            <dd>
              {interview.startedAt ? (
                <InterviewTimer
                  startedAt={interview.startedAt}
                  targetMinutes={interview.durationMinutes}
                />
              ) : (
                <span className="text-ink-soft">Not started</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-mute">Progress</dt>
            <dd className="font-medium text-ink-soft">
              {interview.maxQuestions
                ? `${questionNumberShown} / ${interview.maxQuestions}`
                : `${turns.length} answered`}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-mute">Answers</dt>
            <dd className="font-medium text-ink-soft">
              {turns.length} ({voiceAnswers} voice · {textAnswers} text)
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-mute">Difficulty</dt>
            <dd className="font-medium capitalize text-ink-soft">{interview.difficulty}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-mute">Language</dt>
            <dd className="font-medium text-ink-soft">{interview.language}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-mute">Microphone</dt>
            <dd
              className={`font-medium ${
                recordingState === "recording" ? "text-danger" : "text-ink-soft"
              }`}
              aria-live="polite"
            >
              {RECORDING_LABEL[recordingState]}
            </dd>
          </div>
          {isSpeaking && (
            <div className="flex items-center gap-2 text-xs text-plum" role="status">
              <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-plum" />
              Interviewer is speaking
            </div>
          )}
        </dl>
      </section>

      <p className="px-1 text-[11px] leading-5 text-ink-mute">
        Frames never leave your browser; only the aggregate rates above are stored with this
        interview. Nothing here is simulated.
      </p>
    </div>
  );
}
