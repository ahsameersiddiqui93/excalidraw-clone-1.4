/**
 * io/exportImage.ts
 * -----------------------------------------------------------------------------
 * PNG and SVG export. Both render only the bounding box of the (non-deleted)
 * elements with configurable padding so exports are tightly cropped.
 *
 *  - PNG: render to an offscreen canvas at a chosen pixel scale, then toBlob.
 *  - SVG: use rough.js's SVG generator to produce vector paths, then assemble
 *    an <svg> document by hand (text elements become <text> nodes).
 */

import rough from "roughjs";
import type { RoughSVG } from "roughjs/bin/svg";
import type { TextElement, WhiteboardElement } from "../types";
import { getCommonBounds, getElementBounds, getElementCenter } from "../core/bounds";
import { generateDrawable } from "../render/shapeCache";
import { isTextElement } from "../core/element";
import { FONT_FAMILY_CSS } from "../constants";
import { getLineHeight } from "../render/text";
import { createRoughCanvas } from "../render/renderer";
import { downloadBlob } from "./serialize";

export interface ExportOptions {
  padding?: number;
  /** PNG pixel scale (1 = CSS px). */
  scale?: number;
  /** Background color; null/undefined = transparent. */
  background?: string | null;
}

/** Compute the export viewport (origin + size) from element bounds. */
function exportBox(
  elements: WhiteboardElement[],
  padding: number,
): { x: number; y: number; width: number; height: number } | null {
  const visible = elements.filter((e) => !e.isDeleted);
  const bounds = getCommonBounds(visible);
  if (!bounds) return null;
  return {
    x: bounds.minX - padding,
    y: bounds.minY - padding,
    width: bounds.maxX - bounds.minX + padding * 2,
    height: bounds.maxY - bounds.minY + padding * 2,
  };
}

/**
 * Render the given elements to an offscreen canvas and return it.
 * The canvas is translated so the export box origin maps to (0,0).
 */
export function renderToCanvas(
  elements: WhiteboardElement[],
  options: ExportOptions = {},
): HTMLCanvasElement | null {
  const padding = options.padding ?? 16;
  const scale = options.scale ?? 2;
  const box = exportBox(elements, padding);
  if (!box) return null;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(box.width * scale);
  canvas.height = Math.ceil(box.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.scale(scale, scale);
  ctx.translate(-box.x, -box.y);

  const rc = createRoughCanvas(canvas);

  for (const element of elements) {
    if (element.isDeleted) continue;
    ctx.save();
    ctx.globalAlpha = element.opacity / 100;
    if (element.angle !== 0) {
      const c = getElementCenter(element);
      ctx.translate(c.x, c.y);
      ctx.rotate(element.angle);
      ctx.translate(-c.x, -c.y);
    }
    if (isTextElement(element)) {
      drawTextToCtx(ctx, element);
    } else {
      const b = getElementBounds(element);
      ctx.save();
      ctx.translate(b.minX, b.minY);
      const drawable = generateDrawable(element);
      if (drawable) rc.draw(drawable);
      ctx.restore();
    }
    ctx.restore();
  }

  return canvas;
}

function drawTextToCtx(
  ctx: CanvasRenderingContext2D,
  element: TextElement,
): void {
  ctx.font = `${element.fontSize}px ${FONT_FAMILY_CSS[element.fontFamily]}`;
  ctx.fillStyle = element.strokeColor;
  ctx.textBaseline = "top";
  ctx.textAlign = element.textAlign;
  const lineHeight = getLineHeight(element.fontSize);
  let anchorX = element.x;
  if (element.textAlign === "center") anchorX = element.x + element.width / 2;
  else if (element.textAlign === "right") anchorX = element.x + element.width;
  element.text.split("\n").forEach((line, i) => {
    ctx.fillText(line, anchorX, element.y + i * lineHeight);
  });
}

/** Export the scene as a PNG Blob. Resolves to null when there's nothing. */
export function exportToPNGBlob(
  elements: WhiteboardElement[],
  options: ExportOptions = {},
): Promise<Blob | null> {
  const canvas = renderToCanvas(elements, {
    background: "#ffffff",
    ...options,
  });
  if (!canvas) return Promise.resolve(null);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Export + download a PNG file. */
export async function downloadPNG(
  elements: WhiteboardElement[],
  filename = "whiteboard.png",
  options: ExportOptions = {},
): Promise<void> {
  const blob = await exportToPNGBlob(elements, options);
  if (blob) downloadBlob(filename, blob);
}

/** Produce an SVG document string for the scene. */
export function exportToSVG(
  elements: WhiteboardElement[],
  options: ExportOptions = {},
): string | null {
  const padding = options.padding ?? 16;
  const box = exportBox(elements, padding);
  if (!box) return null;

  // A throwaway <svg> host for rough's SVG generator.
  const svgNs = "http://www.w3.org/2000/svg";
  const host = document.createElementNS(svgNs, "svg");
  const rc: RoughSVG = rough.svg(host as SVGSVGElement);

  const parts: string[] = [];
  if (options.background) {
    parts.push(
      `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${options.background}" />`,
    );
  }

  for (const element of elements) {
    if (element.isDeleted) continue;
    const transform = elementTransform(element);
    if (isTextElement(element)) {
      parts.push(`<g${transform}>${textToSVG(element)}</g>`);
      continue;
    }
    const b = getElementBounds(element);
    const drawable = generateDrawable(element);
    if (!drawable) continue;
    const node = rc.draw(drawable);
    const inner = node.innerHTML;
    parts.push(
      `<g transform="translate(${b.minX} ${b.minY})" opacity="${
        element.opacity / 100
      }"${transform ? "" : ""}>${inner}</g>`,
    );
  }

  return [
    `<svg xmlns="${svgNs}" width="${box.width}" height="${box.height}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">`,
    ...parts,
    `</svg>`,
  ].join("\n");
}

/** Build an SVG transform attribute for element rotation. */
function elementTransform(element: WhiteboardElement): string {
  if (element.angle === 0) return "";
  const c = getElementCenter(element);
  const deg = (element.angle * 180) / Math.PI;
  return ` transform="rotate(${deg} ${c.x} ${c.y})"`;
}

function textToSVG(element: TextElement): string {
  const lineHeight = getLineHeight(element.fontSize);
  const anchor =
    element.textAlign === "center"
      ? "middle"
      : element.textAlign === "right"
        ? "end"
        : "start";
  let x = element.x;
  if (element.textAlign === "center") x = element.x + element.width / 2;
  else if (element.textAlign === "right") x = element.x + element.width;

  return element.text
    .split("\n")
    .map((line, i) => {
      const y = element.y + i * lineHeight + element.fontSize * 0.8;
      return `<text x="${x}" y="${y}" fill="${element.strokeColor}" font-size="${element.fontSize}" font-family="${FONT_FAMILY_CSS[element.fontFamily]}" text-anchor="${anchor}">${escapeXML(line)}</text>`;
    })
    .join("");
}

function escapeXML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Export + download an SVG file. */
export function downloadSVG(
  elements: WhiteboardElement[],
  filename = "whiteboard.svg",
  options: ExportOptions = {},
): void {
  const svg = exportToSVG(elements, { background: "#ffffff", ...options });
  if (!svg) return;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  downloadBlob(filename, blob);
}
