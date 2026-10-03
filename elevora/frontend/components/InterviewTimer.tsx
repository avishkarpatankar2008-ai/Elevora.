"use client";

import { useEffect, useState } from "react";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Elapsed time since the interview started. Informational only — the engine
 * ends interviews by question count, so a candidate who thinks slowly is never
 * cut off. `targetMinutes` is a reference point, not a deadline.
 */
export function InterviewTimer({
  startedAt,
  targetMinutes,
}: {
  startedAt: string;
  targetMinutes?: number;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startMs = new Date(startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-navy-950/40 px-2.5 py-1">
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="text-blue"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="font-mono text-xs tabular-nums text-ink-soft">
        <span className="sr-only">Elapsed time </span>
        {formatDuration(elapsedSeconds)}
        {targetMinutes ? ` / ~${targetMinutes}:00` : ""}
      </span>
    </span>
  );
}
