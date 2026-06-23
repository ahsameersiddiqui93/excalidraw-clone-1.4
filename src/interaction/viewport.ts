/**
 * interaction/viewport.ts
 * -----------------------------------------------------------------------------
 * Wheel/trackpad handling and programmatic zoom helpers.
 *
 * Convention (matching most canvas editors):
 *  - Ctrl/Cmd + wheel  → zoom toward the cursor.
 *  - Pinch (ctrlKey set by the browser for trackpad pinch) → zoom.
 *  - Plain wheel       → pan (shift swaps axes).
 */

import { store } from "../state/store";
import { clamp } from "../utils/math";
import { zoomAtPoint } from "../utils/coordinates";
import { MAX_ZOOM, MIN_ZOOM } from "../constants";
import { getCommonBounds } from "../core/bounds";

/** Process a normalized wheel event relative to the canvas element. */
export function handleWheel(
  deltaX: number,
  deltaY: number,
  ctrlOrMeta: boolean,
  canvasX: number,
  canvasY: number,
): void {
  const vp = store.getState().viewport;

  if (ctrlOrMeta) {
    // Zoom. Negative deltaY = zoom in.
    const factor = Math.exp(-deltaY * 0.01);
    const zoom = clamp(vp.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    store.setViewport(zoomAtPoint(vp, zoom, canvasX, canvasY));
    return;
  }

  // Pan.
  store.setViewport({
    ...vp,
    scrollX: vp.scrollX - deltaX,
    scrollY: vp.scrollY - deltaY,
  });
}

/** Set an absolute zoom level, keeping the viewport center fixed. */
export function setZoom(zoom: number, centerX: number, centerY: number): void {
  const vp = store.getState().viewport;
  const clamped = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  store.setViewport(zoomAtPoint(vp, clamped, centerX, centerY));
}

/** Step zoom in/out by a fixed factor about a screen center. */
export function stepZoom(
  direction: 1 | -1,
  centerX: number,
  centerY: number,
): void {
  const vp = store.getState().viewport;
  const factor = direction === 1 ? 1.2 : 1 / 1.2;
  const zoom = clamp(vp.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  store.setViewport(zoomAtPoint(vp, zoom, centerX, centerY));
}

/** Reset zoom to 100% about a screen center. */
export function resetZoomTo100(centerX: number, centerY: number): void {
  const vp = store.getState().viewport;
  store.setViewport(zoomAtPoint(vp, 1, centerX, centerY));
}

/**
 * Fit all elements (or the selection) into the viewport with padding.
 * `width`/`height` are the canvas CSS dimensions.
 */
export function zoomToFit(
  width: number,
  height: number,
  padding = 80,
): void {
  const state = store.getState();
  const target =
    state.selectedIds.size > 0
      ? state.elements.filter((e) => state.selectedIds.has(e.id))
      : state.elements.filter((e) => !e.isDeleted);
  const bounds = getCommonBounds(target);
  if (!bounds) {
    store.setViewport({ scrollX: 0, scrollY: 0, zoom: 1 });
    return;
  }

  const bw = bounds.maxX - bounds.minX || 1;
  const bh = bounds.maxY - bounds.minY || 1;
  const zoom = clamp(
    Math.min((width - padding * 2) / bw, (height - padding * 2) / bh),
    MIN_ZOOM,
    MAX_ZOOM,
  );

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  store.setViewport({
    zoom,
    scrollX: width / 2 - centerX * zoom,
    scrollY: height / 2 - centerY * zoom,
  });
}
