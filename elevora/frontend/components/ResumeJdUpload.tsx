"use client";

import { ChangeEvent, DragEvent, useId, useRef, useState } from "react";
import { Alert } from "./Alert";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { Textarea } from "./Textarea";
import { ApiError, interviewsApi } from "@/lib/api";
import type { CandidateProfile, Interview, JobProfile } from "@/lib/types";

const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

/** Cheap pre-flight check so an obviously-wrong file never costs an upload. */
function validateDocument(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
    return "Only PDF and .docx files are supported.";
  }
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_DOCUMENT_BYTES) return "That file is larger than 8MB.";
  return null;
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-mute">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <li
            key={`${item}-${i}`}
            className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-xs text-ink-soft"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shows exactly what was extracted — nothing more — so a wrong or invented
 * skill is visible before it grounds a question. */
function CandidateProfilePreview({ profile }: { profile: CandidateProfile }) {
  const hasAnything = [
    profile.skills,
    profile.projects,
    profile.experience,
    profile.education,
    profile.technologies,
    profile.achievements,
  ].some((section) => section.length > 0);

  return (
    <div className="mt-3 rounded-xl border border-line bg-navy-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">Extracted from your resume</p>
        <Badge tone="blue">Grounding questions</Badge>
      </div>
      {!hasAnything && (
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          No standard resume sections were found in that file, so the interviewer will fall back to
          general questions for this category. Nothing was invented to fill the gap.
        </p>
      )}
      <div className="mt-3 space-y-3">
        <ChipList label="Skills" items={profile.skills} />
        <ChipList label="Projects" items={profile.projects} />
        <ChipList label="Experience" items={profile.experience} />
        <ChipList label="Technologies" items={profile.technologies} />
        <ChipList label="Achievements" items={profile.achievements} />
        <ChipList label="Education" items={profile.education} />
      </div>
      <p className="mt-3 text-xs leading-5 text-ink-mute">
        This is exactly what was read from the file. If something is wrong, upload a corrected
        resume before you start — the interviewer may reference it.
      </p>
    </div>
  );
}

function JobProfilePreview({ profile }: { profile: JobProfile }) {
  return (
    <div className="mt-3 rounded-xl border border-line bg-navy-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">Extracted from the job description</p>
        <Badge tone="plum">Grounding questions</Badge>
      </div>
      {(profile.role || profile.company) && (
        <p className="mt-2 text-sm text-ink-soft">
          {profile.role}
          {profile.role && profile.company ? " · " : ""}
          {profile.company}
        </p>
      )}
      <div className="mt-3 space-y-3">
        <ChipList label="Required skills" items={profile.requiredSkills} />
        <ChipList label="Preferred skills" items={profile.preferredSkills} />
        <ChipList label="Responsibilities" items={profile.responsibilities} />
      </div>
    </div>
  );
}

