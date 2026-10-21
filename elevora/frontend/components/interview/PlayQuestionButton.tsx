"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
<<<<<<< HEAD

/**
 * Reads the current question using the browser's Web Speech API. This keeps
 * question playback useful without invoking a paid server-side TTS endpoint.
 * Playback remains user initiated except when the user's autoplay preference
 * requests a best-effort attempt, which browsers may block until interaction.
 */
export function PlayQuestionButton({
  questionText,
=======
import { ApiError, interviewsApi } from "@/lib/api";

/**
 * Fetches and plays the current question as spoken audio.
 *
 * Playback is user-initiated (never autoplayed) so browser autoplay policies
 * can't silently block it. The object URL is revoked on unmount so repeated
 * plays don't leak memory.
 */
export function PlayQuestionButton({
  interviewId,
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
  onSpeakingChange,
  autoPlay = false,
  autoPlayKey,
}: {
<<<<<<< HEAD
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
=======
  interviewId: string;
  onSpeakingChange?: (speaking: boolean) => void;
  /** Attempt playback as soon as a new question arrives (user preference). */
  autoPlay?: boolean;
  /** Changes per question; a new value is what re-triggers the attempt. */
  autoPlayKey?: string;
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

  const attemptedRef = useRef<string | null>(null);

  async function handlePlay(silent = false) {
    if (!silent) setError(null);
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
          setError("The audio couldn't be played. Read the question instead.");
        };
      }
      audioRef.current.src = url;
      await audioRef.current.play();
    } catch (err) {
      // Autoplay attempts fail silently: the browser may block playback until
      // the user interacts, which is not an error worth reporting.
      if (!silent) {
        setError(
          err instanceof ApiError ? err.message : "Couldn't load the question audio. Read it instead."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Held in a ref so the auto-play effect never depends on a changing closure
  // (and needs no dependency-array suppression).
  const handlePlayRef = useRef<(silent?: boolean) => void>(() => {});
  useEffect(() => {
    handlePlayRef.current = (silent) => {
      void handlePlay(silent);
    };
  });

  useEffect(() => {
    if (!autoPlay || !autoPlayKey) return;
    if (attemptedRef.current === autoPlayKey) return;
    attemptedRef.current = autoPlayKey;
    handlePlayRef.current(true);
  }, [autoPlay, autoPlayKey]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          void handlePlay();
        }}
        isLoading={isLoading}
      >
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
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
<<<<<<< HEAD
        {isPlaying ? "Speaking…" : "Play question aloud"}
      </Button>
      {isPlaying && (
        <button type="button" onClick={stop} className="text-xs text-ink-mute underline">
          Stop
        </button>
      )}
      {error && <span role="status" className="text-xs text-ink-mute">{error}</span>}
=======
        {isPlaying ? "Playing…" : "Play question aloud"}
      </Button>
      {error && (
        <span role="status" className="text-xs text-ink-mute">
          {error}
        </span>
      )}
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
    </div>
  );
}
