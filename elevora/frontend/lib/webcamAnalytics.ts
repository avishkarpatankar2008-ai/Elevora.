import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

/**
 * Optional on-device interview camera analytics. Face and pose frames are
 * analysed only in this browser tab. Only bounded, validated aggregate rates
 * are sent to the backend; raw frames, landmarks, or video are never uploaded.
 *
 * Pose measurements describe camera-visible geometry and framing only. The
 * `sittingPostureRate` field is a rough upright-torso proxy, not confirmation
 * that a person is sitting. Nothing here estimates honesty, emotion,
 * intelligence, personality, or job suitability.
 */
const WASM_BASE_URL = "/mediapipe/wasm";
const DEFAULT_FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const DEFAULT_POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const FACE_MODEL_URL = process.env.NEXT_PUBLIC_FACE_LANDMARKER_MODEL_URL || DEFAULT_FACE_MODEL_URL;
const POSE_MODEL_URL = process.env.NEXT_PUBLIC_POSE_LANDMARKER_MODEL_URL || DEFAULT_POSE_MODEL_URL;
const LOOKING_AWAY_THRESHOLD = 0.85;
const MOVEMENT_THRESHOLD = 0.015;
const POSTURE_CHANGE_THRESHOLD = 0.015;
const MIN_SAMPLES = 3;
const MIN_LANDMARK_CONFIDENCE = 0.35;

type Landmark = { x: number; y: number; z?: number; visibility?: number; presence?: number };
type Point2D = { x: number; y: number };
export type TrackerStatus = "idle" | "initializing" | "ready" | "failed";

export interface WebcamAnalyticsAggregate {
  faceVisibleRate: number;
  lookingAwayRate: number;
  movementRate: number;
  sampledFrames: number;
  postureSamples: number;
  sittingPostureRate: number | null;
  headShoulderAlignmentRate: number | null;
  torsoAlignmentRate: number | null;
  postureChangeRate: number | null;
  cameraFramingRate: number | null;
  landmarkConfidence: number | null;
}

export function estimateForwardAlignment(result: FaceLandmarkerResult): number | null {
  const matrix = result.facialTransformationMatrixes?.[0];
  if (!matrix || matrix.data.length < 16) return null;
  return matrix.data[10];
}

