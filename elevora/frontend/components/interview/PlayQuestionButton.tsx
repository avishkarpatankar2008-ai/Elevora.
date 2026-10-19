"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
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
  onSpeakingChange,
  autoPlay = false,
  autoPlayKey,
}: {
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
        {isPlaying ? "Playing…" : "Play question aloud"}
      </Button>
      {error && (
        <span role="status" className="text-xs text-ink-mute">
          {error}
        </span>
      )}
    </div>
  );
}
