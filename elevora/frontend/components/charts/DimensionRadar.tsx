"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { DIMENSION_LABELS } from "@/lib/types";
import type { DimensionAverages } from "@/lib/interviewStats";

/**
 * Average profile across the dimensions that were actually measured. Only
 * available dimensions are plotted — a missing measurement is left out rather
 * than drawn as zero, which would read as "bad" instead of "unknown".
 */
export function DimensionRadar({ averages }: { averages: DimensionAverages }) {
  const data = Object.entries(averages)
    .filter(([, value]) => typeof value === "number")
    .map(([key, value]) => ({
      dimension: DIMENSION_LABELS[key] ?? key,
      score: value as number,
    }));

  if (data.length < 3) {
    return (
      <p className="py-10 text-center text-sm leading-6 text-ink-soft">
        At least three measured dimensions are needed to draw this chart.
        {data.length > 0 && ` Measured so far: ${data.map((d) => d.dimension).join(", ")}.`}
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(229,201,215,.14)" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: "#C7D1DD", fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
          <Radar
            dataKey="score"
            stroke="#83A6CE"
            strokeWidth={2}
            fill="#C48CB3"
            fillOpacity={0.28}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
