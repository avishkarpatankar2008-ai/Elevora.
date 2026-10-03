"use client";

import { useEffect, useState } from "react";

function toneFor(score: number) {
  if (score >= 75) return "#7BC8A4";
  if (score >= 50) return "#83A6CE";
  return "#C48CB3";
}

/**
 * Overall-score visualisation. The number is the primary signal (and is exposed
 * to assistive tech as text); the arc is decoration.
 */
export function ScoreRing({
  score,
  size = 168,
  label = "Overall score",
  sublabel = "out of 100",
  animate = true,
}: {
  score: number;
  size?: number;
  label?: string;
  sublabel?: string;
  animate?: boolean;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const target = circumference * (1 - clamped / 100);

  // Reveal on mount/change rather than snapping, unless motion is unwelcome.
  const [offset, setOffset] = useState(animate ? circumference : target);
  useEffect(() => {
    if (!animate) {
      setOffset(target);
      return;
    }
    const frame = requestAnimationFrame(() => setOffset(target));
    return () => cancelAnimationFrame(frame);
  }, [animate, target]);

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${clamped} ${sublabel}`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(229,201,215,.12)" strokeWidth="7" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={toneFor(clamped)}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="font-semibold tracking-tight text-ink"
          style={{ fontSize: size * 0.24 }}
        >
          {clamped}
        </span>
        <span className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-ink-mute">
          {sublabel}
        </span>
      </div>
    </div>
  );
}
