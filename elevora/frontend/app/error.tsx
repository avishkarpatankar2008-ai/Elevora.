"use client";

import { useEffect } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";

/**
 * Route-level error boundary. Without it, an unexpected render error shows
 * Next.js's default screen with a stack trace in development and a bare
 * "Application error" in production.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the client console useful for debugging without showing users
    // internals.
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-20 sm:px-6">
      <h1 className="text-xl font-semibold text-ink-900">Something went wrong on this page</h1>
      <Alert tone="error">
        The page hit an unexpected error. Your interviews and reports are safe — nothing was lost.
      </Alert>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <a href="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </a>
      </div>
      {error.digest && <p className="text-xs text-ink-400">Reference: {error.digest}</p>}
    </div>
  );
}
