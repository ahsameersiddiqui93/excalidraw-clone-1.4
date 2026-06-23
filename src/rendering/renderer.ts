/**
 * Core canvas renderer.
 * Handles drawing all elements onto the HTML5 Canvas using rough.js for sketch style.
 */

import rough from 'roughjs';
import { RoughCanvas } from 'roughjs/bin/canvas';
import { Options as RoughOptions } from 'roughjs/bin/core';
import { getStroke } from 'perfect-freehand';
import {
  WhiteboardElement,
  ViewTransform,
  ElementStyle,
  RoughnessLevel,
  Point,
} from '../types';

// ─── Font Mapping ─────────────────────────────────────────────────────────────

const FONT_FAMILIES: Record<string, string> = {
  hand: '"Caveat", "Comic Sans MS", cursive',
  normal: '"Segoe UI", Arial, sans-serif',
  code: '"Fira Code", "Courier New", monospace',
};

// ─── Rough.js Options Builder ─────────────────────────────────────────────────

function getRoughOptions(style: ElementStyle, seed: number): RoughOptions {
  const dashArray = style.strokeStyle === 'dashed' ? [12, 6] : style.strokeStyle === 'dotted' ? [3, 6] : undefined;
  return {
    seed,
    roughness: style.roughness,
    stroke: style.strokeColor,
    strokeWidth: style.strokeWidth,
    fill: style.fillStyle !== 'none' && style.fillColor !== 'transparent' ? style.fillColor : undefined,
    fillStyle: style.fillStyle === 'hatch' ? 'hachure' : style.fillStyle === 'cross-hatch' ? 'cross-hatch' : style.fillStyle === 'solid' ? 'solid' : 'hachure',
    strokeLineDash: dashArray,
    fillWeight: style.strokeWidth * 0.5,
    hachureGap: style.strokeWidth * 4,
  };
}

// ─── Perfect Freehand Path Builder ───────────────────────────────────────────

function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q'] as (string | number)[]
  );
  d.push('Z');
  return d.join(' ');
}

// ─── Grid Renderer ────────────────────────────────────────────────────────────

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: ViewTransform,
  gridSize: number
): void {
  const { offsetX, offsetY, zoom } = transform;
  const scaledGrid = gridSize * zoom;

  if (scaledGrid < 8) return; // Don't render grid when too zoomed out

  ctx.save();
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
  ctx.lineWidth = 0.5;

  const startX = ((offsetX % scaledGrid) + scaledGrid) % scaledGrid;
  const startY = ((offsetY % scaledGrid) + scaledGrid) % scaledGrid;

  ctx.beginPath();
  for (let x = startX; x < width; x += scaledGrid) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = startY; y < height; y += scaledGrid) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}

// ─── Main Render Function ─────────────────────────────────────────────────────

export function renderElements(
  ctx: CanvasRenderingContext2D,
  elements: WhiteboardElement[],
  transform: ViewTransform
): void {
  const rc = rough.canvas(ctx.canvas);

  ctx.save();
  ctx.translate(transform.offsetX, transform.offsetY);
  ctx.scale(transform.zoom, transform.zoom);

  for (const element of elements) {
    if (element.isDeleted) continue;
    renderElement(ctx, rc, element);
  }

  ctx.restore();
}

function renderElement(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  element: WhiteboardElement
): void {
  ctx.save();
  ctx.globalAlpha = element.style.opacity / 100;

  // Apply rotation
  if (element.angle !== 0) {
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(element.angle);
    ctx.translate(-cx, -cy);
  }

  switch (element.type) {
    case 'rectangle':
      renderRectangle(ctx, rc, element);
      break;
    case 'ellipse':
      renderEllipse(ctx, rc, element);
      break;
    case 'diamond':
      renderDiamond(ctx, rc, element);
      break;
    case 'line':
      renderLine(ctx, rc, element);
      break;
    case 'arrow':
      renderArrow(ctx, rc, element);
      break;
    case 'pencil':
      renderPencil(ctx, element);
      break;
    case 'text':
      renderText(ctx, element);
      break;
  }

  ctx.restore();
}

function renderRectangle(ctx: CanvasRenderingContext2D, rc: RoughCanvas, element: WhiteboardElement): void {
  if (element.type !== 'rectangle') return;
  const opts = getRoughOptions(element.style, element.seed);
  rc.rectangle(element.x, element.y, element.width, element.height, opts);
}

