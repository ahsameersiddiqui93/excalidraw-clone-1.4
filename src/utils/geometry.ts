/**
 * Geometry utilities for element hit-testing, bounding boxes, and transforms.
 */

import { Point, BoundingBox, WhiteboardElement, SELECTION_PADDING } from '../types';

/** Generate a unique ID */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

/** Generate a random seed for rough.js */
export function generateSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Convert screen coordinates to canvas (world) coordinates */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): Point {
  return {
    x: (screenX - offsetX) / zoom,
    y: (screenY - offsetY) / zoom,
  };
}

/** Convert canvas (world) coordinates to screen coordinates */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): Point {
  return {
    x: canvasX * zoom + offsetX,
    y: canvasY * zoom + offsetY,
  };
}

/** Distance between two points */
export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** Midpoint between two points */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Normalize a bounding box so width/height are always positive */
export function normalizeBounds(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): BoundingBox {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

/** Get the axis-aligned bounding box of an element */
export function getElementBounds(element: WhiteboardElement): BoundingBox {
  if (element.type === 'pencil' || element.type === 'line' || element.type === 'arrow') {
    const pts = element.points;
    if (!pts || pts.length === 0) {
      return { x: element.x, y: element.y, width: element.width, height: element.height };
    }
    const xs = pts.map((p) => p.x + element.x);
    const ys = pts.map((p) => p.y + element.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return { x: element.x, y: element.y, width: element.width, height: element.height };
}

/** Get padded bounding box for selection rendering */
export function getPaddedBounds(bounds: BoundingBox, padding = SELECTION_PADDING): BoundingBox {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

/** Check if a point is inside a bounding box */
export function pointInBounds(point: Point, bounds: BoundingBox): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/** Check if two bounding boxes intersect */
export function boundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Check if bounding box A fully contains bounding box B */
export function boundsContain(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x <= b.x &&
    a.y <= b.y &&
    a.x + a.width >= b.x + b.width &&
    a.y + a.height >= b.y + b.height
  );
}

/** Rotate a point around a center */
export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/** Get the center of a bounding box */
export function getBoundsCenter(bounds: BoundingBox): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

/** Get the center of an element */
export function getElementCenter(element: WhiteboardElement): Point {
  const bounds = getElementBounds(element);
  return getBoundsCenter(bounds);
}

/** Hit-test a point against an element (with rotation support) */
export function hitTestElement(element: WhiteboardElement, point: Point, threshold = 8): boolean {
  const bounds = getElementBounds(element);
  const center = getBoundsCenter(bounds);

  // Rotate point into element's local space
  const localPoint = element.angle !== 0
    ? rotatePoint(point, center, -element.angle)
    : point;

  const padded = getPaddedBounds(bounds, threshold);

  if (element.type === 'pencil') {
    return hitTestPolyline(element.points.map(p => ({ x: p.x + element.x, y: p.y + element.y })), localPoint, threshold);
  }

  if (element.type === 'line' || element.type === 'arrow') {
    return hitTestPolyline(element.points.map(p => ({ x: p.x + element.x, y: p.y + element.y })), localPoint, threshold);
  }

  if (element.type === 'ellipse') {
    return hitTestEllipse(bounds, localPoint, threshold, element.style.fillColor !== 'transparent' && element.style.fillStyle !== 'none');
  }

  if (element.type === 'diamond') {
    return hitTestDiamond(bounds, localPoint, threshold, element.style.fillColor !== 'transparent' && element.style.fillStyle !== 'none');
  }

  if (element.type === 'text') {
    return pointInBounds(localPoint, padded);
  }

  // Rectangle and others: check border or fill
  const filled = element.style.fillColor !== 'transparent' && element.style.fillStyle !== 'none';
  if (filled) {
    return pointInBounds(localPoint, padded);
  }
  // Check border only
  return hitTestRectBorder(bounds, localPoint, threshold);
}

function hitTestRectBorder(bounds: BoundingBox, point: Point, threshold: number): boolean {
  const { x, y, width, height } = bounds;
  // Check if near any of the 4 edges
  const nearLeft = Math.abs(point.x - x) <= threshold && point.y >= y - threshold && point.y <= y + height + threshold;
  const nearRight = Math.abs(point.x - (x + width)) <= threshold && point.y >= y - threshold && point.y <= y + height + threshold;
  const nearTop = Math.abs(point.y - y) <= threshold && point.x >= x - threshold && point.x <= x + width + threshold;
  const nearBottom = Math.abs(point.y - (y + height)) <= threshold && point.x >= x - threshold && point.x <= x + width + threshold;
  return nearLeft || nearRight || nearTop || nearBottom;
}

function hitTestEllipse(bounds: BoundingBox, point: Point, threshold: number, filled: boolean): boolean {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const rx = bounds.width / 2;
  const ry = bounds.height / 2;
  const dx = (point.x - cx) / (rx + threshold);
  const dy = (point.y - cy) / (ry + threshold);
  const outerDist = dx * dx + dy * dy;
  if (filled) return outerDist <= 1;
  const dxInner = (point.x - cx) / Math.max(1, rx - threshold);
  const dyInner = (point.y - cy) / Math.max(1, ry - threshold);
  const innerDist = dxInner * dxInner + dyInner * dyInner;
  return outerDist <= 1 && innerDist >= 1;
}

function hitTestDiamond(bounds: BoundingBox, point: Point, threshold: number, filled: boolean): boolean {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const hw = bounds.width / 2 + threshold;
  const hh = bounds.height / 2 + threshold;
  const dist = Math.abs(point.x - cx) / hw + Math.abs(point.y - cy) / hh;
  if (filled) return dist <= 1;
  const hwInner = Math.max(1, bounds.width / 2 - threshold);
  const hhInner = Math.max(1, bounds.height / 2 - threshold);
  const innerDist = Math.abs(point.x - cx) / hwInner + Math.abs(point.y - cy) / hhInner;
  return dist <= 1 && innerDist >= 1;
}

function hitTestPolyline(points: Point[], point: Point, threshold: number): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    if (distanceToSegment(point, points[i], points[i + 1]) <= threshold) {
      return true;
    }
  }
  return false;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Get the combined bounding box of multiple elements */
export function getMultiElementBounds(elements: WhiteboardElement[]): BoundingBox | null {
  if (elements.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const b = getElementBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Snap a value to the nearest grid increment */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Convert degrees to radians */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convert radians to degrees */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Normalize angle to [0, 2π) */
export function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}
