/**
 * core/element.test.ts
 * -----------------------------------------------------------------------------
 * Tests for the element factory, immutable mutation, and duplication.
 */

import { describe, expect, it } from "vitest";
import {
  createElement,
  duplicateElement,
  isLinearElement,
  isTextElement,
  mutateElement,
} from "./element";

describe("createElement", () => {
  it("creates a rectangle with defaults and a unique id", () => {
    const a = createElement({ type: "rectangle", x: 10, y: 20 });
    const b = createElement({ type: "rectangle", x: 10, y: 20 });
    expect(a.type).toBe("rectangle");
    expect(a.x).toBe(10);
    expect(a.id).not.toBe(b.id);
    expect(a.version).toBe(1);
  });

  it("creates a linear element with two points", () => {
    const line = createElement({ type: "line", x: 0, y: 0, width: 5, height: 5 });
    expect(isLinearElement(line)).toBe(true);
    if (isLinearElement(line)) {
      expect(line.points).toHaveLength(2);
    }
  });

  it("creates an empty text element", () => {
    const t = createElement({ type: "text", x: 0, y: 0 });
    expect(isTextElement(t)).toBe(true);
    if (isTextElement(t)) {
      expect(t.text).toBe("");
    }
  });
});

describe("mutateElement", () => {
  it("returns a new object with an incremented version", () => {
    const a = createElement({ type: "rectangle", x: 0, y: 0 });
    const b = mutateElement(a, { x: 50 });
    expect(b).not.toBe(a);
    expect(b.x).toBe(50);
    expect(b.version).toBe(a.version + 1);
    expect(a.x).toBe(0); // original untouched
  });
});

describe("duplicateElement", () => {
  it("assigns a new id and applies the offset", () => {
    const a = createElement({ type: "rectangle", x: 0, y: 0 });
    const b = duplicateElement(a, { x: 10, y: 10 });
    expect(b.id).not.toBe(a.id);
    expect(b.x).toBe(10);
    expect(b.y).toBe(10);
  });
});
