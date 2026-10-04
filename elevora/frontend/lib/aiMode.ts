"use client";

import { useEffect, useState } from "react";
import { systemApi } from "./api";
import type { HealthStatus } from "./types";

export type AiMode = NonNullable<HealthStatus["aiMode"]>;

/**
 * The server's AI mode is a process-level fact (it only changes on a backend
 * restart), so one successful fetch is cached module-wide: every component on
 * every page shares it and only the first mount pays a round trip.
 *
 * Failures are NOT cached — a health request that fails (backend still
 * starting, offline) simply resolves to null (unknown → render nothing) and
 * the next mount retries.
 */
let cached: Promise<AiMode | null> | null = null;

export function fetchAiMode(): Promise<AiMode | null> {
  if (!cached) {
    cached = systemApi
      .health()
      .then((health) => health.aiMode ?? null)
      .catch(() => {
        cached = null;
        return null;
      });
  }
  return cached;
}

/** Reactive AI mode for client components: null until known, then "demo" | "live" | "not_configured". */
export function useAiMode(): AiMode | null {
  const [mode, setMode] = useState<AiMode | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAiMode().then((resolved) => {
      if (active) setMode(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  return mode;
}
