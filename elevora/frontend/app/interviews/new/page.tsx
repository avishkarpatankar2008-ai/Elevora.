"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Select } from "@/components/Select";
import { ApiError, interviewsApi, profilesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  EXPERIENCE_LEVELS,
  INTERVIEW_CATEGORIES,
  LANGUAGE_OPTIONS,
  type InterviewCategory,
  type InterviewConfig,
  type InterviewDifficulty,
  type InterviewProfile,
} from "@/lib/types";

const DIFFICULTIES: { value: InterviewDifficulty; label: string }[] = [
  { value: "easy", label: "Easy — warm up" },
  { value: "medium", label: "Medium — typical" },
  { value: "hard", label: "Hard — push me" },
];

const LANGUAGE_SELECT_OPTIONS = LANGUAGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
const EXPERIENCE_SELECT_OPTIONS = EXPERIENCE_LEVELS.map((o) => ({ value: o.value, label: o.label }));

/** Shared pieces of both flows: everything except the target itself. */
interface SessionSettings {
  role: string;
  company: string;
  industry: string;
  experienceLevel: string;
  difficulty: InterviewDifficulty;
  language: string;
  durationMinutes: number;
}

function useSessionSettings(): [SessionSettings, <K extends keyof SessionSettings>(key: K, value: SessionSettings[K]) => void] {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SessionSettings>({
    role: "",
    company: "",
    industry: "",
    experienceLevel: "entry-level",
    difficulty: "medium",
    language: "English",
    durationMinutes: 20,
  });

  // Apply the saved preferences once the user record is available.
  useEffect(() => {
    if (!user) return;
    setSettings((prev) => ({
      ...prev,
      language: user.preferences.language || prev.language,
      difficulty: user.preferences.defaultDifficulty || prev.difficulty,
    }));
  }, [user]);

  return [settings, (key, value) => setSettings((prev) => ({ ...prev, [key]: value }))];
}

function DurationSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (minutes: number) => void;
}) {
  const id = "duration-minutes";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-900">
        Duration: <output htmlFor={id}>{value} minutes</output>
      </label>
      <input
        id={id}
        type="range"
        min={5}
        max={60}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-accent"
      />
      <p className="text-xs text-ink-400">
        Used to size the session (roughly one question per three minutes). The interview ends by
        question count, not by a clock.
      </p>
    </div>
  );
}

function profileDifficultyLabel(profile: InterviewProfile) {
  return profile.difficulty === "adaptive" ? "Adaptive" : profile.difficulty;
}

// ---- Profile-based flow (default) -----------------------------------------

