"use client";

import { useEffect } from "react";
import { Alert } from "@/components/Alert";
import { Button, ButtonLink } from "@/components/Button";

/**
 * Route-level error boundary. Without it an unexpected render error falls back
 * to Next.js's default screen (a stack trace in development, a bare
 * "Application error" in production).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the client console useful for debugging without ever showing
    // internals to the user.
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-20 sm:px-6">
      <p className="eyebrow">Unexpected error</p>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Something went wrong on this page
      </h1>
      <Alert tone="error">
        The page hit an unexpected error. Your interviews, transcripts and reports are safe — nothing
        was lost.
      </Alert>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/dashboard" variant="secondary">Back to dashboard</ButtonLink>
      </div>
      {error.digest && (
        <p className="font-mono text-xs text-ink-mute">Reference: {error.digest}</p>
      )}
    </div>
  );
}
