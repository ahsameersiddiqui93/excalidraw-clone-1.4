/**
 * utils/math.ts
 * -----------------------------------------------------------------------------
 * Pure geometry and math helpers. No DOM, no side effects: trivially testable.
 */

import type { Point } from "../types";

/** Clamp a value into the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation between a and b by t in [0, 1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Euclidean distance between two points. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Squared distance (cheaper, avoids sqrt) between two points. */
export function distanceSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Rotate point `p` around `center` by `angle` radians.
 * Returns a new point.
 */
export function rotatePoint(p: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Shortest distance from point `p` to the line segment `a`–`b`.
 * Used for hit-testing lines, arrows, and freehand strokes.
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = clamp(t, 0, 1);
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Round a number to a fixed number of decimal places. */
export function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/** Degrees → radians. */
export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Radians → degrees. */
export function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Normalize an angle into the range (-PI, PI].
 */
export function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let a = angle % twoPi;
  if (a <= -Math.PI) a += twoPi;
  if (a > Math.PI) a -= twoPi;
  return a;
}
