"use client";

import { useMemo, useState } from "react";
import { Badge, type BadgeTone } from "./Badge";
import { Button, ButtonLink } from "./Button";
import { EmptyState } from "./EmptyState";
import { applyHistoryQuery, type HistoryFilter, type HistorySort } from "@/lib/interviewStats";
import { INTERVIEW_CATEGORIES, type Interview, type InterviewReport } from "@/lib/types";

const STATUS_META: Record<Interview["status"], { label: string; tone: BadgeTone }> = {
  completed: { label: "Completed", tone: "success" },
  in_progress: { label: "In progress", tone: "blue" },
  draft: { label: "Not started", tone: "neutral" },
  abandoned: { label: "Ended early", tone: "warning" },
};

const SORT_OPTIONS: { value: HistorySort; label: string }[] = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "score", label: "Highest score" },
];

const FILTER_OPTIONS: { value: HistoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In progress" },
  { value: "draft", label: "Not started" },
  { value: "abandoned", label: "Ended early" },
];

function categoryLabel(value: string) {
  return INTERVIEW_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

function scoreTone(score: number): BadgeTone {
  if (score >= 75) return "success";
  if (score >= 50) return "blue";
  return "plum";
}

/**
 * Interview history: search, filter and sort run client-side over the loaded
 * page of interviews, which is the honest scope of the current API (bounded
 * listing, no server-side search yet).
 */
export function HistoryTable({
  interviews,
  reports,
}: {
  interviews: Interview[];
  reports: Record<string, InterviewReport>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [sort, setSort] = useState<HistorySort>("recent");

  const rows = useMemo(
    () => applyHistoryQuery(interviews, reports, { query, filter, sort }),
    [interviews, reports, query, filter, sort]
  );

  const isFiltering = query.trim().length > 0 || filter !== "all";

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <label htmlFor="history-search" className="sr-only">
            Search interviews
          </label>
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="history-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search role, company, category…"
            className="w-full rounded-lg border border-line bg-navy-950/50 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-mute/80 transition-colors focus:border-blue focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  filter === option.value
                    ? "border-blue/50 bg-blue/[0.14] text-ink"
                    : "border-line text-ink-soft hover:border-line-strong hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label htmlFor="history-sort" className="sr-only">
            Sort interviews
          </label>
          <select
            id="history-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as HistorySort)}
            className="rounded-lg border border-line bg-navy-950/50 px-3 py-2 text-xs text-ink-soft focus:border-blue focus:outline-none [&>option]:bg-navy-900"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        isFiltering ? (
          <EmptyState
            title="No interviews match those filters"
            description="Try a different search term or clear the status filter to see your full history."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No interviews yet"
            description="Create your first interview and ELEVORA will start building your real performance history — nothing here is pre-filled."
            action={
              <ButtonLink href="/interviews/new">Start your first interview</ButtonLink>
            }
          />
        )
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-line">
          {/* Desktop table */}
          <table className="hidden w-full border-collapse text-sm md:table">
            <caption className="sr-only">Your interview history</caption>
            <thead>
              <tr className="border-b border-line bg-white/[0.02] text-left text-xs uppercase tracking-[0.12em] text-ink-mute">
                <th scope="col" className="px-4 py-3 font-medium">
                  Interview
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Score
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((interview) => {
                const report = reports[interview.id];
                const meta = STATUS_META[interview.status];
                return (
                  <tr
                    key={interview.id}
                    className="border-b border-line-soft transition-colors last:border-b-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-ink">
                        {categoryLabel(interview.category)}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-mute">
                        {[interview.role, interview.company, interview.exam]
                          .filter(Boolean)
                          .join(" · ") || `${interview.difficulty} · ${interview.language}`}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-ink-soft">
                      <time dateTime={interview.createdAt}>
                        {new Date(interview.createdAt).toLocaleDateString()}
                      </time>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      {report ? (
                        <Badge tone={scoreTone(report.overallScore)}>
                          {report.overallScore} / 100
                        </Badge>
                      ) : (
                        <span className="text-xs text-ink-mute">
                          {interview.status === "completed" ? "Not scored yet" : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        <ButtonLink href={`/interviews/${interview.id}`} variant="ghost" size="sm">
                            {interview.status === "completed" || interview.status === "abandoned"
                              ? "View"
                              : "Continue"}
                          </ButtonLink>
                        {interview.status === "completed" && (
                          <ButtonLink href={`/results/${interview.id}`} variant="secondary" size="sm">
                              Report
                            </ButtonLink>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <ul className="divide-y divide-line-soft md:hidden">
            {rows.map((interview) => {
              const report = reports[interview.id];
              const meta = STATUS_META[interview.status];
              return (
                <li key={interview.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {categoryLabel(interview.category)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-mute">
                        {[interview.role, interview.company].filter(Boolean).join(" · ") ||
                          `${interview.difficulty} · ${interview.language}`}
                      </p>
                    </div>
                    {report ? (
                      <Badge tone={scoreTone(report.overallScore)}>
                        {report.overallScore}/100
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-ink-mute">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <time dateTime={interview.createdAt}>
                      {new Date(interview.createdAt).toLocaleDateString()}
                    </time>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{interview.difficulty}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <ButtonLink href={`/interviews/${interview.id}`} variant="secondary" size="sm" className="w-full">
                        {interview.status === "completed" || interview.status === "abandoned"
                          ? "View"
                          : "Continue"}
                      </ButtonLink>
                    {interview.status === "completed" && (
                      <ButtonLink href={`/results/${interview.id}`} size="sm" className="w-full">
                          Report
                        </ButtonLink>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
