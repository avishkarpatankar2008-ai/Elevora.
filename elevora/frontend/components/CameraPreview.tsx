"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "disconnected";

interface CameraPreviewProps {
  enabled: boolean;
  onStatusChange?: (status: CameraStatus) => void;
  /** Fired roughly once per second while the camera is active — the hook point
   * for client-side analytics (see lib/webcamAnalytics.ts). Not used at all if
   * omitted; CameraPreview itself has no analytics logic. */
  onFrameSample?: (video: HTMLVideoElement) => void;
  sampleIntervalMs?: number;
  /** Shown under the preview; describe what is (and isn't) done with the feed. */
  footnote?: string;
}

/**
 * Self-view camera preview for the interview room.
 *
 * UNVERIFIED — same caveat as VoiceControls (Phase 3): no browser or camera
 * was available while building this, so nobody has confirmed a stream
 * actually renders. Test in Chrome on localhost first.
 *
 * Scope note: this is purely a local self-view. Nothing is recorded or
 * uploaded — no video ever leaves the browser. If `onFrameSample` is
 * provided (Phase 7), the caller can run analysis (e.g. MediaPipe) on
 * individual frames locally; this component still never transmits video
 * itself, only whatever aggregate the caller chooses to compute and send.
 */
export function CameraPreview({
  enabled,
  onStatusChange,
  onFrameSample,
  sampleIntervalMs = 1000,
  footnote = "Self-view only — frames never leave your browser.",
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");

  const updateStatus = useCallback(
    (next: CameraStatus) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange]
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      updateStatus("unavailable");
      return;
    }
    updateStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => updateStatus("disconnected");
      });
      updateStatus("active");
    } catch {
      updateStatus("denied");
    }
  }, [updateStatus]);

  useEffect(() => {
    if (enabled) {
      void startCamera();
    } else {
      stopCamera();
      updateStatus("idle");
    }
    return () => stopCamera();
  }, [enabled, startCamera, stopCamera, updateStatus]);

  useEffect(() => {
    if (status !== "active" || !onFrameSample) return;
    const interval = setInterval(() => {
      if (videoRef.current) onFrameSample(videoRef.current);
    }, sampleIntervalMs);
    return () => clearInterval(interval);
  }, [status, onFrameSample, sampleIntervalMs]);

  const statusMessage: Record<Exclude<CameraStatus, "active">, string> = {
    idle: "Camera off",
    requesting: "Requesting camera access…",
    denied: "Camera access denied — check your browser's permission settings.",
    unavailable: "This browser doesn't support camera preview.",
    disconnected: "Camera disconnected.",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-navy-950">
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Camera self-view"
          className={`h-full w-full object-cover ${status === "active" ? "" : "hidden"}`}
        />
        {status !== "active" && (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-ink-600">
            {statusMessage[status]}
          </div>
        )}
      </div>
      {(status === "denied" || status === "disconnected") && (
        <button
          type="button"
          onClick={startCamera}
          className="w-full border-t border-white/10 py-2 text-sm font-medium text-ink-900 hover:bg-white/5"
        >
          Reconnect camera
        </button>
      )}
      <p className="border-t border-white/[0.06] px-3 py-2 text-[11px] leading-4 text-ink-400">
        {footnote}
      </p>
    </div>
  );
}
