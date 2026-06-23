/**
 * core/hitTest.ts
 * -----------------------------------------------------------------------------
 * Hit-testing: given a scene-space point, determine which element (if any) is
 * under it. Handles rotation by transforming the test point into each
 * element's local (unrotated) frame before applying per-type geometry tests.
 */

import type { Bounds, Point, WhiteboardElement } from "../types";
import { distanceToSegment, rotatePoint } from "../utils/math";
import { hasPoints, isTextElement } from "./element";
import {
  getElementBounds,
  getElementCenter,
  getElementAABB,
  boundsContain,
} from "./bounds";

/**
 * Transform a scene point into the element's local frame by undoing rotation
 * around the element center.
 */
function toLocalPoint(element: WhiteboardElement, point: Point): Point {
  if (element.angle === 0) return point;
  const center = getElementCenter(element);
  return rotatePoint(point, center, -element.angle);
}

/**
 * Whether a (local) point lies within `threshold` scene units of an element.
 * `threshold` should already be scaled to scene units by the caller (i.e.
 * screen tolerance divided by zoom).
 */
export function isPointHittingElement(
  element: WhiteboardElement,
  scenePoint: Point,
  threshold: number,
): boolean {
  if (element.isDeleted) return false;
  const p = toLocalPoint(element, scenePoint);
  const b = getElementBounds(element);

  switch (element.type) {
    case "rectangle":
    case "text":
      return hitRectangle(p, b, element, threshold);
    case "ellipse":
      return hitEllipse(p, b, element, threshold);
    case "diamond":
      return hitDiamond(p, b, element, threshold);
    case "line":
    case "arrow":
    case "draw":
      return hitPolyline(element, p, threshold);
    default:
      return false;
  }
}

/** Whether the element is "filled" (so interior clicks should count as hits). */
function isFilled(element: WhiteboardElement): boolean {
  return (
    element.backgroundColor !== "transparent" &&
    element.backgroundColor !== "" ||
    isTextElement(element)
  );
}

function hitRectangle(
  p: Point,
  b: Bounds,
  element: WhiteboardElement,
  threshold: number,
): boolean {
  const insideX = p.x >= b.minX - threshold && p.x <= b.maxX + threshold;
  const insideY = p.y >= b.minY - threshold && p.y <= b.maxY + threshold;
  if (!insideX || !insideY) return false;
  if (isFilled(element)) return true;
  // Outline-only: reject deep interior clicks.
  const innerX = p.x > b.minX + threshold && p.x < b.maxX - threshold;
  const innerY = p.y > b.minY + threshold && p.y < b.maxY - threshold;
  return !(innerX && innerY);
}

function hitEllipse(
  p: Point,
  b: Bounds,
  element: WhiteboardElement,
  threshold: number,
): boolean {
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const rx = Math.max((b.maxX - b.minX) / 2, 0.0001);
  const ry = Math.max((b.maxY - b.minY) / 2, 0.0001);
  const nx = (p.x - cx) / rx;
  const ny = (p.y - cy) / ry;
  const d = nx * nx + ny * ny; // 1 == on the ellipse
  // Normalize threshold relative to radii for a reasonable band.
  const band = threshold / Math.min(rx, ry);
  if (isFilled(element)) return d <= 1 + band;
  return d <= 1 + band && d >= 1 - band - band; // ring around the outline
}

function hitDiamond(
  p: Point,
  b: Bounds,
  element: WhiteboardElement,
  threshold: number,
): boolean {
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const rx = Math.max((b.maxX - b.minX) / 2, 0.0001);
  const ry = Math.max((b.maxY - b.minY) / 2, 0.0001);
  // Diamond (rotated square) equation: |dx|/rx + |dy|/ry <= 1
  const d = Math.abs(p.x - cx) / rx + Math.abs(p.y - cy) / ry;
  const band = threshold / Math.min(rx, ry);
  if (isFilled(element)) return d <= 1 + band;
  return d <= 1 + band && d >= 1 - band - band;
}

function hitPolyline(
  element: WhiteboardElement,
  p: Point,
  threshold: number,
): boolean {
  if (!hasPoints(element)) return false;
  const pts = element.points;
  const tol = threshold + element.strokeWidth / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = { x: element.x + pts[i].x, y: element.y + pts[i].y };
    const b = { x: element.x + pts[i + 1].x, y: element.y + pts[i + 1].y };
    if (distanceToSegment(p, a, b) <= tol) return true;
  }
  // Single-point freehand dot.
  if (pts.length === 1) {
    const a = { x: element.x + pts[0].x, y: element.y + pts[0].y };
    return distanceToSegment(p, a, a) <= tol;
  }
  return false;
}

/**
 * Return the top-most element under a scene point, respecting z-order
 * (elements later in the array are rendered on top, so we iterate backwards).
 */
export function getElementAtPoint(
  elements: WhiteboardElement[],
  scenePoint: Point,
  threshold: number,
): WhiteboardElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.isDeleted || el.locked) continue;
    if (isPointHittingElement(el, scenePoint, threshold)) return el;
  }
  return null;
}

/**
 * Return all (non-deleted, non-locked) elements whose AABB is fully contained
 * within the given selection rectangle (scene coords).
 */
export function getElementsInBounds(
  elements: WhiteboardElement[],
  selection: Bounds,
): WhiteboardElement[] {
  return elements.filter((el) => {
    if (el.isDeleted || el.locked) return false;
    return boundsContain(selection, getElementAABB(el));
  });
}
