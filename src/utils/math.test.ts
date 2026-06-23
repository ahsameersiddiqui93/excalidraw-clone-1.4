/**
 * utils/math.test.ts
 * -----------------------------------------------------------------------------
 * Unit tests for the pure math helpers. These are the geometric foundation of
 * hit-testing, transforms and the viewport, so we test them thoroughly.
 */

import { describe, expect, it } from "vitest";
import {
  clamp,
  distance,
  distanceToSegment,
  lerp,
  normalizeAngle,
  rotatePoint,
  toDegrees,
  toRadians,
} from "./math";

describe("clamp", () => {
  it("clamps below the minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps above the maximum", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it("passes values within range through", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe("lerp", () => {
  it("returns endpoints at t=0 and t=1", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
  it("interpolates the midpoint", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe("distance", () => {
  it("computes a 3-4-5 triangle", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe("rotatePoint", () => {
  it("rotates 90° around the origin", () => {
    const p = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
  it("leaves the center fixed", () => {
    const c = { x: 5, y: 5 };
    const p = rotatePoint(c, c, 1.234);
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(5);
  });
});

describe("distanceToSegment", () => {
  it("is zero on the segment", () => {
    expect(distanceToSegment({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 })).toBe(
      0,
    );
  });
  it("measures perpendicular distance", () => {
    expect(
      distanceToSegment({ x: 1, y: 3 }, { x: 0, y: 0 }, { x: 2, y: 0 }),
    ).toBe(3);
  });
  it("clamps to the nearest endpoint", () => {
    expect(
      distanceToSegment({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 }),
    ).toBe(3);
  });
});

describe("angle helpers", () => {
  it("converts degrees and radians round-trip", () => {
    expect(toDegrees(toRadians(180))).toBeCloseTo(180);
  });
  it("normalizes angles into (-PI, PI]", () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI * 3)).toBeCloseTo(Math.PI);
  });
});
