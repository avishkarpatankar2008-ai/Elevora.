import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

/**
 * Client-side face-visibility / movement tracking for the interview room.
 *
 * Privacy invariant: video frames are analysed in this browser tab and are
 * never uploaded. Only the aggregate rates below are sent to the API.
 *
 * Honesty invariant: if the model can't load (offline, blocked CDN, no WebGL),
 * the tracker reports `status === "failed"` and `getAggregate()` returns null,
 * so the report shows "Not available" for webcam instead of a made-up number.
 *
 * Runtime sources (both self-hosted or configurable, nothing is hard-wired to
 * a CDN we don't control):
 *   - WASM runtime: /mediapipe/wasm, copied from the pinned
 *     @mediapipe/tasks-vision package by scripts/copy-mediapipe-wasm.mjs.
 *   - Model file: NEXT_PUBLIC_FACE_LANDMARKER_MODEL_URL, defaulting to the
 *     official Google-hosted face_landmarker.task. Self-host it (see
 *     .env.local.example) for offline or air-gapped deployments.
 */

const WASM_BASE_URL = "/mediapipe/wasm";

const DEFAULT_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const MODEL_URL = process.env.NEXT_PUBLIC_FACE_LANDMARKER_MODEL_URL || DEFAULT_MODEL_URL;

// A face turned directly at the camera has a forward-alignment (see below)
// close to 1. Below this threshold counts as "looking away" for one sample.
const LOOKING_AWAY_THRESHOLD = 0.85;

// Frame-to-frame landmark centroid displacement (in normalized 0-1
// coordinates) above this counts as "movement" for one sample. Deliberately
// coarse: this measures "the candidate moved noticeably between samples",
// not fidgeting micro-motion.
const MOVEMENT_THRESHOLD = 0.015;

/** Minimum samples before an aggregate is considered meaningful. */
const MIN_SAMPLES = 3;

export type TrackerStatus = "idle" | "initializing" | "ready" | "failed";

/**
 * Approximates how directly the face points at the camera using the
 * (2,2) entry of the 4x4 facial transformation matrix MediaPipe provides.
 *
 * That entry sits on the matrix diagonal, so it has the same flattened array
 * index (10) whether the matrix is row-major or column-major — the two
 * conventions only disagree on off-diagonal entries. For a rotation matrix
 * representing "how the canonical face is rotated to match the detected face",
 * that diagonal entry approximates the cosine of the angle between the face's
 * forward direction and the camera's viewing axis: close to 1 facing the
 * camera, dropping as the head turns in any direction (yaw, pitch, or both).
 * Using this magnitude — rather than recovering a signed yaw/pitch/roll —
 * avoids depending on the exact axis-sign conventions, at the cost of not
 * being able to say *which way* the candidate looked.
 *
 * Not calibrated against real recordings; treat "looking away" as a coarse
 * signal, which is why the UI and report label it as an estimate.
 */
export function estimateForwardAlignment(result: FaceLandmarkerResult): number | null {
  const matrix = result.facialTransformationMatrixes?.[0];
  if (!matrix || matrix.data.length < 16) return null;
  return matrix.data[10];
}

export function landmarkCentroid(result: FaceLandmarkerResult): { x: number; y: number } | null {
  const landmarks = result.faceLandmarks?.[0];
  if (!landmarks || landmarks.length === 0) return null;
  let x = 0;
  let y = 0;
  for (const point of landmarks) {
    x += point.x;
    y += point.y;
  }
  return { x: x / landmarks.length, y: y / landmarks.length };
}

export interface WebcamAnalyticsAggregate {
  faceVisibleRate: number;
  lookingAwayRate: number;
  movementRate: number;
  sampledFrames: number;
}

export class WebcamAnalyticsTracker {
  private landmarker: import("@mediapipe/tasks-vision").FaceLandmarker | null = null;
  private initPromise: Promise<void> | null = null;
  private status: TrackerStatus = "idle";

  private totalSamples = 0;
  private faceVisibleSamples = 0;
  private lookingAwaySamples = 0;
  private movementSamples = 0;
  private lastCentroid: { x: number; y: number } | null = null;

  getStatus(): TrackerStatus {
    return this.status;
  }

  getSampleCount(): number {
    return this.totalSamples;
  }

  private async createLandmarker(delegate: "GPU" | "CPU") {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFacialTransformationMatrixes: true,
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.landmarker || this.status === "failed") return;
    if (this.initPromise) return this.initPromise;

    this.status = "initializing";
    this.initPromise = (async () => {
      try {
        this.landmarker = await this.createLandmarker("GPU");
      } catch {
        // GPU delegate is unavailable on plenty of machines (no WebGL2, GPU
        // blocklisted, headless browsers); CPU is slower but works.
        try {
          this.landmarker = await this.createLandmarker("CPU");
        } catch {
          this.status = "failed";
          return;
        }
      }
      this.status = "ready";
    })();

    return this.initPromise;
  }

  /** Call roughly once per second with the interview room's video element.
   * Safe to call before initialization finishes, or after it failed — it just
   * no-ops. Never throws. */
  async sample(video: HTMLVideoElement): Promise<void> {
    try {
      await this.ensureInitialized();
      if (!this.landmarker || video.readyState < 2 || video.videoWidth === 0) return;

      const result = this.landmarker.detectForVideo(video, performance.now());
      this.totalSamples += 1;

      const hasFace = (result.faceLandmarks?.length ?? 0) > 0;
      if (!hasFace) {
        this.lastCentroid = null; // don't measure movement across a gap
        return;
      }

      this.faceVisibleSamples += 1;

      const alignment = estimateForwardAlignment(result);
      if (alignment !== null && alignment < LOOKING_AWAY_THRESHOLD) {
        this.lookingAwaySamples += 1;
      }

      const centroid = landmarkCentroid(result);
      if (centroid) {
        if (this.lastCentroid) {
          const dx = centroid.x - this.lastCentroid.x;
          const dy = centroid.y - this.lastCentroid.y;
          if (Math.sqrt(dx * dx + dy * dy) > MOVEMENT_THRESHOLD) this.movementSamples += 1;
        }
        this.lastCentroid = centroid;
      }
    } catch {
      // Never let analytics collection break the interview.
    }
  }

  /** Returns the aggregate, or null if too little data was collected to be
   * worth submitting (model failed to load, camera was off, session too short). */
  getAggregate(): WebcamAnalyticsAggregate | null {
    return buildAggregate({
      total: this.totalSamples,
      faceVisible: this.faceVisibleSamples,
      lookingAway: this.lookingAwaySamples,
      movement: this.movementSamples,
    });
  }
}

export interface SampleCounts {
  total: number;
  faceVisible: number;
  lookingAway: number;
  movement: number;
}

/**
 * Pure aggregation, exported so the arithmetic can be tested without a camera
 * or the MediaPipe runtime. Returns null when there is too little data to be
 * meaningful — the report shows "Not available" rather than a number built
 * from two frames.
 */
export function buildAggregate(counts: SampleCounts): WebcamAnalyticsAggregate | null {
  if (counts.total < MIN_SAMPLES) return null;
  return {
    faceVisibleRate: counts.faceVisible / counts.total,
    lookingAwayRate: counts.faceVisible > 0 ? counts.lookingAway / counts.faceVisible : 0,
    movementRate: counts.faceVisible > 0 ? counts.movement / counts.faceVisible : 0,
    sampledFrames: counts.total,
  };
}
