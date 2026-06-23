/**
 * core/element.ts
 * -----------------------------------------------------------------------------
 * Factory functions and immutable update helpers for whiteboard elements.
 *
 * Elements are treated as immutable values: mutation helpers always return new
 * objects (with an incremented `version`) so the renderer's cache and the
 * history system can rely on referential changes.
 */

import type {
  DrawElement,
  ElementStyle,
  ElementType,
  LinearElement,
  Point,
  TextElement,
  WhiteboardElement,
} from "../types";
import { DEFAULT_STYLE } from "../constants";
import { generateId, generateSeed } from "../utils/id";

/** Properties accepted when creating any element. */
export interface CreateElementOptions {
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  style?: Partial<ElementStyle>;
}

/** Build the style-related base fields shared by all elements. */
function baseFromStyle(style: ElementStyle) {
  return {
    strokeColor: style.strokeColor,
    backgroundColor: style.backgroundColor,
    fillStyle: style.fillStyle,
    strokeWidth: style.strokeWidth,
    strokeStyle: style.strokeStyle,
    roughness: style.roughness,
    opacity: style.opacity,
  };
}

/**
 * Create a new element of the requested type with sensible defaults.
 * Linear/draw elements start with a single point; text starts empty.
 */
export function createElement(
  options: CreateElementOptions,
): WhiteboardElement {
  const style: ElementStyle = { ...DEFAULT_STYLE, ...options.style };
  const common = {
    id: generateId(),
    x: options.x,
    y: options.y,
    width: options.width ?? 0,
    height: options.height ?? 0,
    angle: 0,
    ...baseFromStyle(style),
    seed: generateSeed(),
    version: 1,
    groupIds: [] as string[],
    locked: false,
    isDeleted: false,
  };

  switch (options.type) {
    case "rectangle":
      return { ...common, type: "rectangle" };
    case "ellipse":
      return { ...common, type: "ellipse" };
    case "diamond":
      return { ...common, type: "diamond" };
    case "line":
    case "arrow":
      return {
        ...common,
        type: options.type,
        points: [
          { x: 0, y: 0 },
          { x: options.width ?? 0, y: options.height ?? 0 },
        ],
      } as LinearElement;
    case "draw":
      return {
        ...common,
        type: "draw",
        points: [{ x: 0, y: 0 }],
        pressures: [],
      } as DrawElement;
    case "text":
      return {
        ...common,
        type: "text",
        text: "",
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        textAlign: style.textAlign,
        baseline: style.fontSize,
      } as TextElement;
    default: {
      // Exhaustiveness guard.
      const _never: never = options.type;
      throw new Error(`Unknown element type: ${String(_never)}`);
    }
  }
}

/**
 * Return a new element with the given partial fields applied and `version`
 * bumped. Generic over the concrete element type to preserve narrowing.
 */
export function mutateElement<T extends WhiteboardElement>(
  element: T,
  updates: Partial<T>,
): T {
  return {
    ...element,
    ...updates,
    version: element.version + 1,
  };
}

/** Deep-clone an element and assign it a fresh id (used by copy/duplicate). */
export function duplicateElement<T extends WhiteboardElement>(
  element: T,
  offset: Point = { x: 0, y: 0 },
): T {
  const clone: T = structuredCloneSafe(element);
  clone.id = generateId();
  clone.x += offset.x;
  clone.y += offset.y;
  clone.seed = generateSeed();
  clone.version = 1;
  return clone;
}

/**
 * A structuredClone fallback that works even where the global is unavailable
 * (older test runners). Element data is plain JSON, so this is safe.
 */
function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Type guard: element is a linear (line/arrow) element. */
export function isLinearElement(
  element: WhiteboardElement,
): element is LinearElement {
  return element.type === "line" || element.type === "arrow";
}

/** Type guard: element is a freehand draw element. */
export function isDrawElement(
  element: WhiteboardElement,
): element is DrawElement {
  return element.type === "draw";
}

/** Type guard: element is a text element. */
export function isTextElement(
  element: WhiteboardElement,
): element is TextElement {
  return element.type === "text";
}

/** Whether the element type stores a freeform `points` array. */
export function hasPoints(
  element: WhiteboardElement,
): element is LinearElement | DrawElement {
  return isLinearElement(element) || isDrawElement(element);
}