/** Drop target + file picker with identical validation for both paths. */
function FileDrop({
  id,
  accept,
  disabled,
  busy,
  busyLabel,
  title,
  subtitle,
  onFile,
}: {
  id: string;
  accept: string;
  disabled: boolean;
  busy: boolean;
  busyLabel: string;
  title: string;
  subtitle: string;
  onFile: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-5 py-6 text-center transition-colors duration-200 ${
        isDragging
          ? "border-blue bg-blue/[0.10]"
          : "border-line-strong bg-navy-950/30 hover:border-blue/50 hover:bg-blue/[0.05]"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
        className="sr-only"
      />
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="text-blue"
      >
        <path d="M12 16V6m0 0-4 4m4-4 4 4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      <span className="text-sm font-medium text-ink">{busy ? busyLabel : title}</span>
      <span className="text-xs text-ink-mute">{subtitle}</span>
      {busy && <span className="skeleton mt-1 h-1 w-32" />}
    </label>
  );
}

export function ResumeJdUpload({
  interview,
  onUpdated,
}: {
  interview: Interview;
  onUpdated: (interview: Interview) => void;
}) {
  const resumeId = useId();
  const jdId = useId();
  const jdTextId = useId();

  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);

  const [jdText, setJdText] = useState("");
  const [jdBusy, setJdBusy] = useState(false);
  const [jdError, setJdError] = useState<string | null>(null);
  const jdModeRef = useRef<"paste" | "file">("paste");
  const [jdMode, setJdMode] = useState<"paste" | "file">("paste");

  async function refreshInterview() {
    onUpdated(await interviewsApi.get(interview.id));
  }

  async function handleResumeFile(file: File) {
    setResumeError(null);
    const validationError = validateDocument(file);
    if (validationError) {
      setResumeError(validationError);
      return;
    }
    setResumeBusy(true);
    try {
      await interviewsApi.uploadResume(interview.id, file);
      setResumeName(file.name);
      await refreshInterview();
    } catch (err) {
      setResumeError(
        err instanceof ApiError ? err.message : "Couldn't process that resume. Try again."
      );
    } finally {
      setResumeBusy(false);
    }
  }

  async function submitJobDescription(source: { text: string } | { file: File }) {
    setJdError(null);
    if ("text" in source && !source.text.trim()) return;
    if ("file" in source) {
      const validationError = validateDocument(source.file);
      if (validationError) {
        setJdError(validationError);
        return;
      }
    }
    setJdBusy(true);
    try {
      await interviewsApi.uploadJobDescription(interview.id, source);
      if ("text" in source) setJdText("");
      await refreshInterview();
    } catch (err) {
      setJdError(
        err instanceof ApiError ? err.message : "Couldn't process that job description. Try again."
      );
    } finally {
      setJdBusy(false);
    }
  }

  function switchJdMode(mode: "paste" | "file") {
    jdModeRef.current = mode;
    setJdMode(mode);
    setJdError(null);
  }

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Resume &amp; job description</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Optional. Add either one and the interviewer grounds its questions in your real
            background instead of generic ones.
          </p>
        </div>
        <Badge tone={interview.candidateProfile ? "success" : "neutral"}>
          {interview.candidateProfile ? "Resume added" : "No resume yet"}
        </Badge>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="text-sm font-medium text-ink">Resume</h3>
          <p className="mb-2 mt-0.5 text-xs text-ink-mute">PDF or .docx, up to 8MB.</p>
          <FileDrop
            id={resumeId}
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={resumeBusy}
            busy={resumeBusy}
            busyLabel="Reading your resume…"
            title="Drop your resume here"
            subtitle="or click to choose a file"
            onFile={handleResumeFile}
          />
          {resumeName && !resumeBusy && !resumeError && (
            <p className="mt-2 text-xs text-ink-mute">Last uploaded: {resumeName}</p>
          )}
          {resumeError && (
            <Alert tone="error" className="mt-3">
              {resumeError}
            </Alert>
          )}
          {interview.candidateProfile && <CandidateProfilePreview profile={interview.candidateProfile} />}
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-ink">Job description</h3>
            <div
              role="tablist"
              aria-label="Job description input"
              className="flex rounded-lg border border-line p-0.5"
            >
              {(
                [
                  ["paste", "Paste"],
                  ["file", "Upload"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={jdMode === value}
                  onClick={() => switchJdMode(value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    jdMode === value ? "bg-blue/[0.16] text-ink" : "text-ink-mute hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {jdMode === "paste" ? (
            <div className="mt-2 flex flex-col gap-3">
              <Textarea
                id={jdTextId}
                name="jd-text"
                label="Job posting text"
                value={jdText}
                onChange={(event) => setJdText(event.target.value)}
                rows={7}
                placeholder="Paste the responsibilities, requirements and skills here…"
                disabled={jdBusy}
                hint={`${jdText.trim() ? jdText.trim().split(/\s+/).length : 0} words`}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => submitJobDescription({ text: jdText.trim() })}
                isLoading={jdBusy}
                disabled={!jdText.trim()}
                className="self-start"
              >
                Add this description
              </Button>
            </div>
          ) : (
            <div className="mt-2">
              <FileDrop
                id={jdId}
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={jdBusy}
                busy={jdBusy}
                busyLabel="Reading the job description…"
                title="Drop the job description"
                subtitle="PDF or .docx, up to 8MB"
                onFile={(file) => submitJobDescription({ file })}
              />
            </div>
          )}

          {jdError && (
            <Alert tone="error" className="mt-3">
              {jdError}
            </Alert>
          )}
          {interview.jobProfile && <JobProfilePreview profile={interview.jobProfile} />}
        </section>
      </div>
    </Card>
  );
}
