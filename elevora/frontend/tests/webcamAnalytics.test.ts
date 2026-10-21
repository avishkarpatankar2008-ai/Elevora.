import { describe, expect, it } from "vitest";
import {
  buildAggregate,
<<<<<<< HEAD
  buildPostureSummary,
  derivePoseFrameMetrics,
=======
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
  estimateForwardAlignment,
  landmarkCentroid,
} from "@/lib/webcamAnalytics";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

function resultWith(landmarks: { x: number; y: number }[][], matrix?: number[]): FaceLandmarkerResult {
  return {
    faceLandmarks: landmarks,
    facialTransformationMatrixes: matrix ? [{ data: Float32Array.from(matrix) }] : undefined,
  } as unknown as FaceLandmarkerResult;
}

describe("estimateForwardAlignment", () => {
  it("reads the diagonal entry that is index 10 in either matrix convention", () => {
    const matrix = new Array(16).fill(0);
    matrix[10] = 0.98;
    expect(estimateForwardAlignment(resultWith([], matrix))).toBeCloseTo(0.98);
  });

  it("returns null when the model didn't return a matrix", () => {
    expect(estimateForwardAlignment(resultWith([[]]))).toBeNull();
  });

  it("returns null for a truncated matrix instead of reading garbage", () => {
    expect(estimateForwardAlignment(resultWith([], [1, 2, 3]))).toBeNull();
  });
});

describe("landmarkCentroid", () => {
  it("averages all landmarks", () => {
    const centroid = landmarkCentroid(
      resultWith([
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 0.5 },
        ],
      ])
    );
    expect(centroid).toEqual({ x: 1, y: 0.5 });
  });

  it("returns null when no face was detected", () => {
    expect(landmarkCentroid(resultWith([]))).toBeNull();
    expect(landmarkCentroid(resultWith([[]]))).toBeNull();
  });
});

describe("buildAggregate", () => {
  it("refuses to report rates from too few samples", () => {
    // Two frames is not a session; the report must say "Not available".
    expect(buildAggregate({ total: 2, faceVisible: 2, lookingAway: 0, movement: 0 })).toBeNull();
  });

  it("computes rates against the right denominators", () => {
    const aggregate = buildAggregate({
      total: 10,
      faceVisible: 8,
      lookingAway: 2,
      movement: 4,
    });
    expect(aggregate).not.toBeNull();
    expect(aggregate!.faceVisibleRate).toBeCloseTo(0.8);
    expect(aggregate!.sampledFrames).toBe(10);
    // Looking away / movement are shares of *face-visible* frames, not of all
    // frames — otherwise a candidate who left the frame would look "focused".
    expect(aggregate!.lookingAwayRate).toBeCloseTo(0.25);
    expect(aggregate!.movementRate).toBeCloseTo(0.5);
  });

  it("reports a fully absent face as 0% visible with no divide-by-zero", () => {
    const aggregate = buildAggregate({ total: 5, faceVisible: 0, lookingAway: 0, movement: 0 });
    expect(aggregate!.faceVisibleRate).toBe(0);
    expect(aggregate!.lookingAwayRate).toBe(0);
    expect(aggregate!.movementRate).toBe(0);
  });
});
<<<<<<< HEAD


describe("pose geometry features", () => {
  function uprightPose() {
    const points = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9, presence: 0.9 }));
    points[0] = { x: 0.5, y: 0.18, visibility: 0.9, presence: 0.9 };
    points[7] = { x: 0.46, y: 0.22, visibility: 0.9, presence: 0.9 };
    points[8] = { x: 0.54, y: 0.22, visibility: 0.9, presence: 0.9 };
    points[11] = { x: 0.4, y: 0.35, visibility: 0.9, presence: 0.9 };
    points[12] = { x: 0.6, y: 0.35, visibility: 0.9, presence: 0.9 };
    points[23] = { x: 0.42, y: 0.62, visibility: 0.9, presence: 0.9 };
    points[24] = { x: 0.58, y: 0.62, visibility: 0.9, presence: 0.9 };
    return points;
  }

  it("derives bounded alignment, framing, and confidence signals locally", () => {
    const metrics = derivePoseFrameMetrics(uprightPose());
    expect(metrics).not.toBeNull();
    expect(metrics!.usable).toBe(true);
    expect(metrics!.sittingPosture).toBe(true);
    expect(metrics!.headShoulderAligned).toBe(true);
    expect(metrics!.torsoAligned).toBe(true);
    expect(metrics!.cameraFramed).toBe(true);
    expect(metrics!.landmarkConfidence).toBeCloseTo(0.9);
  });

  it("rejects low-confidence pose data", () => {
    const points = uprightPose().map((point) => ({ ...point, visibility: 0.05, presence: 0.05 }));
    const metrics = derivePoseFrameMetrics(points);
    expect(metrics?.usable).toBe(false);
    expect(metrics?.cameraFramed).toBe(false);
  });

  it("aggregates posture fields and produces a non-evaluative session summary", () => {
    const aggregate = buildAggregate({
      total: 10, faceVisible: 9, lookingAway: 1, movement: 2,
      postureSamples: 8, sittingPosture: 6, headShoulderAligned: 7,
      torsoAligned: 6, postureChange: 2, postureChangeWindows: 7,
      cameraFramed: 5, confidenceSum: 6.4,
    });
    expect(aggregate?.sittingPostureRate).toBeCloseTo(0.75);
    expect(aggregate?.cameraFramingRate).toBeCloseTo(0.625);
    expect(aggregate?.landmarkConfidence).toBeCloseTo(0.8);
    expect(buildPostureSummary(aggregate)).toContain("not a judgement");
  });
});
=======
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
