/**
 * Export and Import utilities for the whiteboard.
 * Supports PNG, SVG, and JSON formats.
 */

import { WhiteboardElement, ViewTransform, APP_VERSION, ImportedData } from '../types';
import { getMultiElementBounds } from './geometry';

// ─── JSON Export / Import ─────────────────────────────────────────────────────

export function exportToJSON(
  elements: WhiteboardElement[],
  viewTransform: ViewTransform
): string {
  const data: ImportedData = {
    appVersion: APP_VERSION,
    elements: elements.filter(el => !el.isDeleted),
    viewTransform,
  };
  return JSON.stringify(data, null, 2);
}

export function downloadJSON(
  elements: WhiteboardElement[],
  viewTransform: ViewTransform,
  filename = 'whiteboard.json'
): void {
  const json = exportToJSON(elements, viewTransform);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function importFromJSON(jsonString: string): ImportedData | null {
  try {
    const data = JSON.parse(jsonString);
    if (!data.elements || !Array.isArray(data.elements)) return null;
    return data as ImportedData;
  } catch {
    return null;
  }
}

// ─── PNG Export ───────────────────────────────────────────────────────────────

export async function exportToPNG(
  elements: WhiteboardElement[],
  scale = 2,
  padding = 20,
  background = true,
  filename = 'whiteboard.png'
): Promise<void> {
  const visible = elements.filter(el => !el.isDeleted);
  if (visible.length === 0) return;

  const bounds = getMultiElementBounds(visible);
  if (!bounds) return;

  const canvasWidth = (bounds.width + padding * 2) * scale;
  const canvasHeight = (bounds.height + padding * 2) * scale;

  const offscreen = document.createElement('canvas');
  offscreen.width = canvasWidth;
  offscreen.height = canvasHeight;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return;

  if (background) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  const transform: ViewTransform = {
    offsetX: (-bounds.x + padding) * scale,
    offsetY: (-bounds.y + padding) * scale,
    zoom: scale,
  };

  const { renderElements } = await import('../rendering/renderer');
  renderElements(ctx, visible, transform);

  offscreen.toBlob(blob => {
    if (blob) downloadBlob(blob, filename);
  }, 'image/png');
}

// ─── SVG Export ───────────────────────────────────────────────────────────────

export function exportToSVG(
  elements: WhiteboardElement[],
  padding = 20,
  background = true,
  filename = 'whiteboard.svg'
): void {
  const visible = elements.filter(el => !el.isDeleted);
  if (visible.length === 0) return;

  const bounds = getMultiElementBounds(visible);
  if (!bounds) return;

  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;
  const offsetX = -bounds.x + padding;
  const offsetY = -bounds.y + padding;

  const svgParts: string[] = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);

  if (background) {
    svgParts.push(`<rect width="${width}" height="${height}" fill="white"/>`);
  }

  svgParts.push(`<g transform="translate(${offsetX}, ${offsetY})">`);

  for (const el of visible) {
    svgParts.push(elementToSVG(el));
  }

  svgParts.push('</g>');
  svgParts.push('</svg>');

  const svgString = svgParts.join('\n');
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  downloadBlob(blob, filename);
}

function elementToSVG(element: WhiteboardElement): string {
  const { style, angle } = element;
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const transform = angle !== 0 ? ` transform="rotate(${(angle * 180) / Math.PI}, ${cx}, ${cy})"` : '';
  const opacity = style.opacity !== 100 ? ` opacity="${style.opacity / 100}"` : '';
  const stroke = `stroke="${style.strokeColor}"`;
  const strokeWidth = `stroke-width="${style.strokeWidth}"`;
  const fill = style.fillStyle !== 'none' && style.fillColor !== 'transparent'
    ? `fill="${style.fillColor}"`
    : 'fill="none"';
  const strokeDash = style.strokeStyle === 'dashed'
    ? ` stroke-dasharray="12,6"`
    : style.strokeStyle === 'dotted'
    ? ` stroke-dasharray="3,6"`
    : '';

  const commonAttrs = `${stroke} ${strokeWidth} ${fill}${strokeDash}${opacity}${transform}`;

  switch (element.type) {
    case 'rectangle':
      return `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" ${commonAttrs}/>`;

    case 'ellipse': {
      const rx = element.width / 2;
      const ry = element.height / 2;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${commonAttrs}/>`;
    }

    case 'diamond': {
      const pts = [
        `${cx},${element.y}`,
        `${element.x + element.width},${cy}`,
        `${cx},${element.y + element.height}`,
        `${element.x},${cy}`,
      ].join(' ');
      return `<polygon points="${pts}" ${commonAttrs}/>`;
    }

    case 'line':
    case 'arrow': {
      if (element.points.length < 2) return '';
      const pts = element.points.map(p => `${p.x + element.x},${p.y + element.y}`).join(' ');
      const marker = element.type === 'arrow' && element.endArrowhead === 'arrow'
        ? ` marker-end="url(#arrowhead)"`
        : '';
      return `<polyline points="${pts}" ${commonAttrs}${marker}/>`;
    }

    case 'pencil': {
      if (element.points.length < 2) return '';
      const d = element.points.map((p, i) => {
        const px = p.x + element.x;
        const py = p.y + element.y;
        return i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`;
      }).join(' ');
      return `<path d="${d}" stroke="${style.strokeColor}" stroke-width="${style.strokeWidth}" fill="none"${strokeDash}${opacity}${transform}/>`;
    }

    case 'text': {
      if (!element.text) return '';
      const fontFamily = element.style.fontFamily === 'hand'
        ? 'Caveat, cursive'
        : element.style.fontFamily === 'code'
        ? 'Fira Code, monospace'
        : 'Arial, sans-serif';
      const textAnchor = element.style.textAlign === 'center' ? 'middle'
        : element.style.textAlign === 'right' ? 'end' : 'start';
      let textX = element.x;
      if (element.style.textAlign === 'center') textX = cx;
      if (element.style.textAlign === 'right') textX = element.x + element.width;
      const lines = element.text.split('\n');
      const lineHeight = element.style.fontSize * 1.4;
      const tspans = lines.map((line, i) =>
        `<tspan x="${textX}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
      ).join('');
      return `<text x="${textX}" y="${element.y}" font-family="${fontFamily}" font-size="${element.style.fontSize}" fill="${style.strokeColor}" text-anchor="${textAnchor}"${opacity}${transform}>${tspans}</text>`;
    }

    default:
      return '';
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
