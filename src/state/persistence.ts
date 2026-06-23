/**
 * state/persistence.ts
 * -----------------------------------------------------------------------------
 * LocalStorage autosave/restore for the scene. Stored data is validated
 * defensively on load so a corrupt entry can never crash the app.
 */

import type { SceneData, Viewport, WhiteboardElement } from "../types";
import { DEFAULT_VIEWPORT, STORAGE_KEY } from "../constants";

/** Persist the current scene to localStorage (best-effort, swallows errors). */
export function persistScene(scene: SceneData): void {
  if (typeof localStorage === "undefined") return;
  try {
    const payload = JSON.stringify(scene);
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // Quota exceeded or serialization issue — ignore (autosave is best-effort).
  }
}

/** Load a previously persisted scene, or null if none/invalid. */
export function loadScene(): SceneData | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return normalizeScene(parsed);
  } catch {
    return null;
  }
}

/** Remove the persisted scene. */
export function clearPersistedScene(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Validate and normalize an unknown value into a SceneData, or return null.
 * Only structurally checks the parts we depend on.
 */
export function normalizeScene(value: unknown): SceneData | null {
  if (typeof value !== "object" || value === null) return null;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.elements)) return null;

  const elements = obj.elements.filter(isElementLike) as WhiteboardElement[];
  const viewport = normalizeViewport(obj.viewport);
  return { elements, viewport };
}

function normalizeViewport(value: unknown): Viewport {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_VIEWPORT };
  }
  const v = value as Record<string, unknown>;
  return {
    scrollX: typeof v.scrollX === "number" ? v.scrollX : 0,
    scrollY: typeof v.scrollY === "number" ? v.scrollY : 0,
    zoom: typeof v.zoom === "number" && v.zoom > 0 ? v.zoom : 1,
  };
}

/** Minimal structural guard for a persisted element. */
function isElementLike(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.type === "string" &&
    typeof e.x === "number" &&
    typeof e.y === "number"
  );
}