export function landmarkCentroid(result: FaceLandmarkerResult): Point2D | null {
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

function meanPoint(points: (Landmark | undefined)[]): Point2D | null {
  const visible = points.filter((point): point is Landmark => Boolean(point));
  if (!visible.length) return null;
  return {
    x: visible.reduce((sum, point) => sum + point.x, 0) / visible.length,
    y: visible.reduce((sum, point) => sum + point.y, 0) / visible.length,
  };
}

function confidenceOf(point: Landmark | undefined): number {
  if (!point) return 0;
  const value = point.visibility ?? point.presence ?? 0;
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function inFrame(point: Point2D): boolean {
  return point.x >= 0.04 && point.x <= 0.96 && point.y >= 0.04 && point.y <= 0.96;
}

/** Pure pose-frame feature extraction, separated for deterministic unit tests. */
export interface PoseFrameMetrics {
  usable: boolean;
  sittingPosture: boolean;
  headShoulderAligned: boolean;
  torsoAligned: boolean;
  cameraFramed: boolean;
  landmarkConfidence: number;
  bodyCenter: Point2D | null;
}

export function derivePoseFrameMetrics(landmarks: Landmark[] | undefined): PoseFrameMetrics | null {
  if (!landmarks || landmarks.length < 25) return null;

  // MediaPipe Pose indices: nose=0, ears=7/8, shoulders=11/12, hips=23/24.
  const nose = landmarks[0];
  const ears = [landmarks[7], landmarks[8]];
  const shoulders = [landmarks[11], landmarks[12]];
  const hips = [landmarks[23], landmarks[24]];
  const shoulderMid = meanPoint(shoulders);
  const hipMid = meanPoint(hips);
  const headMid = meanPoint([nose, ...ears]);
  const keyPoints = [nose, ...ears, ...shoulders, ...hips];
  const landmarkConfidence = keyPoints.reduce((sum, point) => sum + confidenceOf(point), 0) / keyPoints.length;
  const requiredVisible = keyPoints.every(
    (point) => confidenceOf(point) >= MIN_LANDMARK_CONFIDENCE,
  );
  const usable = requiredVisible && landmarkConfidence >= MIN_LANDMARK_CONFIDENCE;
  const cameraFramed = usable && keyPoints.every((point) => {
    if (confidenceOf(point) < MIN_LANDMARK_CONFIDENCE) return false;
    return inFrame(point);
  });

  if (!shoulderMid || !hipMid || !headMid) {
    return {
      usable,
      sittingPosture: false,
      headShoulderAligned: false,
      torsoAligned: false,
      cameraFramed: false,
      landmarkConfidence,
      bodyCenter: null,
    };
  }

  const torsoDx = Math.abs(shoulderMid.x - hipMid.x);
  const torsoDy = Math.abs(hipMid.y - shoulderMid.y);
  const torsoSlope = torsoDy > 0.01 ? torsoDx / torsoDy : Number.POSITIVE_INFINITY;
  const torsoAligned = usable && torsoSlope <= 0.35;
  // This is only a visible upright-torso proxy. A monocular webcam cannot
  // reliably establish whether a person is actually seated.
  const sittingPosture = usable && torsoAligned && torsoDy >= 0.06 && torsoDy <= 0.65;
  const shoulderWidth = Math.abs(shoulders[0].x - shoulders[1].x);
  const headGap = shoulderMid.y - headMid.y;
  const headShoulderAligned =
    usable &&
    shoulderWidth > 0.02 &&
    Math.abs(headMid.x - shoulderMid.x) <= shoulderWidth * 0.55 &&
    headGap >= 0.015 &&
    headGap <= 0.42;
  const bodyCenter = {
    x: (shoulderMid.x + hipMid.x) / 2,
    y: (shoulderMid.y + hipMid.y) / 2,
  };

  return {
    usable,
    sittingPosture,
    headShoulderAligned,
    torsoAligned,
    cameraFramed,
    landmarkConfidence,
    bodyCenter,
  };
}

export class WebcamAnalyticsTracker {
  private faceLandmarker: import("@mediapipe/tasks-vision").FaceLandmarker | null = null;
  private poseLandmarker: import("@mediapipe/tasks-vision").PoseLandmarker | null = null;
  private initPromise: Promise<void> | null = null;
  private status: TrackerStatus = "idle";
  private totalSamples = 0;
  private faceVisibleSamples = 0;
  private lookingAwaySamples = 0;
  private movementSamples = 0;
  private lastFaceCentroid: Point2D | null = null;
  private postureSamples = 0;
  private sittingPostureSamples = 0;
  private headShoulderAlignedSamples = 0;
  private torsoAlignedSamples = 0;
  private postureChangeSamples = 0;
  private postureChangeWindows = 0;
  private cameraFramedSamples = 0;
  private confidenceSum = 0;
  private lastBodyCenter: Point2D | null = null;
  // Invalidates async model initialization/sample work after consent revocation or unmount.
  private lifecycleVersion = 0;

  getStatus(): TrackerStatus { return this.status; }
  getSampleCount(): number { return this.totalSamples; }

  private async createLandmarkers(delegate: "GPU" | "CPU") {
    const { FaceLandmarker, PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    let face: import("@mediapipe/tasks-vision").FaceLandmarker | null = null;
    try {
      face = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFacialTransformationMatrixes: true,
      });
      const pose = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      return { face, pose };
    } catch (error) {
      face?.close();
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if ((this.faceLandmarker && this.poseLandmarker) || this.status === "failed") return;
    if (this.initPromise) return this.initPromise;
    const lifecycleAtStart = this.lifecycleVersion;
    this.status = "initializing";
    this.initPromise = (async () => {
      let landmarkers: { face: import("@mediapipe/tasks-vision").FaceLandmarker; pose: import("@mediapipe/tasks-vision").PoseLandmarker } | null = null;
      try {
        landmarkers = await this.createLandmarkers("GPU");
      } catch {
        // Consent may have been revoked while the GPU model was loading. Avoid
        // kicking off a second model load once this lifecycle has been invalidated.
        if (lifecycleAtStart !== this.lifecycleVersion) return;
        try {
          landmarkers = await this.createLandmarkers("CPU");
        } catch {
          if (lifecycleAtStart === this.lifecycleVersion) this.status = "failed";
          return;
        }
      }

      // A late model load after consent revocation/unmount must never reattach
      // the tracker. Dispose both models as soon as their initialization resolves.
      if (lifecycleAtStart !== this.lifecycleVersion) {
        landmarkers.face.close();
        landmarkers.pose.close();
        return;
      }
      this.faceLandmarker = landmarkers.face;
      this.poseLandmarker = landmarkers.pose;
      this.status = "ready";
    })();
    return this.initPromise;
  }

  /** Sample a video frame locally. Errors never interrupt the interview. */
  async sample(video: HTMLVideoElement): Promise<void> {
    const lifecycleAtStart = this.lifecycleVersion;
    try {
      await this.ensureInitialized();
      if (lifecycleAtStart !== this.lifecycleVersion) return;
      if (!this.faceLandmarker || !this.poseLandmarker || video.readyState < 2 || video.videoWidth === 0) return;
      const timestamp = performance.now();
      const faceResult = this.faceLandmarker.detectForVideo(video, timestamp);
      const poseResult = this.poseLandmarker.detectForVideo(video, timestamp);
      this.totalSamples += 1;

      const hasFace = (faceResult.faceLandmarks?.length ?? 0) > 0;
      if (!hasFace) {
        this.lastFaceCentroid = null;
      } else {
        this.faceVisibleSamples += 1;
        const alignment = estimateForwardAlignment(faceResult);
        if (alignment !== null && alignment < LOOKING_AWAY_THRESHOLD) this.lookingAwaySamples += 1;
        const centroid = landmarkCentroid(faceResult);
        if (centroid) {
          if (this.lastFaceCentroid) {
            const dx = centroid.x - this.lastFaceCentroid.x;
            const dy = centroid.y - this.lastFaceCentroid.y;
            if (Math.sqrt(dx * dx + dy * dy) > MOVEMENT_THRESHOLD) this.movementSamples += 1;
          }
          this.lastFaceCentroid = centroid;
        }
      }

      const pose = derivePoseFrameMetrics(poseResult.landmarks?.[0] as Landmark[] | undefined);
      if (!pose || !pose.usable) {
        this.lastBodyCenter = null;
        return;
      }
      this.postureSamples += 1;
      this.sittingPostureSamples += Number(pose.sittingPosture);
      this.headShoulderAlignedSamples += Number(pose.headShoulderAligned);
      this.torsoAlignedSamples += Number(pose.torsoAligned);
      this.cameraFramedSamples += Number(pose.cameraFramed);
      this.confidenceSum += pose.landmarkConfidence;
      if (pose.bodyCenter && this.lastBodyCenter) {
        this.postureChangeWindows += 1;
        const dx = pose.bodyCenter.x - this.lastBodyCenter.x;
        const dy = pose.bodyCenter.y - this.lastBodyCenter.y;
        if (Math.sqrt(dx * dx + dy * dy) > POSTURE_CHANGE_THRESHOLD) this.postureChangeSamples += 1;
      }
      this.lastBodyCenter = pose.bodyCenter;
    } catch {
      // Analytics is optional and must not interrupt the interview.
    }
  }

  getAggregate(): WebcamAnalyticsAggregate | null {
    return buildAggregate({
      total: this.totalSamples,
      faceVisible: this.faceVisibleSamples,
      lookingAway: this.lookingAwaySamples,
      movement: this.movementSamples,
      postureSamples: this.postureSamples,
      sittingPosture: this.sittingPostureSamples,
      headShoulderAligned: this.headShoulderAlignedSamples,
      torsoAligned: this.torsoAlignedSamples,
      postureChange: this.postureChangeSamples,
      postureChangeWindows: this.postureChangeWindows,
      cameraFramed: this.cameraFramedSamples,
      confidenceSum: this.confidenceSum,
    });
  }

  close(): void {
    this.lifecycleVersion += 1;
    this.faceLandmarker?.close();
    this.poseLandmarker?.close();
    this.faceLandmarker = null;
    this.poseLandmarker = null;
    this.status = "idle";
    this.initPromise = null;
  }
}

export interface SampleCounts {
  total: number;
  faceVisible: number;
  lookingAway: number;
  movement: number;
  postureSamples?: number;
  sittingPosture?: number;
  headShoulderAligned?: number;
  torsoAligned?: number;
  postureChange?: number;
  postureChangeWindows?: number;
  cameraFramed?: number;
  confidenceSum?: number;
}

export function buildAggregate(counts: SampleCounts): WebcamAnalyticsAggregate | null {
  if (counts.total < MIN_SAMPLES) return null;
  const postureSamples = counts.postureSamples ?? 0;
  const postureRate = (value: number | undefined) =>
    postureSamples > 0 && value !== undefined ? value / postureSamples : null;
  const postureWindows = counts.postureChangeWindows ?? 0;
  return {
    faceVisibleRate: counts.faceVisible / counts.total,
    lookingAwayRate: counts.faceVisible > 0 ? counts.lookingAway / counts.faceVisible : 0,
    movementRate: counts.faceVisible > 0 ? counts.movement / counts.faceVisible : 0,
    sampledFrames: counts.total,
    postureSamples,
    sittingPostureRate: postureRate(counts.sittingPosture),
    headShoulderAlignmentRate: postureRate(counts.headShoulderAligned),
    torsoAlignmentRate: postureRate(counts.torsoAligned),
    postureChangeRate: postureWindows > 0 ? (counts.postureChange ?? 0) / postureWindows : null,
    cameraFramingRate: postureRate(counts.cameraFramed),
    landmarkConfidence: postureSamples > 0 ? (counts.confidenceSum ?? 0) / postureSamples : null,
  };
}

/** Plain, non-evaluative session description for consented local analytics. */
export function buildPostureSummary(aggregate: WebcamAnalyticsAggregate | null): string | null {
  if (!aggregate || aggregate.postureSamples < MIN_SAMPLES) return null;
  const pct = (value: number | null) => value === null ? null : `${Math.round(value * 100)}%`;
  const parts = [
    `Pose landmarks were usable in ${aggregate.postureSamples} sampled frames.`,
    aggregate.sittingPostureRate !== null ? `Upright-torso proxy observed in ${pct(aggregate.sittingPostureRate)} of usable pose frames.` : null,
    aggregate.headShoulderAlignmentRate !== null ? `Head/shoulder geometry met the defined alignment threshold in ${pct(aggregate.headShoulderAlignmentRate)}.` : null,
    aggregate.torsoAlignmentRate !== null ? `Torso geometry met the vertical-alignment threshold in ${pct(aggregate.torsoAlignmentRate)}.` : null,
    aggregate.postureChangeRate !== null ? `Noticeable camera-visible position changes occurred in ${pct(aggregate.postureChangeRate)} of adjacent pose windows.` : null,
    aggregate.cameraFramingRate !== null ? `Required landmarks were in frame in ${pct(aggregate.cameraFramingRate)} of usable pose frames.` : null,
    aggregate.landmarkConfidence !== null ? `Mean landmark visibility confidence was ${pct(aggregate.landmarkConfidence)}.` : null,
    "These are coarse visual estimates, not a judgement of the person or their suitability.",
  ];
  return parts.filter(Boolean).join(" ");
}
