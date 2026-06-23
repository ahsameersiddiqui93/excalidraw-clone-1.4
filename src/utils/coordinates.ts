/**
 * utils/coordinates.ts
 * -----------------------------------------------------------------------------
 * Conversions between *screen* coordinates (CSS pixels relative to the canvas
 * element) and *scene* coordinates (the infinite world space).
 *
 * The transform is: screen = scene * zoom + scroll
 * Therefore:        scene  = (screen - scroll) / zoom
 */

import type { Point, Viewport } from "../types";

/** Convert a screen-space point to scene-space. */
export function screenToScene(
  screenX: number,
  screenY: number,
  viewport: Viewport,
): Point {
  return {
    x: (screenX - viewport.scrollX) / viewport.zoom,
    y: (screenY - viewport.scrollY) / viewport.zoom,
  };
}

/** Convert a scene-space point to screen-space. */
export function sceneToScreen(
  sceneX: number,
  sceneY: number,
  viewport: Viewport,
): Point {
  return {
    x: sceneX * viewport.zoom + viewport.scrollX,
    y: sceneY * viewport.zoom + viewport.scrollY,
  };
}

/**
 * Compute a new viewport that zooms toward a fixed screen anchor point so the
 * world point under the cursor stays visually stationary.
 */
export function zoomAtPoint(
  viewport: Viewport,
  newZoom: number,
  anchorScreenX: number,
  anchorScreenY: number,
): Viewport {
  // Scene point currently under the anchor.
  const scene = screenToScene(anchorScreenX, anchorScreenY, viewport);
  // Solve for new scroll so that scene maps back to the same screen anchor.
  return {
    zoom: newZoom,
    scrollX: anchorScreenX - scene.x * newZoom,
    scrollY: anchorScreenY - scene.y * newZoom,
  };
}
