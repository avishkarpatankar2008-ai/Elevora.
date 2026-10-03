"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/Alert";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { CameraPreview, type CameraStatus } from "@/components/CameraPreview";
import { Input } from "@/components/Input";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Select } from "@/components/Select";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LANGUAGE_OPTIONS, type UserDifficulty, type UserPreferences } from "@/lib/types";

const DIFFICULTY_OPTIONS: { value: UserDifficulty; label: string }[] = [
  { value: "easy", label: "Easy — warm up" },
  { value: "medium", label: "Medium — typical interview" },
  { value: "hard", label: "Hard — push me" },
];

type SectionId = "account" | "interview" | "ai" | "devices" | "privacy" | "appearance";

const SECTIONS: { id: SectionId; label: string; description: string }[] = [
  { id: "account", label: "Account", description: "Name and sign-in identity" },
  { id: "interview", label: "Interview preferences", description: "Defaults for new sessions" },
  { id: "ai", label: "AI preferences", description: "How the interviewer behaves" },
  { id: "devices", label: "Voice & camera", description: "Microphone and self-view" },
  { id: "privacy", label: "Privacy", description: "What is stored and what isn't" },
  { id: "appearance", label: "Appearance", description: "Motion and display" },
];

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-navy-950/30 p-4 transition-colors ${
        disabled ? "cursor-not-allowed opacity-70" : "hover:border-line-strong"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong bg-navy-950 accent-[#83A6CE]"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-ink-mute">{hint}</span>
      </span>
    </label>
  );
}

