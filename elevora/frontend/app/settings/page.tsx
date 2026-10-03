"use client";

import { FormEvent, useState } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Select } from "@/components/Select";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LANGUAGE_OPTIONS, type UserDifficulty } from "@/lib/types";

const DIFFICULTY_OPTIONS: { value: UserDifficulty; label: string }[] = [
  { value: "easy", label: "Easy — warm up" },
  { value: "medium", label: "Medium — typical" },
  { value: "hard", label: "Hard — push me" },
];

function SettingsContent() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [language, setLanguage] = useState(user?.preferences.language ?? "English");
  const [defaultDifficulty, setDefaultDifficulty] = useState<UserDifficulty>(
    user?.preferences.defaultDifficulty ?? "medium"
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length === 0) {
      setError("Your name can't be empty.");
      return;
    }
    setStatus("saving");
    try {
      await updateProfile({ name: name.trim(), preferences: { language, defaultDifficulty } });
      setStatus("saved");
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof ApiError ? err.message : "Couldn't save your settings. Try again."
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Settings</h1>
      <p className="mt-2 text-sm text-ink-600">
        These defaults are used every time you configure a new interview.
      </p>

      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <Input
            label="Name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setStatus("idle");
            }}
          />
          <div>
            <p className="text-sm font-medium text-ink-900">Email</p>
            <p className="mt-1.5 text-sm text-ink-600">{user.email}</p>
            <p className="mt-1 text-xs text-ink-400">
              Email changes aren&apos;t supported yet — it identifies your account.
            </p>
          </div>
          <Select
            label="Interview language"
            name="language"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setStatus("idle");
            }}
            options={LANGUAGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            hint="Questions and feedback are written in this language."
          />
          <Select
            label="Default difficulty"
            name="defaultDifficulty"
            value={defaultDifficulty}
            onChange={(e) => {
              setDefaultDifficulty(e.target.value as UserDifficulty);
              setStatus("idle");
            }}
            options={DIFFICULTY_OPTIONS}
            hint="Every new interview starts here; you can still change it per interview."
          />

          {error && <Alert tone="error">{error}</Alert>}
          {status === "saved" && !error && <Alert tone="success">Settings saved.</Alert>}

          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={status === "saving"}>
              Save changes
            </Button>
            <span className="text-xs text-ink-400">
              Account created {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <h2 className="text-sm font-medium text-ink-900">Your data</h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          Interviews, transcripts, uploads and reports are stored in your account and are visible
          only to you. Camera frames never leave your browser: webcam analysis runs locally and
          only aggregate rates (for example, &ldquo;face visible in 92% of samples&rdquo;) are
          saved with your interview.
        </p>
      </Card>
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