function ProfilePicker({ onCreated }: { onCreated: (id: string) => void }) {
  const [profiles, setProfiles] = useState<InterviewProfile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<InterviewProfile | null>(null);
  const [settings, setSetting] = useSessionSettings();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    profilesApi
      .list()
      .then(setProfiles)
      .catch(() => setLoadError("Couldn't load interview profiles. Try refreshing."));
  }, []);

  function selectProfile(profile: InterviewProfile) {
    setSelected(profile);
    if (profile.difficulty !== "adaptive") setSetting("difficulty", profile.difficulty);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setIsSubmitting(true);

    const payload: InterviewConfig = {
      profileId: selected.id,
      role: settings.role || undefined,
      company: settings.company || undefined,
      industry: settings.industry || undefined,
      experienceLevel: settings.experienceLevel,
      difficulty: settings.difficulty,
      language: settings.language,
      durationMinutes: settings.durationMinutes,
    };

    try {
      const interview = await interviewsApi.create(payload);
      onCreated(interview.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the interview. Try again.");
      setIsSubmitting(false);
    }
  }

  if (loadError) return <Alert tone="error">{loadError}</Alert>;
  if (!profiles) {
    return (
      <p className="text-sm text-ink-600" role="status">
        Loading interview profiles…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {profiles.map((profile) => {
          const isSelected = selected?.id === profile.id;
          return (
            <Card
              key={profile.id}
              className={isSelected ? "border-accent/60 ring-1 ring-accent/50" : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900">{profile.name}</p>
                  {!profile.isSystem && (
                    <span className="mt-1 inline-block rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-ink-600">
                      Custom
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-600">{profile.description}</p>
              <p className="mt-3 text-xs text-ink-400">
                <span className="font-medium text-ink-600">Subjects:</span>{" "}
                {profile.subjects.join(", ")}
              </p>
              <p className="mt-2 text-xs text-ink-400">
                {profileDifficultyLabel(profile)} · {profile.maxQuestions} questions
                {profile.followUpEnabled ? " · follow-ups" : ""}
              </p>
              <Button
                type="button"
                variant={isSelected ? "primary" : "secondary"}
                className="mt-4 w-full"
                aria-pressed={isSelected}
                onClick={() => selectProfile(profile)}
              >
                {isSelected ? "Selected" : "Select"}
              </Button>
            </Card>
          );
        })}
      </div>

      {profiles.length === 0 && (
        <p className="text-sm text-ink-600">
          No interview profiles available yet. Build one on the{" "}
          <Link href="/interview-profiles" className="text-accent-300 hover:text-accent">
            profiles page
          </Link>
          .
        </p>
      )}

      {selected && (
        <Card>
          <p className="font-medium text-ink-900">Configure “{selected.name}”</p>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
            <Input
              label="Role (optional)"
              name="role"
              placeholder="e.g. Backend Engineer"
              value={settings.role}
              onChange={(e) => setSetting("role", e.target.value)}
            />
            <Input
              label="Company (optional)"
              name="company"
              placeholder="e.g. Acme Corp"
              value={settings.company}
              onChange={(e) => setSetting("company", e.target.value)}
            />
            <Input
              label="Industry (optional)"
              name="industry"
              placeholder="e.g. Technology"
              value={settings.industry}
              onChange={(e) => setSetting("industry", e.target.value)}
            />
            <Select
              label="Experience level"
              name="experienceLevel"
              value={settings.experienceLevel}
              onChange={(e) => setSetting("experienceLevel", e.target.value)}
              options={EXPERIENCE_SELECT_OPTIONS}
            />
            <Select
              label="Difficulty"
              name="difficulty"
              value={settings.difficulty}
              onChange={(e) => setSetting("difficulty", e.target.value as InterviewDifficulty)}
              options={DIFFICULTIES}
            />
            <Select
              label="Language"
              name="language"
              value={settings.language}
              onChange={(e) => setSetting("language", e.target.value)}
              options={LANGUAGE_SELECT_OPTIONS}
            />
            <DurationSlider
              value={settings.durationMinutes}
              onChange={(minutes) => setSetting("durationMinutes", minutes)}
            />

            {error && <Alert tone="error">{error}</Alert>}

            <Button type="submit" isLoading={isSubmitting} className="sm:self-start">
              Create interview
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

// ---- Category flow (kept for backward compatibility) -----------------------

function CategoryForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [category, setCategory] = useState<InterviewCategory>("software-engineer");
  const [exam, setExam] = useState("");
  const [settings, setSetting] = useSessionSettings();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showRole = ["campus-placement", "software-engineer", "mechanical-engineer"].includes(category);
  const showCompany = category === "company-specific";
  const showExam = ["upsc", "mpsc", "ssc", "banking"].includes(category);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload: InterviewConfig = {
      category,
      role: showRole && settings.role ? settings.role : undefined,
      company: showCompany && settings.company ? settings.company : undefined,
      exam: showExam && exam ? exam : undefined,
      industry: settings.industry || undefined,
      experienceLevel: settings.experienceLevel,
      difficulty: settings.difficulty,
      language: settings.language,
      durationMinutes: settings.durationMinutes,
    };

    try {
      const interview = await interviewsApi.create(payload);
      onCreated(interview.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the interview. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Select
          label="What are you preparing for?"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as InterviewCategory)}
          options={INTERVIEW_CATEGORIES}
        />

        {showRole && (
          <Input
            label="Role"
            name="role"
            placeholder="e.g. Backend Engineer"
            value={settings.role}
            onChange={(e) => setSetting("role", e.target.value)}
          />
        )}

        {showCompany && (
          <Input
            label="Company"
            name="company"
            placeholder="e.g. Acme Corp"
            value={settings.company}
            onChange={(e) => setSetting("company", e.target.value)}
          />
        )}

        {showExam && (
          <Input
            label="Exam"
            name="exam"
            placeholder="e.g. UPSC Civil Services"
            value={exam}
            onChange={(e) => setExam(e.target.value)}
          />
        )}

        <Input
          label="Industry (optional)"
          name="industry"
          placeholder="e.g. Technology"
          value={settings.industry}
          onChange={(e) => setSetting("industry", e.target.value)}
        />

        <Select
          label="Experience level"
          name="experienceLevel"
          value={settings.experienceLevel}
          onChange={(e) => setSetting("experienceLevel", e.target.value)}
          options={EXPERIENCE_SELECT_OPTIONS}
        />

        <Select
          label="Difficulty"
          name="difficulty"
          value={settings.difficulty}
          onChange={(e) => setSetting("difficulty", e.target.value as InterviewDifficulty)}
          options={DIFFICULTIES}
        />

        <Select
          label="Language"
          name="language"
          value={settings.language}
          onChange={(e) => setSetting("language", e.target.value)}
          options={LANGUAGE_SELECT_OPTIONS}
        />

        <DurationSlider
          value={settings.durationMinutes}
          onChange={(minutes) => setSetting("durationMinutes", minutes)}
        />

        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" isLoading={isSubmitting} className="sm:self-start">
          Create interview
        </Button>
      </form>
    </Card>
  );
}

// ---- Page ------------------------------------------------------------------

function NewInterviewForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"profile" | "category">("profile");

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
        Configure your interview
      </h1>
      <p className="mt-2 text-sm text-ink-600">
        Pick an interview profile to set the subjects, question types, and pacing — or{" "}
        <Link href="/interview-profiles" className="text-accent-300 hover:text-accent">
          build your own
        </Link>
        .
      </p>

      <div role="tablist" aria-label="Interview setup mode" className="mt-6 flex gap-2 border-b border-white/[.08]">
        {(
          [
            ["profile", "Interview profiles"],
            ["category", "Choose by category instead"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`tab-${value}`}
            aria-selected={mode === value}
            aria-controls={`panel-${value}`}
            onClick={() => setMode(value)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              mode === value
                ? "border-b-2 border-accent text-ink-900"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8" role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`}>
        {mode === "profile" ? (
          <ProfilePicker onCreated={(id) => router.push(`/interviews/${id}`)} />
        ) : (
          <CategoryForm onCreated={(id) => router.push(`/interviews/${id}`)} />
        )}
      </div>
    </div>
  );
}

export default function NewInterviewPage() {
  return (
    <ProtectedRoute>
      <NewInterviewForm />
    </ProtectedRoute>
  );
}