function DeviceCheck() {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [micState, setMicState] = useState<"unknown" | "ready" | "missing">("unknown");

  useEffect(() => {
    setMicState(
      typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices?.getUserMedia === "function"
        ? "ready"
        : "missing"
    );
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              micState === "ready" ? "bg-success" : "bg-ink-mute"
            }`}
          />
          <span className="text-ink-soft">
            {micState === "unknown"
              ? "Checking microphone support…"
              : micState === "ready"
                ? "Microphone available in this browser"
                : "No microphone API in this browser"}
          </span>
        </span>
        <Button variant="secondary" size="sm" onClick={() => setCameraEnabled((on) => !on)}>
          {cameraEnabled ? "Stop camera test" : "Test camera"}
        </Button>
      </div>

      {cameraEnabled && (
        <div className="max-w-sm">
          <CameraPreview enabled={cameraEnabled} onStatusChange={setCameraStatus} />
          <p className="mt-2 text-xs leading-5 text-ink-mute">
            {cameraStatus === "active"
              ? "Camera working. Frames in this test never leave your browser."
              : "Waiting for camera permission — allow it in the browser prompt."}
          </p>
        </div>
      )}

      <p className="text-xs leading-5 text-ink-mute">
        If the browser has blocked a device, change it in your browser&apos;s site settings for this
        page, then reload. ELEVORA never stores raw audio or video.
      </p>
    </div>
  );
}

function SettingsContent() {
  const { user, updateProfile } = useAuth();
  const [section, setSection] = useState<SectionId>("account");

  const [name, setName] = useState(user?.name ?? "");
  const [language, setLanguage] = useState(user?.preferences.language ?? "English");
  const [defaultDifficulty, setDefaultDifficulty] = useState<UserDifficulty>(
    user?.preferences.defaultDifficulty ?? "medium"
  );
  const [autoPlayQuestion, setAutoPlayQuestion] = useState(
    user?.preferences.autoPlayQuestion ?? false
  );
  const [cameraEnabledByDefault, setCameraEnabledByDefault] = useState(
    user?.preferences.cameraEnabledByDefault ?? true
  );

  const [saving, setSaving] = useState<SectionId | null>(null);
  const [savedSection, setSavedSection] = useState<SectionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [motionReduced, setMotionReduced] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setMotionReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  if (!user) return null;

  async function save(sectionId: SectionId, payload: Parameters<typeof updateProfile>[0], successMessage?: string) {
    setError(null);
    setSaving(sectionId);
    setSavedSection(null);
    try {
      await updateProfile(payload);
      setSavedSection(sectionId);
      void successMessage;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't save your settings. Check your connection and try again."
      );
    } finally {
      setSaving(null);
    }
  }

  function savePreferences(partial: Partial<UserPreferences>, sectionId: SectionId) {
    return save(sectionId, { preferences: partial });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Your account and session defaults
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Everything here is stored with your account and applied the next time you practise.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
            {SECTIONS.map((item) => {
              const active = section === item.id;
              return (
                <li key={item.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => {
                      setSection(item.id);
                      setError(null);
                      setSavedSection(null);
                    }}
                    className={`w-full whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors lg:whitespace-normal ${
                      active
                        ? "bg-blue/[0.12] font-medium text-ink ring-1 ring-blue/40"
                        : "text-ink-soft hover:bg-white/[0.04] hover:text-ink"
                    }`}
                  >
                    {item.label}
                    <span className="mt-0.5 hidden text-xs text-ink-mute lg:block">
                      {item.description}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          {error && <Alert tone="error">{error}</Alert>}

          {section === "account" && (
            <Card>
              <h2 className="text-base font-semibold text-ink">Account</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Your name appears in the dashboard greeting. Your email is your sign-in identity and
                can&apos;t be changed here.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-ink-soft">Email</span>
                  <p className="rounded-lg border border-line bg-navy-950/40 px-3.5 py-2.5 text-sm text-ink-soft">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => save("account", { name: name.trim() })}
                  isLoading={saving === "account"}
                  disabled={!name.trim() || name.trim() === user.name}
                >
                  Save name
                </Button>
                {savedSection === "account" && (
                  <span role="status" className="text-xs text-success">
                    Saved.
                  </span>
                )}
              </div>
              <p className="mt-4 text-xs text-ink-mute">
                Member since{" "}
                {new Date(user.createdAt).toLocaleDateString(undefined, {
                  dateStyle: "long",
                })}
                .
              </p>
            </Card>
          )}

          {section === "interview" && (
            <Card>
              <h2 className="text-base font-semibold text-ink">Interview preferences</h2>
              <p className="mt-1 text-sm text-ink-soft">
                These pre-select the matching options when you configure a new interview. You can
                still change them per session.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Select
                  label="Default language"
                  name="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  options={LANGUAGE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
                <Select
                  label="Default difficulty"
                  name="defaultDifficulty"
                  value={defaultDifficulty}
                  onChange={(event) => setDefaultDifficulty(event.target.value as UserDifficulty)}
                  options={DIFFICULTY_OPTIONS}
                />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => savePreferences({ language, defaultDifficulty }, "interview")}
                  isLoading={saving === "interview"}
                >
                  Save preferences
                </Button>
                {savedSection === "interview" && (
                  <span role="status" className="text-xs text-success">
                    Saved.
                  </span>
                )}
              </div>
            </Card>
          )}

          {section === "ai" && (
            <Card>
              <h2 className="text-base font-semibold text-ink">AI preferences</h2>
              <p className="mt-1 text-sm text-ink-soft">
                The interviewer is one adaptive engine. These control how it presents itself, not how
                it scores — the rubric is identical for every candidate.
              </p>
              <div className="mt-5 space-y-3">
                <Toggle
                  label="Speak each question aloud"
                  hint="Plays the interviewer's voice as soon as a new question arrives. Turn this off if you'd rather read in silence."
                  checked={autoPlayQuestion}
                  onChange={(next) => {
                    setAutoPlayQuestion(next);
                    void savePreferences({ autoPlayQuestion: next }, "ai");
                  }}
                  disabled={saving === "ai"}
                />
              </div>
              <div className="mt-5 flex items-center gap-3">
                {saving === "ai" && <span className="text-xs text-ink-mute">Saving…</span>}
                {savedSection === "ai" && (
                  <span role="status" className="text-xs text-success">
                    Saved.
                  </span>
                )}
              </div>
              <p className="mt-4 text-xs leading-5 text-ink-mute">
                Evaluation, follow-up logic and report generation aren&apos;t configurable here
                because changing them would make scores incomparable between sessions.
              </p>
            </Card>
          )}

          {section === "devices" && (
            <Card>
              <h2 className="text-base font-semibold text-ink">Voice &amp; camera</h2>
              <p className="mt-1 text-sm text-ink-soft">
                The interview room can answer by voice and score camera presence. Both are optional —
                text answers are scored on the same rubric.
              </p>
              <div className="mt-5 space-y-3">
                <Toggle
                  label="Start sessions with the camera on"
                  hint="Turns on your self-view as the room opens. You can switch it off at any time during a session."
                  checked={cameraEnabledByDefault}
                  onChange={(next) => {
                    setCameraEnabledByDefault(next);
                    void savePreferences({ cameraEnabledByDefault: next }, "devices");
                  }}
                  disabled={saving === "devices"}
                />
              </div>
              <div className="mt-5 flex items-center gap-3">
                {saving === "devices" && <span className="text-xs text-ink-mute">Saving…</span>}
                {savedSection === "devices" && (
                  <span role="status" className="text-xs text-success">
                    Saved.
                  </span>
                )}
              </div>
              <div className="mt-6 border-t border-line pt-5">
                <h3 className="text-sm font-medium text-ink">Check your devices</h3>
                <p className="mt-1 text-xs text-ink-mute">
                  A quick local test — nothing from this check is uploaded or stored.
                </p>
                <div className="mt-4">
                  <DeviceCheck />
                </div>
              </div>
            </Card>
          )}

          {section === "privacy" && (
            <Card>
              <h2 className="text-base font-semibold text-ink">Privacy</h2>
              <p className="mt-1 text-sm text-ink-soft">
                What happens to your data, stated plainly.
              </p>
              <dl className="mt-5 space-y-4">
                {[
                  [
                    "Camera frames",
                    "Analysed in your browser while the camera is on. Raw frames never leave the page — only aggregate rates (face visible, looking away, movement) are stored with the interview.",
                  ],
                  [
                    "Voice answers",
                    "The recording is sent once to be transcribed and then discarded — raw audio is never persisted. Only the transcript and the speech metrics measured from it are saved with the interview.",
                  ],
                  [
                    "Transcripts and reports",
                    "Stored in your account so you can review them. Generating a report sends the transcript to the AI evaluator — it never happens automatically.",
                  ],
                  [
                    "Deleting data",
                    "Deleting an interview removes its transcript and any generated report. Deletion is permanent and available from the interview room and your history.",
                  ],
                ].map(([term, body]) => (
                  <div key={term}>
                    <dt className="text-sm font-medium text-ink">{term}</dt>
                    <dd className="mt-1 text-sm leading-6 text-ink-soft">{body}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonLink href="/dashboard" variant="secondary" size="sm">
                    Review my interviews
                  </ButtonLink>
              </div>
            </Card>
          )}

          {section === "appearance" && (
            <Card>
              <h2 className="text-base font-semibold text-ink">Appearance</h2>
              <p className="mt-1 text-sm text-ink-soft">
                ELEVORA is designed dark-first: deep navy surfaces keep long sessions easy on the
                eyes, and every colour is part of one palette.
              </p>
              <div className="mt-5 rounded-xl border border-line bg-navy-950/40 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-ink">Reduced motion</span>
                  {motionReduced === null ? (
                    <Badge tone="neutral">Checking…</Badge>
                  ) : (
                    <Badge tone={motionReduced ? "success" : "neutral"}>
                      {motionReduced ? "Detected — animations minimised" : "Not set at the OS level"}
                    </Badge>
                  )}
                </div>
                <p className="mt-3 text-xs leading-5 text-ink-mute">
                  ELEVORA follows your operating system&apos;s &ldquo;reduce motion&rdquo; setting
                  automatically and turns off transitions, the score-ring reveal and pulsing
                  indicators when it is on. Change it in your OS accessibility settings — no
                  in-app override is offered, so the setting can&apos;t drift out of sync.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
