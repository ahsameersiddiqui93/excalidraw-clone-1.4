/**
 * constants.ts
 * -----------------------------------------------------------------------------
 * Application-wide constants and default values.
 */

import type { ElementStyle, Viewport } from "./types";

/** Document/export format version. Bump on breaking serialization changes. */
export const FILE_VERSION = 1;
export const FILE_SOURCE = "infinite-whiteboard";

/** Zoom limits and step. */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 30;
export const ZOOM_STEP = 0.1;

/** Pixel distance (in screen space) for hit-testing tolerance. */
export const HIT_THRESHOLD = 10;

/** Size of selection transform handles, in screen pixels. */
export const HANDLE_SIZE = 8;

/** Distance from the bounding box top to the rotation handle, in screen px. */
export const ROTATE_HANDLE_OFFSET = 24;

/** Minimum size (scene units) below which a freshly-drawn shape is discarded. */
export const MIN_DRAG_SIZE = 2;

/** Default amount (scene units) a duplicated element is offset by. */
export const DUPLICATE_OFFSET = 10;

/** Default style applied to newly created elements. */
export const DEFAULT_STYLE: ElementStyle = {
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "hachure",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  fontSize: 20,
  fontFamily: "hand-drawn",
  textAlign: "left",
};

/** Default viewport: origin at the center is handled by the canvas at runtime. */
export const DEFAULT_VIEWPORT: Viewport = {
  scrollX: 0,
  scrollY: 0,
  zoom: 1,
};

/** A small, curated stroke color palette for the properties panel. */
export const STROKE_PALETTE = [
  "#1e1e1e",
  "#e03131",
  "#2f9e44",
  "#1971c2",
  "#f08c00",
];

/** A small, curated background/fill color palette. */
export const BACKGROUND_PALETTE = [
  "transparent",
  "#ffc9c9",
  "#b2f2bb",
  "#a5d8ff",
  "#ffec99",
];

/** Maps font family enum to a CSS font stack. */
export const FONT_FAMILY_CSS: Record<string, string> = {
  "hand-drawn": '"Segoe Print", "Bradley Hand", Chilanka, cursive',
  normal: 'Helvetica, Arial, sans-serif',
  code: '"Cascadia Code", "Fira Code", Consolas, monospace',
};

/** Maximum number of undo/redo entries retained. */
export const HISTORY_LIMIT = 200;

/** LocalStorage key for autosaving the scene. */
export const STORAGE_KEY = "infinite-whiteboard:scene";
