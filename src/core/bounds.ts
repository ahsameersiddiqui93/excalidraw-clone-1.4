/**
 * core/bounds.ts
 * -----------------------------------------------------------------------------
 * Bounding-box computations for elements and selections, including support for
 * rotated elements and the four corner points of an element.
 */

import type { Bounds, Point, WhiteboardElement } from "../types";
import { rotatePoint } from "../utils/math";

/** The geometric center of an element's unrotated box, in scene coords. */
export function getElementCenter(element: WhiteboardElement): Point {
  return {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
}

/**
 * Axis-aligned bounding box ignoring rotation (the element's "local" box in
 * scene coordinates). Width/height may be negative during creation, so this
 * normalizes them.
 */
export function getElementBounds(element: WhiteboardElement): Bounds {
  const minX = Math.min(element.x, element.x + element.width);
  const minY = Math.min(element.y, element.y + element.height);
  const maxX = Math.max(element.x, element.x + element.width);
  const maxY = Math.max(element.y, element.y + element.height);
  return { minX, minY, maxX, maxY };
}

/**
 * The four corners of an element *after* applying its rotation, in order
 * [nw, ne, se, sw]. Useful for drawing selection outlines and for accurate
 * AABB computation of rotated elements.
 */
export function getElementCorners(element: WhiteboardElement): Point[] {
  const { minX, minY, maxX, maxY } = getElementBounds(element);
  const center = getElementCenter(element);
  const corners: Point[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
  if (element.angle === 0) return corners;
  return corners.map((c) => rotatePoint(c, center, element.angle));
}

/** Axis-aligned bounding box that fully contains the rotated element. */
export function getElementAABB(element: WhiteboardElement): Bounds {
  if (element.angle === 0) return getElementBounds(element);
  const corners = getElementCorners(element);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  }
  return { minX, minY, maxX, maxY };
}

/** Combine multiple bounds into a single enclosing bounds. */
export function mergeBounds(boundsList: Bounds[]): Bounds | null {
  if (boundsList.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boundsList) {
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  return { minX, minY, maxX, maxY };
}

/** Bounding box that encloses a list of elements (accounting for rotation). */
export function getCommonBounds(
  elements: WhiteboardElement[],
): Bounds | null {
  return mergeBounds(elements.map(getElementAABB));
}

/** Whether bounds `a` fully contains bounds `b`. */
export function boundsContain(a: Bounds, b: Bounds): boolean {
  return (
    a.minX <= b.minX &&
    a.minY <= b.minY &&
    a.maxX >= b.maxX &&
    a.maxY >= b.maxY
  );
}

/** Whether two bounds overlap at all. */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY
  );
}

/** Build a normalized Bounds from two arbitrary corner points. */
export function boundsFromPoints(a: Point, b: Point): Bounds {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

/** Width of a bounds. */
export function boundsWidth(b: Bounds): number {
  return b.maxX - b.minX;
}

/** Height of a bounds. */
export function boundsHeight(b: Bounds): number {
  return b.maxY - b.minY;
}
