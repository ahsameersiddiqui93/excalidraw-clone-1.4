/**
 * render/renderer.ts
 * -----------------------------------------------------------------------------
 * The scene renderer. Draws the full scene to a 2D canvas context each frame:
 *   1. Clears and paints the background.
 *   2. Applies the viewport transform (scroll + zoom).
 *   3. Renders an optional dotted grid.
 *   4. Renders each element (rough shapes via cache, text directly).
 *   5. Renders selection overlays (outline, handles, marquee).
 *
 * Rendering is intentionally a pure function of (elements, viewport, overlay):
 * it holds no mutable state of its own beyond the shared shape cache.
 */

import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type {
  Bounds,
  Point,
  TextElement,
  Viewport,
  WhiteboardElement,
} from "../types";
import { getDrawable } from "./shapeCache";
import {
  getElementBounds,
  getElementCenter,
} from "../core/bounds";
import { isTextElement } from "../core/element";
import { FONT_FAMILY_CSS, HANDLE_SIZE, ROTATE_HANDLE_OFFSET } from "../constants";
import { getResizeHandles } from "../core/transform";
import { measureText, getLineHeight } from "./text";

/** Visual overlay information passed to the renderer each frame. */
export interface RenderOverlay {
  selectionBounds: Bounds | null;
  selectedIds: Set<string>;
  /** Marquee rectangle (scene coords) while box-selecting. */
  marquee: Bounds | null;
  /** Whether to draw the dotted background grid. */
  showGrid: boolean;
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  rc: RoughCanvas;
  width: number;
  height: number;
  devicePixelRatio: number;
}

/** Create a RoughCanvas bound to a canvas element. */
export function createRoughCanvas(canvas: HTMLCanvasElement): RoughCanvas {
  return rough.canvas(canvas);
}

/** Main entry point: render the whole scene + overlays. */
export function renderScene(
  rctx: RenderContext,
  elements: WhiteboardElement[],
  viewport: Viewport,
  overlay: RenderOverlay,
): void {
  const { ctx, width, height, devicePixelRatio } = rctx;

  // Reset transform and clear to the page background.
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Apply the viewport transform: scene -> screen.
  ctx.save();
  ctx.translate(viewport.scrollX, viewport.scrollY);
  ctx.scale(viewport.zoom, viewport.zoom);

  if (overlay.showGrid) {
    drawGrid(ctx, viewport, width, height, devicePixelRatio);
  }

  for (const element of elements) {
    if (element.isDeleted) continue;
    drawElement(rctx, element);
  }

  ctx.restore();

  // Overlays are drawn in screen space (so handle size is zoom-independent).
  drawOverlays(rctx, viewport, overlay);
}

/** Draw a single element, applying rotation and opacity. */
function drawElement(
  rctx: RenderContext,
  element: WhiteboardElement,
): void {
  const { ctx, rc } = rctx;
  ctx.save();
  ctx.globalAlpha = element.opacity / 100;

  if (element.angle !== 0) {
    const c = getElementCenter(element);
    ctx.translate(c.x, c.y);
    ctx.rotate(element.angle);
    ctx.translate(-c.x, -c.y);
  }

  if (isTextElement(element)) {
    drawText(ctx, element);
  } else {
    const b = getElementBounds(element);
    ctx.save();
    ctx.translate(b.minX, b.minY);
    const drawable = getDrawable(element);
    if (drawable) rc.draw(drawable);
    ctx.restore();

    if (element.type === "arrow") {
      drawArrowhead(ctx, element);
    }
  }

  ctx.restore();
}

/** Render multi-line text using the 2D context. */
function drawText(
  ctx: CanvasRenderingContext2D,
  element: TextElement,
): void {
  const font = `${element.fontSize}px ${FONT_FAMILY_CSS[element.fontFamily]}`;
  ctx.font = font;
  ctx.fillStyle = element.strokeColor;
  ctx.textBaseline = "top";
  ctx.textAlign = element.textAlign;

  const lineHeight = getLineHeight(element.fontSize);
  const lines = element.text.split("\n");

  let anchorX = element.x;
  if (element.textAlign === "center") anchorX = element.x + element.width / 2;
  else if (element.textAlign === "right") anchorX = element.x + element.width;

  lines.forEach((line, i) => {
    ctx.fillText(line, anchorX, element.y + i * lineHeight);
  });
}

