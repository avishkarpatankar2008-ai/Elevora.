"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, interviewsApi } from "./api";
import type { Interview, InterviewReport } from "./types";

/**
 * Loads the signed-in candidate's interviews plus the reports that exist for
 * them.
 *
 * Two phase by design: the list renders as soon as it arrives, then report
 * fetches fill in progressively (the charts simply aren't drawn until their
 * data exists). Report requests are capped because each one is a round trip;
 * the dashboard states how many recent sessions its averages cover rather than
 * implying it summarised everything.
 */
export const MAX_REPORT_FETCH = 12;
const PAGE_SIZE = 200;

export interface InterviewOverview {
  interviews: Interview[];
  reports: Record<string, InterviewReport>;
  isLoading: boolean;
  /** True while report requests are still in flight. */
  isLoadingScores: boolean;
  error: string | null;
  reload: () => void;
}

export function useInterviewOverview(): InterviewOverview {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [reports, setReports] = useState<Record<string, InterviewReport>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const list = await interviewsApi.list({ limit: PAGE_SIZE }, controller.signal);
        if (controller.signal.aborted) return;
        setInterviews(list);
        setIsLoading(false);

        const withReports = list
          .filter((interview) => interview.status === "completed")
          .slice(0, MAX_REPORT_FETCH);
        if (withReports.length === 0) return;

        setIsLoadingScores(true);
        const results = await Promise.allSettled(
          withReports.map((interview) => interviewsApi.getReport(interview.id, controller.signal))
        );
        if (controller.signal.aborted) return;

        const next: Record<string, InterviewReport> = {};
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            next[withReports[index].id] = result.value;
          }
          // A rejected report fetch (no report yet, transient failure) simply
          // leaves that interview unscored in the UI — never a zero.
        });
        setReports(next);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError && err.status === 0
            ? err.message
            : "We couldn't load your interviews. Refresh to try again."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsLoadingScores(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [reloadToken]);

  return { interviews, reports, isLoading, isLoadingScores, error, reload };
}
