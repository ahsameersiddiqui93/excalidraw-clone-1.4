/**
 * state/history.ts
 * -----------------------------------------------------------------------------
 * Undo/redo history for the element array. Snapshots are stored as immutable
 * element arrays. We push a new snapshot only when the elements actually
 * change, and we cap the stack at HISTORY_LIMIT entries.
 *
 * The viewport is intentionally *not* part of history: panning/zooming should
 * not be undoable, matching common whiteboard UX.
 */

import type { WhiteboardElement } from "../types";
import { HISTORY_LIMIT } from "../constants";

export class History {
  private past: WhiteboardElement[][] = [];
  private future: WhiteboardElement[][] = [];

  /** Record a new committed state, clearing the redo stack. */
  record(elements: WhiteboardElement[]): void {
    this.past.push(elements);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
  }

  get canUndo(): boolean {
    return this.past.length > 1;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * Undo: move the current state to the redo stack and return the previous
   * snapshot. Returns null if there's nothing to undo.
   */
  undo(): WhiteboardElement[] | null {
    if (!this.canUndo) return null;
    const current = this.past.pop()!;
    this.future.push(current);
    return this.past[this.past.length - 1];
  }

  /** Redo: re-apply the most recently undone snapshot. */
  redo(): WhiteboardElement[] | null {
    if (!this.canRedo) return null;
    const next = this.future.pop()!;
    this.past.push(next);
    return next;
  }

  /** Reset history to a single baseline snapshot. */
  reset(elements: WhiteboardElement[]): void {
    this.past = [elements];
    this.future = [];
  }
}
