"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

export type RecordingState = "idle" | "recording" | "processing";

interface VoiceControlsProps {
  onRecorded: (blob: Blob) => Promise<void>;
  onStateChange?: (state: RecordingState) => void;
  disabled?: boolean;
  /** Hard stop for a single answer, so one recording can't grow without bound. */
  maxSeconds?: number;
}

/**
 * Microphone recording control for the interview room.
 *
 * Browser notes (see README "Manual verification" for the untested-in-CI list):
 *   - MediaRecorder mime support varies: Chrome/Firefox prefer audio/webm;codecs=opus,
 *     Safari records audio/mp4. We ask the browser what it supports and fall back
 *     to its own default rather than forcing one.
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

export function VoiceControls({
  onRecorded,
  onStateChange,
  disabled = false,
  maxSeconds = 300,
}: VoiceControlsProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stateRef = useRef<RecordingState>("idle");
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

  // Stop the microphone if the component goes away mid-recording.
  useEffect(() => {
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      releaseStream();
    };
  }, []);

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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {state === "idle" && (
          <Button
            type="button"
            variant="secondary"
            onClick={startRecording}
            disabled={disabled}
            className="px-4 py-2.5"
          >
            🎤 Record answer
          </Button>
        )}

        {state === "recording" && (
          <>
            <Button
              type="button"
              variant="danger"
              onClick={stopRecording}
              className="px-4 py-2.5"
              aria-live="off"
            >
              ● Stop recording
            </Button>
            <span className="font-mono text-sm tabular-nums text-ink-600" role="status">
              {formatSeconds(elapsed)} / {formatSeconds(maxSeconds)}
            </span>
            <Button type="button" variant="ghost" onClick={cancelRecording} className="px-3 py-2">
              Cancel
            </Button>
          </>
        )}

        {state === "processing" && (
          <span className="flex items-center gap-2 text-sm text-ink-600" role="status">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Transcribing your answer…
          </span>
        )}
      </div>
      <p className="text-xs text-ink-400">
        Voice answers are transcribed by OpenAI. The audio itself isn&apos;t stored.
      </p>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
