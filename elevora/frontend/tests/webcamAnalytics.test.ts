import { describe, expect, it } from "vitest";
import {
  buildAggregate,
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
