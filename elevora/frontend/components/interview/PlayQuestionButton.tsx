"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";

/**
 * Reads the current question using the browser's Web Speech API. This keeps
 * question playback useful without invoking a paid server-side TTS endpoint.
 * Playback remains user initiated except when the user's autoplay preference
 * requests a best-effort attempt, which browsers may block until interaction.
 */
export function PlayQuestionButton({
  questionText,
  onSpeakingChange,
  autoPlay = false,
  autoPlayKey,
}: {
  questionText: string;
  onSpeakingChange?: (speaking: boolean) => void;
  autoPlay?: boolean;
  autoPlayKey?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const attemptedRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsPlaying(false);
    onSpeakingChange?.(false);
  }, [onSpeakingChange]);

  const speak = useCallback((silent = false) => {
    if (!silent) setError(null);
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (!silent) setError("Speech playback isn't supported by this browser. Read the question above.");
      return;
    }
    const text = questionText.trim();
    if (!text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onstart = () => {
      setIsPlaying(true);
      onSpeakingChange?.(true);
    };
    const finish = () => {
      setIsPlaying(false);
      onSpeakingChange?.(false);
      if (utteranceRef.current === utterance) utteranceRef.current = null;
    };
    utterance.onend = finish;
    utterance.onerror = () => {
      finish();
      if (!silent) setError("Speech playback failed. Read the question above or try again.");
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [onSpeakingChange, questionText]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (!autoPlay || !autoPlayKey || attemptedRef.current === autoPlayKey) return;
    attemptedRef.current = autoPlayKey;
    speak(true);
  }, [autoPlay, autoPlayKey, speak]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="ghost" size="sm" onClick={() => speak()}>
        <svg
          aria-hidden="true"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" />
        </svg>
        {isPlaying ? "Speaking…" : "Play question aloud"}
      </Button>
      {isPlaying && (
        <button type="button" onClick={stop} className="text-xs text-ink-mute underline">
          Stop
        </button>
      )}
      {error && <span role="status" className="text-xs text-ink-mute">{error}</span>}
    </div>
  );
}
