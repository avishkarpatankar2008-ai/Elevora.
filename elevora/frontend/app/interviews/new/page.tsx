"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/Alert";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StepChoice } from "@/components/interview/StepChoice";
import { StepProgressBar, StepRail, type StepDefinition } from "@/components/Stepper";
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

/**
 * Guided setup wizard. Each step maps onto a field the create endpoint already
 * accepts — no new API surface, no client-side reinterpretation of the config.
 * The interview is created once, on the final step, so abandoning the wizard
 * never leaves a half-configured session in the database.
 */

const STEPS: StepDefinition[] = [
  { title: "Profile", description: "Saved setup or start fresh" },
  { title: "Target", description: "Role, company or exam" },
  { title: "Difficulty", description: "Depth and pressure" },
  { title: "Language", description: "Questions and report" },
  { title: "Session", description: "Length and behaviour" },
  { title: "Start", description: "Review and begin" },
];

const DIFFICULTIES: { value: InterviewDifficulty; label: string; hint: string }[] = [
  { value: "easy", label: "Easy", hint: "Foundational questions, gentle follow-ups" },
  { value: "medium", label: "Medium", hint: "Typical interview depth and pacing" },
  { value: "hard", label: "Hard", hint: "Deep probes and challenging follow-ups" },
];

const DURATIONS = [10, 15, 20, 30, 45, 60];

const ROLE_CATEGORIES: InterviewCategory[] = [
  "campus-placement",
  "software-engineer",
  "mechanical-engineer",
];
const EXAM_CATEGORIES: InterviewCategory[] = ["upsc", "mpsc", "ssc", "banking"];

interface DraftState {
  profileId: string | null;
  category: InterviewCategory;
  role: string;
  company: string;
  exam: string;
  industry: string;
  experienceLevel: string;
  difficulty: InterviewDifficulty;
  language: string;
  durationMinutes: number;
}

const INITIAL_DRAFT: DraftState = {
  profileId: null,
  category: "software-engineer",
  role: "",
  company: "",
  exam: "",
  industry: "",
  experienceLevel: "entry-level",
  difficulty: "medium",
  language: "English",
  durationMinutes: 20,
};

function Wizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [maxReachable, setMaxReachable] = useState(1);
  const [draft, setDraft] = useState<DraftState>(INITIAL_DRAFT);
  const [profiles, setProfiles] = useState<InterviewProfile[] | null>(null);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProfile = useMemo(
    () => profiles?.find((profile) => profile.id === draft.profileId) ?? null,
    [profiles, draft.profileId]
  );

  // Load saved profiles once; failure degrades to "configure from scratch".
  useEffect(() => {
    let cancelled = false;
    profilesApi
      .list()
      .then((list) => {
        if (!cancelled) setProfiles(list);
      })
      .catch(() => {
        if (cancelled) return;
        setProfiles([]);
        setProfilesError(
          "Saved profiles couldn't be loaded. You can still configure this interview from scratch."
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Seed language/difficulty from the user's saved preferences (once).
  useEffect(() => {
    if (!user) return;
    setDraft((previous) => ({
      ...previous,
      language: user.preferences.language || previous.language,
      difficulty: user.preferences.defaultDifficulty || previous.difficulty,
    }));
  }, [user]);

  function pickProfile(profile: InterviewProfile) {
    setDraft((previous) => ({
      ...previous,
      profileId: profile.id,
      category: (profile.category as InterviewCategory) ?? previous.category,
      difficulty:
        profile.difficulty === "adaptive" ? previous.difficulty : (profile.difficulty as InterviewDifficulty),
    }));
    setError(null);
  }

  function clearProfile() {
    setDraft((previous) => ({ ...previous, profileId: null }));
    setError(null);
  }

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function goTo(next: number) {
    setStep(next);
    setMaxReachable((previous) => Math.max(previous, next));
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateTarget(): string | null {
    if (draft.profileId) return null; // the profile already defines the target
    if (ROLE_CATEGORIES.includes(draft.category) && !draft.role.trim()) {
      return "Add the role you're preparing for — the interviewer needs it to pick the right questions.";
    }
    if (draft.category === "company-specific" && !draft.company.trim()) {
      return "Add the company you're preparing for, or choose a different category.";
    }
    if (EXAM_CATEGORIES.includes(draft.category) && !draft.exam.trim()) {
      return "Add the exam you're preparing for, or choose a different category.";
    }
    return null;
  }

  function next() {
    if (step === 1) {
      const targetError = validateTarget();
      if (targetError) {
        setError(targetError);
        return;
      }
    }
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  function back() {
    if (step > 0) goTo(step - 1);
  }

  async function begin() {
    setError(null);
    setIsSubmitting(true);

    const payload: InterviewConfig = {
      ...(draft.profileId ? { profileId: draft.profileId } : { category: draft.category }),
      role: draft.role.trim() || undefined,
      company: draft.company.trim() || undefined,
      exam: draft.exam.trim() || undefined,
      industry: draft.industry.trim() || undefined,
      experienceLevel: draft.experienceLevel,
      difficulty: draft.difficulty,
      language: draft.language,
      durationMinutes: draft.durationMinutes,
    };

    try {
      const interview = await interviewsApi.create(payload);
      router.push(`/interviews/${interview.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't create the interview. Check your connection and try again."
      );
      setIsSubmitting(false);
    }
  }

  const categoryLabel =
    INTERVIEW_CATEGORIES.find((category) => category.value === draft.category)?.label ??
    draft.category;
  const languageLabel =
    LANGUAGE_OPTIONS.find((option) => option.value === draft.language)?.label ?? draft.language;
  const experienceLabel =
    EXPERIENCE_LEVELS.find((level) => level.value === draft.experienceLevel)?.label ??
    draft.experienceLevel;
  const targetLabel =
    draft.profileId && selectedProfile
      ? selectedProfile.name
      : [draft.role, draft.company, draft.exam, draft.industry].filter(Boolean).join(" · ") ||
        categoryLabel;

  const showRoleField = !draft.profileId && ROLE_CATEGORIES.includes(draft.category);
  const showCompanyField = !draft.profileId && draft.category === "company-specific";
  const showExamField = !draft.profileId && EXAM_CATEGORIES.includes(draft.category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6">
        <p className="eyebrow">New interview</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Configure your session
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Six short steps. Nothing is saved until you press start on the final step — you can leave
          at any point with no trace.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="lg:pt-2">
          <StepProgressBar steps={STEPS} current={step} />
          <StepRail steps={STEPS} current={step} maxReachable={maxReachable} onSelect={goTo} />
        </div>

        <Card className="min-h-[440px]">
          {step === 0 && (
            <div>
              <StepChoice
                legend="Start from a saved profile?"
                description="Saved profiles fix the subjects, question types and pacing. Everything stays editable — the saved profile itself is never modified."
                columns={1}
                value={draft.profileId ?? "scratch"}
                onChange={(value) => {
                  if (value === "scratch") {
                    clearProfile();
                    return;
                  }
                  const profile = profiles?.find((candidate) => candidate.id === value);
                  if (profile) pickProfile(profile);
                }}
                isLoading={profiles === null && !profilesError}
                options={[
                  {
                    value: "scratch",
                    label: "Configure from scratch",
                    hint: "Choose a category and set everything yourself",
                  },
                  ...(profiles ?? []).map((profile) => ({
                    value: profile.id,
                    label: profile.name,
                    hint: [
                      profile.difficulty === "adaptive" ? "Adaptive difficulty" : profile.difficulty,
                      `${profile.maxQuestions} questions`,
                      profile.followUpEnabled ? "follow-ups" : "no follow-ups",
                    ].join(" · "),
                    meta: (
                      <span className="flex flex-wrap gap-1.5">
                        {profile.subjects.slice(0, 4).map((subject) => (
                          <Badge key={subject} tone="neutral">
                            {subject}
                          </Badge>
                        ))}
                      </span>
                    ),
                  })),
                ]}
              />

              {profilesError && (
                <Alert tone="warning" className="mt-4">
                  {profilesError}
                </Alert>
              )}

              <p className="mt-5 text-xs leading-5 text-ink-mute">
                Need something more specific?{" "}
                <Link href="/interview-profiles" className="text-blue hover:text-blue-soft">
                  Build a custom interview profile
                </Link>
                .
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-7">
              {draft.profileId && selectedProfile ? (
                <div className="rounded-xl border border-line bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-ink">{selectedProfile.name}</p>
                      <p className="mt-1 text-xs leading-5 text-ink-mute">
                        {selectedProfile.description}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearProfile} className="shrink-0">
                      Change
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-ink-mute">
                    Target and subjects come from this profile. Add the details below if you want
                    them reflected in the questions.
                  </p>
                </div>
              ) : (
                <StepChoice
                  legend="What are you preparing for?"
                  description="The category selects the question bank the interviewer works from."
                  columns={2}
                  value={draft.category}
                  onChange={(value) => update("category", value)}
                  options={INTERVIEW_CATEGORIES.map((category) => ({
                    value: category.value,
                    label: category.label,
                  }))}
                />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {(showRoleField || draft.profileId) && (
                  <Input
                    label={showRoleField ? "Role" : "Role (optional)"}
                    name="role"
                    value={draft.role}
                    onChange={(event) => update("role", event.target.value)}
                    placeholder="Backend Engineer"
                  />
                )}
                {(showCompanyField || draft.profileId) && (
                  <Input
                    label={showCompanyField ? "Company" : "Company (optional)"}
                    name="company"
                    value={draft.company}
                    onChange={(event) => update("company", event.target.value)}
                    placeholder="Acme Corp"
                  />
                )}
                {showExamField && (
                  <Input
                    label="Exam"
                    name="exam"
                    value={draft.exam}
                    onChange={(event) => update("exam", event.target.value)}
                    placeholder="UPSC Civil Services"
                  />
                )}
                <Input
                  label="Industry (optional)"
                  name="industry"
                  value={draft.industry}
                  onChange={(event) => update("industry", event.target.value)}
                  placeholder="Technology"
                />
              </div>

              <StepChoice
                legend="Experience level"
                description="Sets the seniority the interviewer assumes when it probes your answers."
                columns={2}
                value={draft.experienceLevel}
                onChange={(value) => update("experienceLevel", value)}
                options={EXPERIENCE_LEVELS.map((level) => ({
                  value: level.value,
                  label: level.label,
                }))}
              />
            </div>
          )}

          {step === 2 && (
            <StepChoice
              legend="How difficult should the questions be?"
              description="Difficulty changes depth and follow-up pressure, not the scoring scale — every answer is judged on the same rubric."
              columns={3}
              value={draft.difficulty}
              onChange={(value) => update("difficulty", value)}
              options={DIFFICULTIES}
            />
          )}

          {step === 3 && (
            <StepChoice
              legend="Which language should the session run in?"
              description="Questions, the transcript and the final report all stay in this language."
              columns={3}
              value={draft.language}
              onChange={(value) => update("language", value)}
              options={LANGUAGE_OPTIONS.map((language) => ({
                value: language.value,
                label: language.label,
              }))}
            />
          )}

          {step === 4 && (
            <div className="space-y-7">
              <fieldset>
                <legend className="text-lg font-semibold tracking-tight text-ink">
                  How long should the session be?
                </legend>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
                  Used to size the session (roughly one question every three minutes). The
                  interview ends by question count, not by a clock, and you can end it early at any
                  time.
                </p>
                <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Duration">
                  {DURATIONS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      role="radio"
                      aria-checked={draft.durationMinutes === minutes}
                      onClick={() => update("durationMinutes", minutes)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-spring ${
                        draft.durationMinutes === minutes
                          ? "border-blue/60 bg-blue/[0.12] text-ink shadow-glow-blue"
                          : "border-line text-ink-soft hover:border-line-strong hover:text-ink"
                      }`}
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="rounded-xl border border-line bg-white/[0.02] p-4">
                <p className="text-sm font-medium text-ink">Session behaviour</p>
                {selectedProfile ? (
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-ink-soft">
                    <li>
                      <span className="text-ink-mute">Follow-up questions:</span>{" "}
                      {selectedProfile.followUpEnabled ? "enabled by this profile" : "disabled by this profile"}
                    </li>
                    <li>
                      <span className="text-ink-mute">Resume grounding:</span>{" "}
                      {selectedProfile.resumeGrounding ? "on — upload a resume in the room" : "off"}
                    </li>
                    <li>
                      <span className="text-ink-mute">Job description grounding:</span>{" "}
                      {selectedProfile.jdGrounding ? "on — upload the posting in the room" : "off"}
                    </li>
                    <li>
                      <span className="text-ink-mute">Question limit:</span>{" "}
                      {selectedProfile.maxQuestions} questions
                    </li>
                  </ul>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-ink-soft">
                    Behaviour follows the {categoryLabel} bank: follow-ups are allowed and resume
                    grounding activates as soon as you upload a resume in the room.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">Review and start</h2>
              <p className="mt-2 text-sm text-ink-soft">
                The interviewer asks your first question as soon as the room loads.
              </p>

              <dl className="mt-5 divide-y divide-line-soft overflow-hidden rounded-xl border border-line">
                {[
                  ["Setup", selectedProfile ? `Profile — ${selectedProfile.name}` : `Category — ${categoryLabel}`],
                  ["Target", targetLabel],
                  ["Experience", experienceLabel],
                  ["Difficulty", DIFFICULTIES.find((d) => d.value === draft.difficulty)?.label ?? draft.difficulty],
                  ["Language", languageLabel],
                  ["Length", `${draft.durationMinutes} minutes`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-sm text-ink-mute">{label}</dt>
                    <dd className="text-right text-sm font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 text-xs leading-5 text-ink-mute">
                Signed in as {user?.email}. Camera frames are analysed in your browser and never
                uploaded — only your transcript and measurements leave the page.
              </p>
            </div>
          )}

          {error && (
            <Alert tone="error" className="mt-6">
              {error}
            </Alert>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 0} className="sm:w-auto">
              Back
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="hidden text-xs text-ink-mute sm:block">
                Step {step + 1} of {STEPS.length}
              </span>
              {step < STEPS.length - 1 ? (
                <Button onClick={next}>Continue</Button>
              ) : (
                <Button size="lg" onClick={begin} isLoading={isSubmitting}>
                  Start interview
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function NewInterviewPage() {
  return (
    <ProtectedRoute>
      <Wizard />
    </ProtectedRoute>
  );
}