/** Draw a simple two-stroke arrowhead at the end of an arrow element. */
function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement,
): void {
  if (element.type !== "arrow" || !("points" in element)) return;
  const pts = element.points;
  if (pts.length < 2) return;

  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const tipX = element.x + tip.x;
  const tipY = element.y + tip.y;
  const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  const size = 12 + element.strokeWidth * 2;
  const spread = Math.PI / 7;

  ctx.save();
  ctx.strokeStyle = element.strokeColor;
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - size * Math.cos(angle - spread),
    tipY - size * Math.sin(angle - spread),
  );
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - size * Math.cos(angle + spread),
    tipY - size * Math.sin(angle + spread),
  );
  ctx.stroke();
  ctx.restore();
}

/** Draw a subtle dotted grid spanning the visible scene region. */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  width: number,
  height: number,
  dpr: number,
): void {
  const gridSize = 20;
  const left = -viewport.scrollX / viewport.zoom;
  const top = -viewport.scrollY / viewport.zoom;
  const right = (width / dpr - viewport.scrollX) / viewport.zoom;
  const bottom = (height / dpr - viewport.scrollY) / viewport.zoom;

  const startX = Math.floor(left / gridSize) * gridSize;
  const startY = Math.floor(top / gridSize) * gridSize;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  const r = 1 / viewport.zoom;
  for (let x = startX; x < right; x += gridSize) {
    for (let y = startY; y < bottom; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Draw selection outlines, resize handles, and the marquee rectangle. */
function drawOverlays(
  rctx: RenderContext,
  viewport: Viewport,
  overlay: RenderOverlay,
): void {
  const { ctx } = rctx;
  const toScreen = (x: number, y: number): Point => ({
    x: x * viewport.zoom + viewport.scrollX,
    y: y * viewport.zoom + viewport.scrollY,
  });

  // Marquee (box-select) rectangle.
  if (overlay.marquee) {
    const a = toScreen(overlay.marquee.minX, overlay.marquee.minY);
    const b = toScreen(overlay.marquee.maxX, overlay.marquee.maxY);
    ctx.save();
    ctx.fillStyle = "rgba(58,130,247,0.10)";
    ctx.strokeStyle = "rgba(58,130,247,0.9)";
    ctx.lineWidth = 1;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.restore();
  }

  // Selection bounding box + handles.
  if (overlay.selectionBounds) {
    const b = overlay.selectionBounds;
    const tl = toScreen(b.minX, b.minY);
    const br = toScreen(b.maxX, b.maxY);
    const w = br.x - tl.x;
    const h = br.y - tl.y;

    ctx.save();
    ctx.strokeStyle = "#3a82f7";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tl.x, tl.y, w, h);

    // Rotation handle stem + knob.
    const cx = tl.x + w / 2;
    ctx.beginPath();
    ctx.moveTo(cx, tl.y);
    ctx.lineTo(cx, tl.y - ROTATE_HANDLE_OFFSET);
    ctx.stroke();
    drawHandleDot(ctx, cx, tl.y - ROTATE_HANDLE_OFFSET);

    // Resize handles.
    const handles = getResizeHandles({
      minX: tl.x,
      minY: tl.y,
      maxX: br.x,
      maxY: br.y,
    });
    for (const handle of handles) {
      drawHandleSquare(ctx, handle.x, handle.y);
    }
    ctx.restore();
  }
}

function drawHandleSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  const s = HANDLE_SIZE;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#3a82f7";
  ctx.lineWidth = 1.5;
  ctx.fillRect(x - s / 2, y - s / 2, s, s);
  ctx.strokeRect(x - s / 2, y - s / 2, s, s);
}

function drawHandleDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#3a82f7";
  ctx.lineWidth = 1.5;
  ctx.arc(x, y, HANDLE_SIZE / 2 + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Re-export text measurement so callers can size text elements. */
export { measureText };
