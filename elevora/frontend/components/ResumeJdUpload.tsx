"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Card } from "./Card";
import { Textarea } from "./Textarea";
import { ApiError, interviewsApi } from "@/lib/api";
import type { CandidateProfile, Interview, JobProfile } from "@/lib/types";

const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

/** Cheap pre-flight check so an obviously-wrong file never costs an upload
 * round trip. The backend enforces the same limits authoritatively. */
function validateDocument(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
    return "Only PDF and .docx files are supported.";
  }
  if (file.size === 0) {
    return "That file is empty.";
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return "That file is larger than 8MB.";
  }
  return null;
}

function ProfileList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <ul className="mt-1 list-inside list-disc text-sm text-ink-600">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** Shows exactly what was extracted — nothing more — so a wrong or invented
 * skill is visible to the candidate before it grounds a question. */
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
    <Card className="mt-3 bg-surface-muted">
      <p className="text-sm font-medium text-ink-900">Extracted from your resume</p>
      {!hasAnything && (
        <p className="mt-2 text-sm text-ink-600">
          Didn&apos;t find any of the usual resume sections in that file — the interview will fall
          back to general questions for this category.
        </p>
      )}
      <div className="mt-2 space-y-2">
        <ProfileList label="Skills" items={profile.skills} />
        <ProfileList label="Projects" items={profile.projects} />
        <ProfileList label="Experience" items={profile.experience} />
        <ProfileList label="Technologies" items={profile.technologies} />
        <ProfileList label="Achievements" items={profile.achievements} />
        <ProfileList label="Education" items={profile.education} />
      </div>
      <p className="mt-3 text-xs text-ink-400">
        This is exactly what was pulled from the file. If something here is wrong, upload a
        corrected resume before you start — the interviewer may reference it.
      </p>
    </Card>
  );
}

function JobProfilePreview({ profile }: { profile: JobProfile }) {
  return (
    <Card className="mt-3 bg-surface-muted">
      <p className="text-sm font-medium text-ink-900">Extracted from the job description</p>
      <div className="mt-2 space-y-2">
        {(profile.role || profile.company) && (
          <p className="text-sm text-ink-600">
            {profile.role}
            {profile.role && profile.company ? " at " : ""}
            {profile.company}
          </p>
        )}
        <ProfileList label="Required skills" items={profile.requiredSkills} />
        <ProfileList label="Preferred skills" items={profile.preferredSkills} />
        <ProfileList label="Responsibilities" items={profile.responsibilities} />
      </div>
    </Card>
  );
}

export function ResumeJdUpload({
  interview,
  onUpdated,
}: {
  interview: Interview;
  onUpdated: (interview: Interview) => void;
}) {
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const [jdText, setJdText] = useState("");
  const [isUploadingJd, setIsUploadingJd] = useState(false);
  const [jdError, setJdError] = useState<string | null>(null);
  const jdFileInputRef = useRef<HTMLInputElement | null>(null);

  async function refreshInterview() {
    onUpdated(await interviewsApi.get(interview.id));
  }

  async function handleResumeChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeError(null);

    const validationError = validateDocument(file);
    if (validationError) {
      setResumeError(validationError);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      return;
    }

    setIsUploadingResume(true);
    try {
      await interviewsApi.uploadResume(interview.id, file);
      setResumeName(file.name);
      await refreshInterview();
    } catch (err) {
      setResumeError(
        err instanceof ApiError ? err.message : "Couldn't process that resume. Try again."
      );
    } finally {
      setIsUploadingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  }

  async function submitJobDescription(source: { text: string } | { file: File }) {
    setJdError(null);
    setIsUploadingJd(true);
    try {
      await interviewsApi.uploadJobDescription(interview.id, source);
      if ("text" in source) setJdText("");
      await refreshInterview();
    } catch (err) {
      setJdError(
        err instanceof ApiError ? err.message : "Couldn't process that job description. Try again."
      );
    } finally {
      setIsUploadingJd(false);
      if (jdFileInputRef.current) jdFileInputRef.current.value = "";
    }
  }

  async function handleJdFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateDocument(file);
    if (validationError) {
      setJdError(validationError);
      if (jdFileInputRef.current) jdFileInputRef.current.value = "";
      return;
    }
    await submitJobDescription({ file });
  }

  return (
    <Card className="mt-6">
      <p className="text-sm font-medium text-ink-900">
        Resume &amp; job description <span className="font-normal text-ink-400">(optional)</span>
      </p>
      <p className="mt-1 text-sm text-ink-600">
        Upload either one and the interviewer grounds its questions in your actual background
        instead of generic ones. Both are optional, and you can only change them before the
        interview starts.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor="resume-file" className="text-sm font-medium text-ink-900">
          Resume (PDF or .docx)
        </label>
        <input
          ref={resumeInputRef}
          id="resume-file"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleResumeChange}
          disabled={isUploadingResume}
          className="text-sm text-ink-600 file:mr-3 file:rounded-md file:border file:border-white/12 file:bg-white/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink-900 hover:file:bg-white/[0.1] disabled:opacity-60"
        />
        <p className="text-xs text-ink-400">Up to 8MB. Text is extracted and shown below.</p>
        {isUploadingResume && (
          <p className="text-sm text-ink-600" role="status">
            Extracting your resume…
          </p>
        )}
        {resumeError && <Alert tone="error">{resumeError}</Alert>}
        {resumeName && !resumeError && !isUploadingResume && (
          <p className="text-xs text-ink-400">Last uploaded: {resumeName}</p>
        )}
        {interview.candidateProfile && <CandidateProfilePreview profile={interview.candidateProfile} />}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Textarea
          label="Job description"
          name="jd-text"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={5}
          placeholder="Paste the job posting here…"
          disabled={isUploadingJd}
          hint="Paste the text, or upload a PDF/.docx instead."
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => submitJobDescription({ text: jdText.trim() })}
            isLoading={isUploadingJd}
            disabled={!jdText.trim()}
          >
            Add pasted description
          </Button>
          <label className="text-sm text-ink-600" htmlFor="jd-file">
            or upload a file
          </label>
          <input
            ref={jdFileInputRef}
            id="jd-file"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleJdFileChange}
            disabled={isUploadingJd}
            className="text-sm text-ink-600 file:mr-3 file:rounded-md file:border file:border-white/12 file:bg-white/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink-900 hover:file:bg-white/[0.1] disabled:opacity-60"
          />
        </div>
        {jdError && <Alert tone="error">{jdError}</Alert>}
        {interview.jobProfile && <JobProfilePreview profile={interview.jobProfile} />}
      </div>
    </Card>
  );
}
