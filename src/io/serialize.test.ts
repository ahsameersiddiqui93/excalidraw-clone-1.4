/**
 * io/serialize.test.ts
 * -----------------------------------------------------------------------------
 * Tests JSON export/import round-tripping, including the file envelope format
 * and tolerance for the raw {elements, viewport} shape.
 */

import { describe, expect, it } from "vitest";
import { jsonToScene, sceneToJSON } from "./serialize";
import { createElement } from "../core/element";
import type { SceneData } from "../types";

const sampleScene = (): SceneData => ({
  elements: [
    createElement({ type: "rectangle", x: 0, y: 0, width: 100, height: 50 }),
    createElement({ type: "ellipse", x: 200, y: 120, width: 80, height: 80 }),
  ],
  viewport: { scrollX: 12, scrollY: 34, zoom: 1.5 },
});

describe("serialize round-trip", () => {
  it("preserves elements and viewport through JSON", () => {
    const scene = sampleScene();
    const restored = jsonToScene(sceneToJSON(scene));
    expect(restored.elements).toHaveLength(2);
    expect(restored.elements[0].type).toBe("rectangle");
    expect(restored.viewport).toEqual(scene.viewport);
  });

  it("accepts a raw {elements, viewport} object", () => {
    const scene = sampleScene();
    const raw = JSON.stringify({
      elements: scene.elements,
      viewport: scene.viewport,
    });
    const restored = jsonToScene(raw);
    expect(restored.elements).toHaveLength(2);
  });

  it("throws on unrecognized JSON", () => {
    expect(() => jsonToScene(JSON.stringify({ foo: "bar" }))).toThrow();
  });
});
