"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { interviewsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INTERVIEW_CATEGORIES, type Interview } from "@/lib/types";

function categoryLabel(value: string) {
  return INTERVIEW_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const STATUS_LABELS: Record<Interview["status"], string> = {
  completed: "Completed",
  in_progress: "In progress",
  draft: "Not started",
  abandoned: "Abandoned",
};

const STATUS_STYLES: Record<Interview["status"], string> = {
  completed: "border-success/30 bg-success/10 text-success",
  in_progress: "border-accent-300/30 bg-accent-600/12 text-accent-300",
  draft: "border-white/12 bg-white/[0.05] text-ink-600",
  abandoned: "border-white/12 bg-white/[0.05] text-ink-400",
};

function Dashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    interviewsApi
      .list()
      .then(setItems)
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("We couldn't load your interviews. Refresh to try again.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const completed = useMemo(() => items.filter((i) => i.status === "completed"), [items]);
  const active = useMemo(
    () => items.filter((i) => i.status === "in_progress" || i.status === "draft"),
    [items]
  );

  const stats = [
    { label: "Interviews", value: items.length, hint: "Total sessions" },
    { label: "Completed", value: completed.length, hint: "Finished sessions" },
    { label: "In progress", value: active.length, hint: "Sessions to continue" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow">Workspace</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            Good to see you, {user?.name?.split(" ")[0] || "there"}.
          </h1>
          <p className="mt-2 text-sm text-ink-600">Your practice history, without the noise.</p>
        </div>
        <Link href="/interviews/new">
          <Button className="h-11 w-full px-5 sm:w-auto">+ New interview</Button>
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="text-xs text-ink-400">{stat.label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">
              {loading ? "—" : stat.value}
            </div>
            <div className="mt-1 text-xs text-ink-400">{stat.hint}</div>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="min-h-[360px]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-ink-900">Your interviews</div>
              <div className="mt-1 text-xs text-ink-400">
                Every session you create appears here.
              </div>
            </div>
            <Link
              href="/interviews/new"
              className="text-xs font-medium text-accent-300 hover:text-accent"
            >
              Start practice →
            </Link>
          </div>

          {error && <Alert tone="error" className="mt-6">{error}</Alert>}

          {loading && (
            <div className="mt-8 space-y-3" role="status" aria-label="Loading interviews">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[.04]" />
              ))}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex min-h-[270px] flex-col items-center justify-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-xl text-accent-300">
                ↗
              </div>
              <h3 className="mt-5 font-semibold text-ink-900">Your practice history is empty</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-ink-400">
                Create your first interview and ELEVORA will start building your real performance
                history.
              </p>
              <Link href="/interviews/new" className="mt-5">
                <Button>Start first interview</Button>
              </Link>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <ul className="mt-6 space-y-2">
              {items.map((interview) => (
                <li key={interview.id}>
                  <div className="flex flex-col gap-4 rounded-xl border border-white/[.06] bg-white/[.02] p-4 transition-colors hover:border-white/[.12] sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink-900">
                        {categoryLabel(interview.category)}
                        {interview.role ? ` · ${interview.role}` : ""}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                        <span className={`rounded-full border px-2 py-0.5 ${STATUS_STYLES[interview.status]}`}>
                          {STATUS_LABELS[interview.status]}
                        </span>
                        <span>{interview.difficulty}</span>
                        <span aria-hidden="true">·</span>
                        <span>{interview.durationMinutes} min</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={interview.createdAt}>
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </time>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link href={`/interviews/${interview.id}`}>
                        <Button variant="secondary" className="px-3 py-2">
                          {interview.status === "completed" || interview.status === "abandoned"
                            ? "View"
                            : "Continue"}
                        </Button>
                      </Link>
                      {interview.status === "completed" && (
                        <Link href={`/results/${interview.id}`}>
                          <Button variant="ghost" className="px-3 py-2">
                            Report
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="h-fit">
          <div className="text-sm font-semibold text-ink-900">Practice loop</div>
          <div className="mt-1 text-xs text-ink-400">
            The product gets better with actual sessions.
          </div>
          <div className="mt-6 space-y-5">
            {[
              ["01", "Configure", "Choose target, difficulty and duration."],
              ["02", "Interview", "Answer naturally with voice or text."],
              ["03", "Review", "Use evidence-backed feedback to practice again."],
            ].map(([n, title, body]) => (
              <div key={n} className="flex gap-3">
                <span className="text-xs font-semibold text-accent-300">{n}</span>
                <div>
                  <div className="text-sm font-medium text-ink-900">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-ink-400">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
