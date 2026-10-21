"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";

export type RecordingState = "idle" | "recording" | "processing";

interface VoiceControlsProps {
  onRecorded: (blob: Blob) => Promise<void>;
  onStateChange?: (state: RecordingState) => void;
  disabled?: boolean;
  /** Hard stop for a single answer, so one recording can't grow without bound. */
  maxSeconds?: number;
  /** Increment to start a recording from outside (the interview-room dock). */
  startSignal?: number;
  /** Increment to stop the current recording from outside. */
  stopSignal?: number;
  /** Compact = dock/room layout without the helper copy. */
  compact?: boolean;
}

/**
 * Microphone control for the interview room.
 *
 * Browser notes:
 *   - MediaRecorder mime support varies (Chrome/Firefox prefer
 *     audio/webm;codecs=opus, Safari records audio/mp4); we ask the browser what
 *     it supports and fall back to its own default rather than forcing one.
 *   - getUserMedia requires a secure context (HTTPS or localhost).
 *   - Tracks are always stopped on stop/unmount so the browser's recording
 *     indicator can't stay on after the candidate leaves the page.
 */
const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Calm activity indicator: five bars breathing out of phase, not a neon blob. */
function Waveform({ active }: { active: boolean }) {
  return (
    <span aria-hidden="true" className="flex h-5 items-end gap-[3px]">
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          key={index}
          className={`w-[3px] rounded-full bg-gradient-to-t from-blue to-plum ${
            active ? "animate-bar-breathe" : "opacity-40"
          }`}
          style={{
            height: `${[40, 70, 100, 60, 35][index]}%`,
            animationDelay: `${index * 120}ms`,
          }}
        />
      ))}
    </span>
  );
}

export function VoiceControls({
  onRecorded,
  onStateChange,
  disabled = false,
  maxSeconds = 300,
  startSignal = 0,
  stopSignal = 0,
  compact = false,
}: VoiceControlsProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const stateRef = useRef<RecordingState>("idle");
  const startSignalRef = useRef(startSignal);
  const stopSignalRef = useRef(stopSignal);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function updateState(next: RecordingState) {
    stateRef.current = next;
    setState(next);
    onStateChange?.(next);
  }

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      releaseStream();
    };
  }, []);

  // The interview-room dock can trigger recording without owning the recorder.
  // The callback is held in a ref so the effect never depends on a changing
  // closure and no lint suppression is needed.
  const startRecordingRef = useRef<() => void>(() => {});
  useEffect(() => {
    startRecordingRef.current = () => {
      void startRecording();
    };
  });

  useEffect(() => {
    if (startSignal === startSignalRef.current) return;
    startSignalRef.current = startSignal;
    if (stateRef.current === "idle" && !disabled) startRecordingRef.current();
  }, [startSignal, disabled]);

  const stopRecordingRef = useRef<() => void>(() => {});
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  });

  useEffect(() => {
    if (stopSignal === stopSignalRef.current) return;
    stopSignalRef.current = stopSignal;
    if (stateRef.current === "recording") stopRecordingRef.current();
  }, [stopSignal]);

  async function startRecording() {
    setError(null);
    setElapsed(0);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser doesn't support microphone recording. Use the text box instead.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser's site settings, or use the text box instead."
          : name === "NotFoundError"
            ? "No microphone was found. Connect one and try again, or use the text box instead."
            : "Couldn't open your microphone. Check your system audio settings, or use the text box instead."
      );
      return;
    }

    const mimeType = pickSupportedMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setError("This browser can't record audio in a supported format. Use the text box instead.");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onerror = () => {
      setError("Recording stopped unexpectedly. Try again, or use the text box.");
    };

    recorder.onstop = async () => {
      stopTimer();
      releaseStream();
      const blob = new Blob(chunksRef.current, { type: mimeType ?? "audio/webm" });
      if (blob.size === 0) {
        updateState("idle");
        setError("That recording came out empty. Try again, or use the text box.");
        return;
      }
      updateState("processing");
      try {
        await onRecorded(blob);
      } catch {
        setError("Couldn't process that recording. Try again, or use the text box.");
      } finally {
        updateState("idle");
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    updateState("recording");
    timerRef.current = setInterval(() => {
      setElapsed((previous) => {
        const next = previous + 1;
        if (next >= maxSeconds) {
          mediaRecorderRef.current?.stop();
        }
        return next;
      });
    }, 1000);
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function cancelRecording() {
    stopTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    releaseStream();
    chunksRef.current = [];
    updateState("idle");
    setElapsed(0);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {state === "idle" && (
          <>
            <Button type="button" variant="secondary" onClick={startRecording} disabled={disabled}>
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
              Record answer
            </Button>
            <Waveform active={false} />
            {!compact && (
              <span className="text-xs text-ink-mute">Speak, then stop the recording.</span>
            )}
          </>
        )}

        {state === "recording" && (
          <>
            <Button type="button" variant="danger" onClick={stopRecording}>
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-danger" />
              Stop recording
            </Button>
            <Waveform active />
            <span className="font-mono text-sm tabular-nums text-ink-soft" role="status">
              {formatSeconds(elapsed)} / {formatSeconds(maxSeconds)}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={cancelRecording}>
              Cancel
            </Button>
          </>
        )}

        {state === "processing" && (
          <span className="flex items-center gap-3 text-sm text-ink-soft" role="status">
            <Waveform active />
            Transcribing your answer…
          </span>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
