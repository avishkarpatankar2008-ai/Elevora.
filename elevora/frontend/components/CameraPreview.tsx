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
  className?: string;
}

const STATUS_LABEL: Record<CameraStatus, string> = {
  idle: "Camera off",
  requesting: "Requesting access…",
  active: "Camera active",
  denied: "Camera blocked",
  unavailable: "Not supported",
  disconnected: "Disconnected",
};

/**
 * Self-view camera panel.
 *
 * Privacy invariant: frames stay in this browser tab. Only aggregate rates
 * computed by the caller are ever sent to the API.
 */
export function CameraPreview({
  enabled,
  onStatusChange,
  onFrameSample,
  sampleIntervalMs = 1000,
  className = "",
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

  const statusColour =
    status === "active"
      ? "bg-success"
      : status === "requesting"
        ? "bg-blue animate-pulse-soft"
        : "bg-ink-mute/60";

  return (
    <div
      className={`overflow-hidden rounded-xl border border-line bg-navy-950/60 backdrop-blur-md ${className}`}
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${statusColour}`} />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
            {STATUS_LABEL[status]}
          </span>
        </div>
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          className="text-ink-mute"
        >
          <path d="M15 10v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" />
          <path d="m17 9 4-2v10l-4-2" />
        </svg>
      </div>

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
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-5 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white/[0.04] text-ink-mute">
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M15 10v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" />
                <path d="m17 9 4-2v10l-4-2" />
                <path d="m3 3 18 18" />
              </svg>
            </span>
            <p className="text-sm text-ink-soft">{STATUS_LABEL[status]}</p>
            {status === "denied" && (
              <p className="max-w-[15rem] text-xs leading-5 text-ink-mute">
                Allow camera access in your browser&apos;s site settings, then reconnect. The
                interview works without it — your report will just show Webcam as not available.
              </p>
            )}
            {status === "unavailable" && (
              <p className="max-w-[15rem] text-xs leading-5 text-ink-mute">
                This browser can&apos;t show a camera preview. Voice and text answers are unaffected.
              </p>
            )}
            {status === "idle" && (
              <p className="max-w-[15rem] text-xs leading-5 text-ink-mute">
                Turn the camera on to have webcam presence measured on-device.
              </p>
            )}
          </div>
        )}
      </div>

      {(status === "denied" || status === "disconnected") && (
        <button
          type="button"
          onClick={() => void startCamera()}
          className="w-full border-t border-line py-2 text-xs font-medium text-blue transition-colors hover:bg-blue/[0.08]"
        >
          Reconnect camera
        </button>
      )}
    </div>
  );
}
