"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/Alert";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Select } from "@/components/Select";
import { SkeletonCard } from "@/components/Skeleton";
import { ApiError, profilesApi } from "@/lib/api";
import type { InterviewProfile, InterviewProfileInput, ProfileDifficulty } from "@/lib/types";

const DIFFICULTY_OPTIONS: { value: ProfileDifficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "adaptive", label: "Adaptive" },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  subjects: "",
  questionTypes: "",
  interviewerStyle: "professional",
  difficulty: "medium" as ProfileDifficulty,
  maxQuestions: 8,
  followUpEnabled: true,
  adaptiveDifficulty: true,
  resumeGrounding: true,
  jdGrounding: true,
};

type FormState = typeof EMPTY_FORM;

const TOGGLES: [keyof FormState, string, string][] = [
  ["followUpEnabled", "Follow-up questions", "The interviewer digs into an answer instead of moving on."],
  ["adaptiveDifficulty", "Adaptive difficulty", "Difficulty tracks how well you're answering."],
  ["resumeGrounding", "Ground in your resume", "Questions can reference your uploaded resume."],
  ["jdGrounding", "Ground in the job description", "Questions can reference the posting you uploaded."],
];

function toInput(form: FormState): InterviewProfileInput {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    subjects: form.subjects.split(",").map((s) => s.trim()).filter(Boolean),
    questionTypes: form.questionTypes.split(",").map((s) => s.trim()).filter(Boolean),
    interviewerStyle: form.interviewerStyle.trim() || "professional",
    difficulty: form.difficulty,
    maxQuestions: form.maxQuestions,
    followUpEnabled: form.followUpEnabled,
    adaptiveDifficulty: form.adaptiveDifficulty,
    resumeGrounding: form.resumeGrounding,
    jdGrounding: form.jdGrounding,
  };
}

function fromProfile(profile: InterviewProfile): FormState {
  return {
    name: profile.name,
    description: profile.description,
    category: profile.category,
    subjects: profile.subjects.join(", "),
    questionTypes: profile.questionTypes.join(", "),
    interviewerStyle: profile.interviewerStyle,
    difficulty: profile.difficulty,
    maxQuestions: profile.maxQuestions,
    followUpEnabled: profile.followUpEnabled,
    adaptiveDifficulty: profile.adaptiveDifficulty,
    resumeGrounding: profile.resumeGrounding,
    jdGrounding: profile.jdGrounding,
  };
}

