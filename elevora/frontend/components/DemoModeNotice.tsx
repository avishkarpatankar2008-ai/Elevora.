"use client";

import { Alert } from "@/components/Alert";
import { useAiMode } from "@/lib/aiMode";

/**
 * Shown whenever the API reports it is running the offline demo AI (no
 * provider key configured). The demo mode is deliberately never silent — the
 * candidate should always know whether a real model or a local heuristic
 * generated their questions and scores.
 *
 * Renders nothing in every other case: live provider, explicitly unconfigured
 * (where the API's own error messages explain themselves), mode not yet
 * known, or the health request failing.
 */
export function DemoModeNotice({ className = "" }: { className?: string }) {
  const aiMode = useAiMode();
  if (aiMode !== "demo") return null;

  return (
    <Alert tone="warning" title="Demo mode — offline interviewer" className={className}>
      No AI provider key is configured on this server, so questions, answer analysis and scoring
      are generated locally by a built-in offline engine instead of a real AI model. The full
      interview flow works end to end. Voice answers and spoken question audio need a provider
      key and stay unavailable — type your answers instead.
    </Alert>
  );
}
