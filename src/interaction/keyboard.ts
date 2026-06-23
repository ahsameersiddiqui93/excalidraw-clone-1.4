/**
 * interaction/keyboard.ts
 * -----------------------------------------------------------------------------
 * Global keyboard shortcut handling. Returns true if the event was handled so
 * the caller can preventDefault. Tool single-key shortcuts mirror common
 * whiteboard conventions (v/r/o/d/l/a/p/t).
 */

import type { ToolType } from "../types";
import { store } from "../state/store";
import { clamp } from "../utils/math";
import { MAX_ZOOM, MIN_ZOOM } from "../constants";

/** Map single keys to tools. */
const TOOL_KEYS: Record<string, ToolType> = {
  v: "selection",
  "1": "selection",
  r: "rectangle",
  "2": "rectangle",
  o: "ellipse",
  "3": "ellipse",
  d: "diamond",
  "4": "diamond",
  l: "line",
  "5": "line",
  a: "arrow",
  "6": "arrow",
  p: "draw",
  "7": "draw",
  t: "text",
  "8": "text",
  e: "eraser",
  h: "pan",
};

/** Whether the event target is a text input where we should ignore shortcuts. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    target.isContentEditable
  );
}

/**
 * Handle a keydown event. Returns true when handled (caller preventDefaults).
 */
export function handleKeyDown(e: KeyboardEvent): boolean {
  // Never hijack typing inside inputs/textareas (e.g. the text editor).
  if (isEditableTarget(e.target)) return false;

  const mod = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();

  // --- Modifier combos ---------------------------------------------------
  if (mod) {
    switch (key) {
      case "z":
        if (e.shiftKey) store.redo();
        else store.undo();
        return true;
      case "y":
        store.redo();
        return true;
      case "c":
        store.copySelected();
        return true;
      case "x":
        store.cutSelected();
        return true;
      case "v":
        store.paste();
        return true;
      case "a":
        store.selectAll();
        return true;
      case "d":
        store.duplicateSelected();
        return true;
      case "g":
        if (e.shiftKey) store.ungroup();
        else store.group();
        return true;
      case "]":
        store.arrange(e.shiftKey ? "front" : "forward");
        return true;
      case "[":
        store.arrange(e.shiftKey ? "back" : "backward");
        return true;
      case "=":
      case "+":
        zoomBy(0.1);
        return true;
      case "-":
        zoomBy(-0.1);
        return true;
      case "0":
        resetZoom();
        return true;
      default:
        return false;
    }
  }

  // --- Plain keys --------------------------------------------------------
  switch (e.key) {
    case "Delete":
    case "Backspace":
      store.deleteSelected();
      return true;
    case "Escape":
      store.clearSelection();
      store.setEditingText(null);
      return true;
    default:
      break;
  }

  // Arrow-key nudging of the selection.
  const nudge = e.shiftKey ? 10 : 1;
  if (e.key === "ArrowLeft") return nudgeSelection(-nudge, 0);
  if (e.key === "ArrowRight") return nudgeSelection(nudge, 0);
  if (e.key === "ArrowUp") return nudgeSelection(0, -nudge);
  if (e.key === "ArrowDown") return nudgeSelection(0, nudge);

  // Tool shortcuts.
  const tool = TOOL_KEYS[key];
  if (tool) {
    store.setTool(tool);
    return true;
  }

  return false;
}

function nudgeSelection(dx: number, dy: number): boolean {
  const state = store.getState();
  if (state.selectedIds.size === 0) return false;
  const elements = state.elements.map((el) =>
    state.selectedIds.has(el.id)
      ? { ...el, x: el.x + dx, y: el.y + dy, version: el.version + 1 }
      : el,
  );
  store.replaceElements(elements);
  store.commit();
  return true;
}

/** Zoom centered on the viewport's current scroll origin. */
function zoomBy(delta: number): void {
  const vp = store.getState().viewport;
  const zoom = clamp(vp.zoom + delta, MIN_ZOOM, MAX_ZOOM);
  store.setViewport({ ...vp, zoom });
}

function resetZoom(): void {
  const vp = store.getState().viewport;
  store.setViewport({ ...vp, zoom: 1 });
}
