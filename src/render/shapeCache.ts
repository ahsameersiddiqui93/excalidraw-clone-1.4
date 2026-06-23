/**
 * render/shapeCache.ts
 * -----------------------------------------------------------------------------
 * Caches rough.js `Drawable` objects per element so we don't regenerate the
 * (relatively expensive) sketchy geometry on every animation frame. The cache
 * key combines the element id and its `version`, so any mutation invalidates
 * the cached drawable automatically.
 */

import rough from "roughjs";
import type { Drawable, Options } from "roughjs/bin/core";
import type { RoughGenerator } from "roughjs/bin/generator";
import type {
  DrawElement,
  LinearElement,
  StrokeStyle,
  WhiteboardElement,
} from "../types";
import { getElementBounds } from "../core/bounds";
import { hasPoints, isTextElement } from "../core/element";

/** Shared generator instance (does not require a canvas). */
const generator: RoughGenerator = rough.generator();

interface CacheEntry {
  version: number;
  drawable: Drawable | null;
}

const cache = new Map<string, CacheEntry>();

/** Map our StrokeStyle enum to a rough.js strokeLineDash pattern. */
function strokeDash(style: StrokeStyle, width: number): number[] | undefined {
  switch (style) {
    case "dashed":
      return [8 + width, 8 + width];
    case "dotted":
      return [1 + width, 4 + width];
    default:
      return undefined;
  }
}

/** Build the rough.js options object from an element's style. */
function toRoughOptions(element: WhiteboardElement): Options {
  const fillUsed =
    element.backgroundColor !== "transparent" && element.backgroundColor !== "";
  return {
    seed: element.seed,
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    roughness: element.roughness,
    fill: fillUsed ? element.backgroundColor : undefined,
    fillStyle: element.fillStyle,
    fillWeight: element.strokeWidth / 2,
    hachureGap: element.strokeWidth * 4,
    strokeLineDash: strokeDash(element.strokeStyle, element.strokeWidth),
    // Disable rough's own multistroke jitter when roughness is 0.
    disableMultiStroke: element.roughness === 0,
    preserveVertices: true,
  };
}

/** Generate a fresh rough Drawable for a given element (no caching). */
export function generateDrawable(
  element: WhiteboardElement,
): Drawable | null {
  if (isTextElement(element)) return null; // text drawn directly via canvas
  const opts = toRoughOptions(element);
  const b = getElementBounds(element);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;

  switch (element.type) {
    case "rectangle":
      return generator.rectangle(0, 0, w, h, opts);
    case "ellipse":
      return generator.ellipse(w / 2, h / 2, w, h, opts);
    case "diamond":
      return generator.polygon(
        [
          [w / 2, 0],
          [w, h / 2],
          [w / 2, h],
          [0, h / 2],
        ],
        opts,
      );
    case "line":
    case "arrow":
      return generateLinear(element, opts);
    case "draw":
      return generateFreehand(element, opts);
    default:
      return null;
  }
}

function generateLinear(element: LinearElement, opts: Options): Drawable {
  const pts = element.points.map((p) => [p.x, p.y] as [number, number]);
  return generator.linearPath(pts, opts);
}

function generateFreehand(element: DrawElement, opts: Options): Drawable {
  if (element.points.length < 2) {
    // A dot: draw a tiny filled circle.
    return generator.circle(
      element.points[0]?.x ?? 0,
      element.points[0]?.y ?? 0,
      Math.max(element.strokeWidth, 2),
      { ...opts, fill: element.strokeColor, fillStyle: "solid" },
    );
  }
  const pts = element.points.map((p) => [p.x, p.y] as [number, number]);
  return generator.curve(pts, { ...opts, roughness: 0 });
}

/**
 * Get the cached drawable for an element, regenerating only if the element's
 * version has changed since the last cache write.
 */
export function getDrawable(element: WhiteboardElement): Drawable | null {
  const cached = cache.get(element.id);
  if (cached && cached.version === element.version) {
    return cached.drawable;
  }
  const drawable = generateDrawable(element);
  cache.set(element.id, { version: element.version, drawable });
  return drawable;
}

/** Remove a single element from the cache (e.g. on deletion). */
export function invalidate(elementId: string): void {
  cache.delete(elementId);
}

/** Clear the entire cache (e.g. on scene replace / import). */
export function clearCache(): void {
  cache.clear();
}

/** Whether an element type even uses a cached drawable. */
export function usesDrawable(element: WhiteboardElement): boolean {
  return !isTextElement(element) && (hasPoints(element) || true);
}

export { generator };
