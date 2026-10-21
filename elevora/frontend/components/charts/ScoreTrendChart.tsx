"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/interviewStats";

/**
 * Score over time. Palette-locked (blue → plum); no green/red traffic-lighting
 * on the line itself, because a trend line is not a verdict.
 */
export function ScoreTrendChart({ points }: { points: TrendPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#83A6CE" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#C48CB3" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="scoreStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#83A6CE" />
              <stop offset="100%" stopColor="#C48CB3" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(229,201,215,.10)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#93A3B8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: "#93A3B8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: "rgba(131,166,206,.35)" }}
            contentStyle={{
              background: "rgba(19,45,74,.95)",
              border: "1px solid rgba(229,201,215,.18)",
              borderRadius: 12,
              color: "#F7F4F6",
              fontSize: 12,
              boxShadow: "0 18px 50px rgba(4,10,24,.5)",
            }}
            labelStyle={{ color: "#C7D1DD", marginBottom: 2 }}
            formatter={(value) => [`${String(value)} / 100`, "Score"]}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="url(#scoreStroke)"
            strokeWidth={2.5}
            fill="url(#scoreFill)"
            dot={{ r: 3, fill: "#C48CB3", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#E5C9D7", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