function renderEllipse(ctx: CanvasRenderingContext2D, rc: RoughCanvas, element: WhiteboardElement): void {
  if (element.type !== 'ellipse') return;
  const opts = getRoughOptions(element.style, element.seed);
  rc.ellipse(
    element.x + element.width / 2,
    element.y + element.height / 2,
    element.width,
    element.height,
    opts
  );
}

function renderDiamond(ctx: CanvasRenderingContext2D, rc: RoughCanvas, element: WhiteboardElement): void {
  if (element.type !== 'diamond') return;
  const { x, y, width, height } = element;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const opts = getRoughOptions(element.style, element.seed);
  rc.polygon([
    [cx, y],
    [x + width, cy],
    [cx, y + height],
    [x, cy],
  ], opts);
}

function renderLine(ctx: CanvasRenderingContext2D, rc: RoughCanvas, element: WhiteboardElement): void {
  if (element.type !== 'line') return;
  if (element.points.length < 2) return;
  const opts = getRoughOptions(element.style, element.seed);
  const pts = element.points.map(p => [p.x + element.x, p.y + element.y] as [number, number]);
  if (pts.length === 2) {
    rc.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], opts);
  } else {
    rc.linearPath(pts, opts);
  }
}

function renderArrow(ctx: CanvasRenderingContext2D, rc: RoughCanvas, element: WhiteboardElement): void {
  if (element.type !== 'arrow') return;
  if (element.points.length < 2) return;
  const opts = getRoughOptions(element.style, element.seed);
  const pts = element.points.map(p => [p.x + element.x, p.y + element.y] as [number, number]);

  if (pts.length === 2) {
    rc.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], opts);
  } else {
    rc.linearPath(pts, opts);
  }

  // Draw arrowhead at end
  if (element.endArrowhead === 'arrow') {
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    drawArrowhead(ctx, prev, last, element.style);
  }
  // Draw arrowhead at start
  if (element.startArrowhead === 'arrow') {
    const first = pts[0];
    const second = pts[1];
    drawArrowhead(ctx, second, first, element.style);
  }
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  from: [number, number],
  to: [number, number],
  style: ElementStyle
): void {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const size = Math.max(12, style.strokeWidth * 4);
  const spread = Math.PI / 6;

  ctx.save();
  ctx.strokeStyle = style.strokeColor;
  ctx.fillStyle = style.strokeColor;
  ctx.lineWidth = style.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(to[0], to[1]);
  ctx.lineTo(
    to[0] - size * Math.cos(angle - spread),
    to[1] - size * Math.sin(angle - spread)
  );
  ctx.lineTo(
    to[0] - size * Math.cos(angle + spread),
    to[1] - size * Math.sin(angle + spread)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderPencil(ctx: CanvasRenderingContext2D, element: WhiteboardElement): void {
  if (element.type !== 'pencil') return;
  if (element.points.length < 2) return;

  const inputPoints = element.points.map((p, i) => [
    p.x + element.x,
    p.y + element.y,
    element.pressures[i] ?? 0.5,
  ]);

  const stroke = getStroke(inputPoints, {
    size: element.style.strokeWidth * 3,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: element.pressures.every(p => p === 0.5),
  });

  const pathData = getSvgPathFromStroke(stroke);
  const path = new Path2D(pathData);

  ctx.save();
  ctx.fillStyle = element.style.strokeColor;
  ctx.globalAlpha = element.style.opacity / 100;
  ctx.fill(path);
  ctx.restore();
}

function renderText(ctx: CanvasRenderingContext2D, element: WhiteboardElement): void {
  if (element.type !== 'text') return;
  if (!element.text && !element.isEditing) return;

  const fontFamily = FONT_FAMILIES[element.style.fontFamily] || FONT_FAMILIES.normal;
  ctx.save();
  ctx.font = `${element.style.fontSize}px ${fontFamily}`;
  ctx.fillStyle = element.style.strokeColor;
  ctx.globalAlpha = element.style.opacity / 100;
  ctx.textAlign = element.style.textAlign as CanvasTextAlign;
  ctx.textBaseline = 'top';

  const lines = element.text.split('\n');
  const lineHeight = element.style.fontSize * 1.4;
  let textX = element.x;
  if (element.style.textAlign === 'center') textX = element.x + element.width / 2;
  if (element.style.textAlign === 'right') textX = element.x + element.width;

  lines.forEach((line, i) => {
    ctx.fillText(line, textX, element.y + i * lineHeight);
  });

  ctx.restore();
}

// ─── Selection Overlay Renderer ───────────────────────────────────────────────

export function renderSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  elements: WhiteboardElement[],
  selectedIds: Set<string>,
  transform: ViewTransform,
  selectionBox: { x: number; y: number; width: number; height: number } | null
): void {
  ctx.save();
  ctx.translate(transform.offsetX, transform.offsetY);
  ctx.scale(transform.zoom, transform.zoom);

  // Draw individual element selection handles
  for (const element of elements) {
    if (!selectedIds.has(element.id) || element.isDeleted) continue;
    renderElementSelection(ctx, element, selectedIds.size === 1);
  }

  // Draw multi-selection bounding box
  if (selectedIds.size > 1) {
    const selected = elements.filter(el => selectedIds.has(el.id) && !el.isDeleted);
    if (selected.length > 0) {
      renderMultiSelectionBox(ctx, selected);
    }
  }

  // Draw rubber-band selection box
  if (selectionBox) {
    ctx.strokeStyle = '#4a90e2';
    ctx.fillStyle = 'rgba(74, 144, 226, 0.1)';
    ctx.lineWidth = 1 / transform.zoom;
    ctx.setLineDash([4 / transform.zoom, 4 / transform.zoom]);
    ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
    ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function renderElementSelection(
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement,
  showHandles: boolean
): void {
  const PADDING = 8;
  const HANDLE_SIZE = 8;
  const ROTATION_OFFSET = 24;

  let x: number, y: number, w: number, h: number;

  if (element.type === 'pencil' || element.type === 'line' || element.type === 'arrow') {
    const pts = element.points;
    if (!pts || pts.length === 0) {
      x = element.x; y = element.y; w = element.width; h = element.height;
    } else {
      const xs = pts.map(p => p.x + element.x);
      const ys = pts.map(p => p.y + element.y);
      x = Math.min(...xs) - PADDING;
      y = Math.min(...ys) - PADDING;
      w = Math.max(...xs) - x + PADDING;
      h = Math.max(...ys) - y + PADDING;
    }
  } else {
    x = element.x - PADDING;
    y = element.y - PADDING;
    w = element.width + PADDING * 2;
    h = element.height + PADDING * 2;
  }

  ctx.save();

  // Apply rotation for display
  if (element.angle !== 0) {
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(element.angle);
    ctx.translate(-cx, -cy);
  }

  // Selection border
  ctx.strokeStyle = '#4a90e2';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeRect(x, y, w, h);

  if (showHandles) {
    // Resize handles
    const handles = [
      { hx: x, hy: y },
      { hx: x + w / 2, hy: y },
      { hx: x + w, hy: y },
      { hx: x + w, hy: y + h / 2 },
      { hx: x + w, hy: y + h },
      { hx: x + w / 2, hy: y + h },
      { hx: x, hy: y + h },
      { hx: x, hy: y + h / 2 },
    ];

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 1.5;

    for (const { hx, hy } of handles) {
      ctx.beginPath();
      ctx.rect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.fill();
      ctx.stroke();
    }

    // Rotation handle
    const rotX = x + w / 2;
    const rotY = y - ROTATION_OFFSET;
    ctx.beginPath();
    ctx.moveTo(rotX, y);
    ctx.lineTo(rotX, rotY);
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rotX, rotY, HANDLE_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

function renderMultiSelectionBox(ctx: CanvasRenderingContext2D, elements: WhiteboardElement[]): void {
  const PADDING = 8;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const el of elements) {
    let bx: number, by: number, bw: number, bh: number;
    if (el.type === 'pencil' || el.type === 'line' || el.type === 'arrow') {
      const pts = el.points;
      if (!pts || pts.length === 0) { bx = el.x; by = el.y; bw = el.width; bh = el.height; }
      else {
        const xs = pts.map(p => p.x + el.x);
        const ys = pts.map(p => p.y + el.y);
        bx = Math.min(...xs); by = Math.min(...ys);
        bw = Math.max(...xs) - bx; bh = Math.max(...ys) - by;
      }
    } else {
      bx = el.x; by = el.y; bw = el.width; bh = el.height;
    }
    minX = Math.min(minX, bx);
    minY = Math.min(minY, by);
    maxX = Math.max(maxX, bx + bw);
    maxY = Math.max(maxY, by + bh);
  }

  ctx.strokeStyle = '#4a90e2';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeRect(
    minX - PADDING,
    minY - PADDING,
    maxX - minX + PADDING * 2,
    maxY - minY + PADDING * 2
  );
}
