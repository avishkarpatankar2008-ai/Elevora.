"use client";

import type { RefObject } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Textarea";
import { VoiceControls, type RecordingState } from "@/components/VoiceControls";

/**
 * The answer surface: speak it or type it. Both paths hit the same scoring
 * pipeline, so the UI presents them as equal choices rather than a primary and
 * a fallback.
 */
export function AnswerComposer({
  textareaRef,
  answer,
  onAnswerChange,
  onSubmit,
  onRecorded,
  onRecordingStateChange,
  disabled,
  isBusy,
  error,
  startSignal,
  stopSignal,
  micAvailable,
}: {
  textareaRef: RefObject<HTMLTextAreaElement>;
  answer: string;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  onRecorded: (blob: Blob) => Promise<void>;
  onRecordingStateChange: (state: RecordingState) => void;
  disabled: boolean;
  isBusy: boolean;
  error: string | null;
  startSignal: number;
  stopSignal: number;
  micAvailable: boolean;
}) {
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  return (
    <section aria-labelledby="answer-heading" className="mt-6">
      <h2 id="answer-heading" className="text-sm font-semibold text-ink">
        Your answer
      </h2>
      <p className="mt-1 text-xs text-ink-mute">
        Speak it or type it — the interviewer evaluates both the same way.
      </p>

      <div className="surface-1 mt-4 rounded-2xl p-4">
        {micAvailable ? (
          <VoiceControls
            onRecorded={onRecorded}
            onStateChange={onRecordingStateChange}
            disabled={disabled || isBusy}
            startSignal={startSignal}
            stopSignal={stopSignal}
            compact
          />
        ) : (
          <p className="rounded-xl border border-line bg-navy-950/40 p-3 text-xs leading-5 text-ink-mute">
            This browser can&apos;t record audio here, so voice answers are unavailable. Typing works
            exactly the same for scoring.
          </p>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="mt-4 flex flex-col gap-3"
        >
          <Textarea
            ref={textareaRef}
            name="answer"
            label="Text answer"
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            rows={6}
            placeholder="Type your answer here, or record it above…"
            disabled={isBusy || disabled}
            hint={wordCount > 0 ? `${wordCount} word${wordCount === 1 ? "" : "s"}` : undefined}
          />

          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" isLoading={isBusy} disabled={!answer.trim() || disabled}>
              Submit answer
            </Button>
            <span className="text-xs text-ink-mute">
              Submitting locks this question and generates the next one.
            </span>
          </div>
        </form>
      </div>
    </section>
  );
}
