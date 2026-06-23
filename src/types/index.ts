// ============================================================
// Core Data Models for the Whiteboard Application
// ============================================================

export type ToolType =
  | 'selection'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'pencil'
  | 'text'
  | 'hand';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type FillStyle = 'none' | 'solid' | 'hatch' | 'cross-hatch';
export type RoughnessLevel = 0 | 1 | 2;
export type FontFamily = 'hand' | 'normal' | 'code';
export type TextAlign = 'left' | 'center' | 'right';
export type ArrowheadType = 'none' | 'arrow' | 'dot' | 'bar';

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillStyle: FillStyle;
  opacity: number;
  roughness: RoughnessLevel;
  fontFamily: FontFamily;
  fontSize: number;
  textAlign: TextAlign;
}

export interface BaseElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  style: ElementStyle;
  locked: boolean;
  groupId: string | null;
  seed: number;
  version: number;
  isDeleted: boolean;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
}

export interface DiamondElement extends BaseElement {
  type: 'diamond';
}

export interface LineElement extends BaseElement {
  type: 'line';
  points: Point[];
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  points: Point[];
  startArrowhead: ArrowheadType;
  endArrowhead: ArrowheadType;
  startBindingId: string | null;
  endBindingId: string | null;
}

export interface PencilElement extends BaseElement {
  type: 'pencil';
  points: Point[];
  pressures: number[];
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  isEditing: boolean;
}

export type WhiteboardElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | LineElement
  | ArrowElement
  | PencilElement
  | TextElement;

export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface SelectionState {
  selectedIds: Set<string>;
  isSelecting: boolean;
  selectionBox: BoundingBox | null;
}

export interface DrawingState {
  isDrawing: boolean;
  currentElementId: string | null;
  startPoint: Point | null;
  lastPoint: Point | null;
}

export interface AppState {
  elements: WhiteboardElement[];
  selectedTool: ToolType;
  viewTransform: ViewTransform;
  selection: SelectionState;
  drawing: DrawingState;
  currentStyle: ElementStyle;
  history: HistoryState;
  isPanning: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface HistoryEntry {
  elements: WhiteboardElement[];
  timestamp: number;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export interface ResizeHandle {
  position: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotation';
  x: number;
  y: number;
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'json';
  scale?: number;
  background?: boolean;
  padding?: number;
}

export interface ImportedData {
  elements: WhiteboardElement[];
  viewTransform?: ViewTransform;
  appVersion: string;
}

export const DEFAULT_STYLE: ElementStyle = {
  strokeColor: '#1e1e1e',
  fillColor: 'transparent',
  strokeWidth: 2,
  strokeStyle: 'solid',
  fillStyle: 'none',
  opacity: 100,
  roughness: 1,
  fontFamily: 'hand',
  fontSize: 20,
  textAlign: 'left',
};

export const ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 0.1;
export const GRID_SIZE = 20;
export const HANDLE_SIZE = 8;
export const SELECTION_PADDING = 8;
export const ROTATION_HANDLE_OFFSET = 24;
export const APP_VERSION = '1.0.0';
