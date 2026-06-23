/**
 * render/text.ts
 * -----------------------------------------------------------------------------
 * Text measurement helpers. A single offscreen 2D context is reused to measure
 * text dimensions so that text elements can be sized to fit their content.
 */

import { FONT_FAMILY_CSS } from "../constants";
import type { FontFamily } from "../types";

/** Line height multiplier relative to font size. */
const LINE_HEIGHT_RATIO = 1.25;

/** Line height (in px) for a given font size. */
export function getLineHeight(fontSize: number): number {
  return Math.round(fontSize * LINE_HEIGHT_RATIO);
}

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  measureCtx = canvas.getContext("2d");
  return measureCtx;
}

export interface TextMetrics {
  width: number;
  height: number;
}

/**
 * Measure the pixel width/height of multi-line text for a given font.
 * Falls back to a rough character-width estimate where no DOM is available
 * (e.g. in a non-jsdom test environment).
 */
export function measureText(
  text: string,
  fontSize: number,
  fontFamily: FontFamily,
): TextMetrics {
  const lines = text.length === 0 ? [""] : text.split("\n");
  const lineHeight = getLineHeight(fontSize);
  const height = lines.length * lineHeight;

  const ctx = getMeasureContext();
  if (!ctx) {
    // Heuristic fallback: ~0.6em per character.
    const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
    return { width: longest * fontSize * 0.6, height };
  }

  ctx.font = `${fontSize}px ${FONT_FAMILY_CSS[fontFamily]}`;
  let width = 0;
  for (const line of lines) {
    width = Math.max(width, ctx.measureText(line).width);
  }
  return { width: Math.ceil(width), height };
}
