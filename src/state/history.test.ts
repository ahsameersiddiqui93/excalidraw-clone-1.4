/**
 * state/history.test.ts
 * -----------------------------------------------------------------------------
 * Tests for the undo/redo history stack semantics.
 */

import { describe, expect, it } from "vitest";
import { History } from "./history";
import type { WhiteboardElement } from "../types";

// Minimal fake elements; only identity matters for these tests.
const mk = (id: string) => ({ id }) as unknown as WhiteboardElement;

describe("History", () => {
  it("cannot undo with only a baseline snapshot", () => {
    const h = new History();
    h.reset([mk("a")]);
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });

  it("undoes and redoes a single change", () => {
    const h = new History();
    const s0 = [mk("a")];
    const s1 = [mk("a"), mk("b")];
    h.reset(s0);
    h.record(s1);

    expect(h.canUndo).toBe(true);
    expect(h.undo()).toBe(s0);
    expect(h.canRedo).toBe(true);
    expect(h.redo()).toBe(s1);
  });

  it("clears the redo stack after a new record", () => {
    const h = new History();
    h.reset([mk("a")]);
    h.record([mk("b")]);
    h.undo();
    expect(h.canRedo).toBe(true);
    h.record([mk("c")]);
    expect(h.canRedo).toBe(false);
  });

  it("returns null when nothing to undo/redo", () => {
    const h = new History();
    h.reset([mk("a")]);
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBeNull();
  });
});
