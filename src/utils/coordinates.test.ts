/**
 * utils/coordinates.test.ts
 * -----------------------------------------------------------------------------
 * Tests for screen<->scene conversions and zoom-at-point anchoring.
 */

import { describe, expect, it } from "vitest";
import { screenToScene, sceneToScreen, zoomAtPoint } from "./coordinates";
import type { Viewport } from "../types";

const vp: Viewport = { scrollX: 100, scrollY: 50, zoom: 2 };

describe("screen/scene conversions", () => {
  it("round-trips screen -> scene -> screen", () => {
    const scene = screenToScene(300, 250, vp);
    const back = sceneToScreen(scene.x, scene.y, vp);
    expect(back.x).toBeCloseTo(300);
    expect(back.y).toBeCloseTo(250);
  });

  it("applies zoom and scroll", () => {
    // scene origin maps to (scrollX, scrollY).
    const screen = sceneToScreen(0, 0, vp);
    expect(screen).toEqual({ x: 100, y: 50 });
  });
});

describe("zoomAtPoint", () => {
  it("keeps the world point under the anchor stationary", () => {
    const anchorX = 400;
    const anchorY = 300;
    const before = screenToScene(anchorX, anchorY, vp);
    const next = zoomAtPoint(vp, 4, anchorX, anchorY);
    const after = screenToScene(anchorX, anchorY, next);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(next.zoom).toBe(4);
  });
});
