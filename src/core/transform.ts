/**
 * core/transform.ts
 * -----------------------------------------------------------------------------
 * Geometry for interactive transforms: moving, resizing (via the 8 handles),
 * and rotating elements. All functions are pure and operate in scene space.
 */

import type {
  Bounds,
  Point,
  TransformHandle,
  WhiteboardElement,
} from "../types";
import { getCommonBounds } from "./bounds";
import { mutateElement } from "./element";
import { hasPoints } from "./element";

/** Translate an element by (dx, dy) scene units. */
export function translateElement<T extends WhiteboardElement>(
  element: T,
  dx: number,
  dy: number,
): T {
  return mutateElement(element, {
    x: element.x + dx,
    y: element.y + dy,
  } as Partial<T>);
}

/**
 * The eight resize handles plus rotate, positioned around a (screen-space)
 * bounding box. Returned in scene coordinates given the selection bounds.
 */
export interface HandlePoint {
  handle: TransformHandle;
  x: number;
  y: number;
}

export function getResizeHandles(bounds: Bounds): HandlePoint[] {
  const { minX, minY, maxX, maxY } = bounds;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return [
    { handle: "nw", x: minX, y: minY },
    { handle: "n", x: midX, y: minY },
    { handle: "ne", x: maxX, y: minY },
    { handle: "e", x: maxX, y: midY },
    { handle: "se", x: maxX, y: maxY },
    { handle: "s", x: midX, y: maxY },
    { handle: "sw", x: minX, y: maxY },
    { handle: "w", x: minX, y: midY },
  ];
}

/**
 * Resize a single element to fit a new bounds. Geometry (including point lists
 * for linear/draw elements) is scaled proportionally from the old to new box.
 */
export function resizeElementToBounds<T extends WhiteboardElement>(
  element: T,
  oldBounds: Bounds,
  newBounds: Bounds,
): T {
  const oldW = oldBounds.maxX - oldBounds.minX || 1;
  const oldH = oldBounds.maxY - oldBounds.minY || 1;
  const newW = newBounds.maxX - newBounds.minX;
  const newH = newBounds.maxY - newBounds.minY;
  const scaleX = newW / oldW;
  const scaleY = newH / oldH;

  const nx = newBounds.minX + (element.x - oldBounds.minX) * scaleX;
  const ny = newBounds.minY + (element.y - oldBounds.minY) * scaleY;

  const updates: Partial<WhiteboardElement> & { points?: Point[] } = {
    x: nx,
    y: ny,
    width: element.width * scaleX,
    height: element.height * scaleY,
  };

  if (hasPoints(element)) {
    updates.points = element.points.map((p) => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
    }));
  }

  return mutateElement(element, updates as Partial<T>);

}

/**
 * Given an active resize handle and the pointer position, compute the new
 * selection bounds. Optionally lock the aspect ratio (e.g. when Shift is held).
 */
export function computeResizedBounds(
  handle: TransformHandle,
  original: Bounds,
  pointer: Point,
  keepAspect: boolean,
): Bounds {
  let { minX, minY, maxX, maxY } = original;

  switch (handle) {
    case "nw":
      minX = pointer.x;
      minY = pointer.y;
      break;
    case "ne":
      maxX = pointer.x;
      minY = pointer.y;
      break;
    case "se":
      maxX = pointer.x;
      maxY = pointer.y;
      break;
    case "sw":
      minX = pointer.x;
      maxY = pointer.y;
      break;
    case "n":
      minY = pointer.y;
      break;
    case "s":
      maxY = pointer.y;
      break;
    case "e":
      maxX = pointer.x;
      break;
    case "w":
      minX = pointer.x;
      break;
    case "rotate":
      return original;
    default:
      break;
  }

  if (keepAspect && handle.length === 2) {
    const aspect =
      (original.maxX - original.minX) / (original.maxY - original.minY || 1);
    const w = maxX - minX;
    const h = maxY - minY;
    if (Math.abs(w) > Math.abs(h * aspect)) {
      const newH = w / aspect;
      if (handle.includes("n")) minY = maxY - newH;
      else maxY = minY + newH;
    } else {
      const newW = h * aspect;
      if (handle.includes("w")) minX = maxX - newW;
      else maxX = minX + newW;
    }
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Rotate every element in a selection around the selection center by `delta`
 * radians, also rotating each element's own position about that center.
 */
export function rotateSelection(
  elements: WhiteboardElement[],
  center: Point,
  delta: number,
): WhiteboardElement[] {
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);
  return elements.map((el) => {
    const ecx = el.x + el.width / 2;
    const ecy = el.y + el.height / 2;
    const dx = ecx - center.x;
    const dy = ecy - center.y;
    const ncx = center.x + dx * cos - dy * sin;
    const ncy = center.y + dx * sin + dy * cos;
    return mutateElement(el, {
      x: ncx - el.width / 2,
      y: ncy - el.height / 2,
      angle: el.angle + delta,
    });
  });
}

/** Convenience: the bounds enclosing a selection (or null when empty). */
export function getSelectionBounds(
  elements: WhiteboardElement[],
): Bounds | null {
  return getCommonBounds(elements);
}
