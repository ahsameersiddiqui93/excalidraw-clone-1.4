/**
 * types.ts
 * -----------------------------------------------------------------------------
 * Central type definitions and data models for the whiteboard application.
 *
 * These types form the single source of truth for the shape of every element,
 * the application state, and the serialized document format. All other modules
 * import from here to guarantee a consistent, strongly-typed contract.
 */

/** A 2D point in *scene* (world) coordinates. */
export interface Point {
  x: number;
  y: number;
}

/** Axis-aligned bounding box in scene coordinates. */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** The set of tools a user can select in the left toolbar. */
export type ToolType =
  | "selection"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "draw" // freehand / pencil
  | "text"
  | "pan"
  | "eraser";

/** The discriminant used on the element union. */
export type ElementType =
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "draw"
  | "text";

/** Fill hachure styles for closed shapes. */
export type FillStyle = "hachure" | "cross-hatch" | "solid";

/** Stroke rendering style. */
export type StrokeStyle = "solid" | "dashed" | "dotted";

/** "architect" = clean, "artist"/"cartoonist" = increasingly rough. */
export type Roughness = 0 | 1 | 2;

export type FontFamily = "hand-drawn" | "normal" | "code";
export type TextAlign = "left" | "center" | "right";

/**
 * Properties shared by every element. Geometry is stored in scene coordinates.
 * `x`/`y` is the top-left of the element's *unrotated* local bounding box.
 */
export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number; // rotation in radians, around the element center

  // Styling
  strokeColor: string;
  backgroundColor: string; // fill
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: Roughness;
  opacity: number; // 0..100

  // Bookkeeping
  seed: number; // deterministic seed so rough rendering is stable
  version: number; // bumped on each mutation (used by render cache)
  groupIds: string[]; // group membership, outermost last
  locked: boolean;
  isDeleted: boolean;
}

export interface RectangleElement extends BaseElement {
  type: "rectangle";
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
}

export interface DiamondElement extends BaseElement {
  type: "diamond";
}

/** Multi-point linear element. Points are relative to the element x/y. */
export interface LinearElement extends BaseElement {
  type: "line" | "arrow";
  points: Point[];
}

/** Freehand stroke captured from pointer movement. Points relative to x/y. */
export interface DrawElement extends BaseElement {
  type: "draw";
  points: Point[];
  pressures?: number[];
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: FontFamily;
  textAlign: TextAlign;
  /** Vertical baseline metric used to keep text rendering stable. */
  baseline: number;
}

/** Discriminated union of all possible elements. */
export type WhiteboardElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | LinearElement
  | DrawElement
  | TextElement;

/** A subset of element style properties that can be edited via the UI. */
export interface ElementStyle {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: Roughness;
  opacity: number;
  fontSize: number;
  fontFamily: FontFamily;
  textAlign: TextAlign;
}

/** Camera / viewport state for the infinite canvas. */
export interface Viewport {
  /** Scroll offset of the scene origin, in screen pixels. */
  scrollX: number;
  scrollY: number;
  /** Zoom factor; 1 = 100%. */
  zoom: number;
}

/** The full, serializable application document. */
export interface SceneData {
  elements: WhiteboardElement[];
  viewport: Viewport;
}

/** The exported file format wrapper. */
export interface WhiteboardFile {
  type: "whiteboard";
  version: number;
  source: string;
  elements: WhiteboardElement[];
  appState: {
    viewport: Viewport;
  };
}

/** Handles used while resizing/rotating a selection. */
export type TransformHandle =
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "s"
  | "e"
  | "w"
  | "rotate";

/** All multi-step pointer interactions the canvas can be performing. */
export type InteractionMode =
  | { kind: "idle" }
  | { kind: "panning"; startX: number; startY: number; origScrollX: number; origScrollY: number }
  | { kind: "selecting"; origin: Point }
  | { kind: "dragging"; origin: Point; lastScene: Point }
  | { kind: "resizing"; handle: TransformHandle; origin: Point; pivot: Point }
  | { kind: "rotating"; center: Point }
  | { kind: "drawing"; elementId: string }
  | { kind: "creating"; elementId: string; origin: Point };