function ProfileForm({
  initial,
  onCancel,
  onSubmit,
  title,
}: {
  initial: FormState;
  onCancel: () => void;
  onSubmit: (input: InterviewProfileInput) => Promise<void>;
  title: string;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const input = toInput(form);
    if (!input.name || !input.category || input.subjects.length === 0 || input.questionTypes.length === 0) {
      setError("A name, a category, at least one subject and at least one question type are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this profile. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mt-4">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            name="name"
            placeholder="Full stack interview"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Category"
            name="category"
            placeholder="full-stack"
            hint="A short slug used to group this profile."
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </div>

        <Input
          label="Description"
          name="description"
          placeholder="React, Node.js and MongoDB with adaptive difficulty."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Subjects (comma-separated)"
            name="subjects"
            placeholder="React, Node.js, MongoDB"
            value={form.subjects}
            onChange={(e) => setForm({ ...form, subjects: e.target.value })}
          />
          <Input
            label="Question types (comma-separated)"
            name="questionTypes"
            placeholder="Technical, Scenario, Behavioral"
            value={form.questionTypes}
            onChange={(e) => setForm({ ...form, questionTypes: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Interviewer style"
            name="interviewerStyle"
            placeholder="professional"
            value={form.interviewerStyle}
            onChange={(e) => setForm({ ...form, interviewerStyle: e.target.value })}
          />
          <Select
            label="Difficulty"
            name="difficulty"
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value as ProfileDifficulty })}
            options={DIFFICULTY_OPTIONS}
          />
        </div>

        <div>
          <label htmlFor="maxQuestions" className="text-[13px] font-medium text-ink-soft">
            Questions: <output htmlFor="maxQuestions">{form.maxQuestions}</output>
          </label>
          <input
            id="maxQuestions"
            type="range"
            min={3}
            max={30}
            step={1}
            value={form.maxQuestions}
            onChange={(e) => setForm({ ...form, maxQuestions: Number(e.target.value) })}
            className="mt-2 w-full accent-[#83A6CE]"
          />
          <p className="mt-1 text-xs text-ink-mute">
            Roughly three minutes per question — 8 questions is about a 25 minute session.
          </p>
        </div>

        <fieldset className="grid gap-2.5 sm:grid-cols-2">
          <legend className="sr-only">Profile behaviour</legend>
          {TOGGLES.map(([key, label, hint]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-navy-950/30 p-3.5 transition-colors hover:border-line-strong"
            >
              <input
                type="checkbox"
                checked={Boolean(form[key])}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong bg-navy-950 accent-[#83A6CE]"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-ink-mute">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" isLoading={isSubmitting}>
            Save profile
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ProfileFacts({ profile }: { profile: InterviewProfile }) {
  const facts = [
    profile.difficulty === "adaptive" ? "Adaptive difficulty" : `Difficulty: ${profile.difficulty}`,
    `${profile.maxQuestions} questions`,
    profile.followUpEnabled ? "Follow-ups on" : "No follow-ups",
    profile.resumeGrounding ? "Resume grounding" : null,
    profile.jdGrounding ? "JD grounding" : null,
  ].filter(Boolean) as string[];

  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {facts.map((fact) => (
        <li key={fact}>
          <Badge tone="neutral">{fact}</Badge>
        </li>
      ))}
    </ul>
  );
}

function InterviewProfilesContent() {
  const [profiles, setProfiles] = useState<InterviewProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    profilesApi
      .list()
      .then(setProfiles)
      .catch(() =>
        setError("We couldn't load your interview profiles. Check your connection and try again.")
      );
  }, []);

  useEffect(load, [load]);

  async function handleCreate(input: InterviewProfileInput) {
    await profilesApi.create(input);
    setCreating(false);
    load();
  }

  async function handleUpdate(id: string, input: InterviewProfileInput) {
    await profilesApi.update(id, input);
    setEditingId(null);
    load();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await profilesApi.remove(id);
      setConfirmingDeleteId(null);
      load();
    } catch {
      setError("Couldn't delete this profile. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const custom = profiles?.filter((profile) => !profile.isSystem) ?? [];
  const system = profiles?.filter((profile) => profile.isSystem) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Reusable setups</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Interview profiles
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            A profile fixes the subjects, question types and pacing so a repeat session is comparable
            to the last one. System profiles ship with ELEVORA; yours are private to your account.
          </p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)} className="sm:self-start">
            Create custom profile
          </Button>
        )}
      </div>

      {error && (
        <Alert tone="error" className="mt-5">
          {error}
        </Alert>
      )}

      {creating && (
        <ProfileForm
          title="New interview profile"
          initial={EMPTY_FORM}
          onCancel={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      )}

      {!profiles && !error && (
        <div className="mt-8 space-y-4" aria-busy="true">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <p className="sr-only" role="status">
            Loading interview profiles…
          </p>
        </div>
      )}

      {profiles && (
        <>
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-ink">Your custom profiles</h2>
            {custom.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  title="No custom profiles yet"
                  description="Create one to fix a set of subjects, question types and pacing you want to repeat — useful when you're drilling one specific round."
                  action={
                    <Button variant="secondary" onClick={() => setCreating(true)}>
                      Create your first profile
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                {custom.map((profile) =>
                  editingId === profile.id ? (
                    <ProfileForm
                      key={profile.id}
                      title={`Editing ${profile.name}`}
                      initial={fromProfile(profile)}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(input) => handleUpdate(profile.id, input)}
                    />
                  ) : (
                    <Card key={profile.id}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-ink">{profile.name}</p>
                            <Badge tone="blue">Custom</Badge>
                          </div>
                          {profile.description && (
                            <p className="mt-1.5 text-sm leading-6 text-ink-soft">
                              {profile.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-ink-mute">
                            Subjects: {profile.subjects.join(", ") || "—"} · Types:{" "}
                            {profile.questionTypes.join(", ") || "—"}
                          </p>
                          <ProfileFacts profile={profile} />
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {confirmingDeleteId === profile.id ? (
                            <>
                              <Button
                                variant="danger"
                                size="sm"
                                isLoading={deletingId === profile.id}
                                onClick={() => void handleDelete(profile.id)}
                              >
                                Confirm delete
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmingDeleteId(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditingId(profile.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmingDeleteId(profile.id)}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {confirmingDeleteId === profile.id && (
                        <p className="mt-3 text-xs leading-5 text-warning">
                          Interviews already created with this profile keep working — only the
                          reusable setup is removed.
                        </p>
                      )}
                    </Card>
                  )
                )}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-sm font-semibold text-ink">System profiles</h2>
            <p className="mt-1 text-xs text-ink-mute">
              Ready-made setups for common interview types. Use one as-is or copy its settings into a
              custom profile.
            </p>
            {system.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">No system profiles are available.</p>
            ) : (
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {system.map((profile) => (
                  <Card key={profile.id}>
                    <p className="font-medium text-ink">{profile.name}</p>
                    {profile.description && (
                      <p className="mt-1.5 text-sm leading-6 text-ink-soft">{profile.description}</p>
                    )}
                    <p className="mt-2 text-xs text-ink-mute">
                      Subjects: {profile.subjects.join(", ") || "—"}
                    </p>
                    <ProfileFacts profile={profile} />
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function InterviewProfilesPage() {
  return (
    <ProtectedRoute>
      <InterviewProfilesContent />
    </ProtectedRoute>
  );
}
