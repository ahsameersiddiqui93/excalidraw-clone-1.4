/**
 * interaction/pointer.ts
 * -----------------------------------------------------------------------------
 * Pure(ish) pointer-interaction logic, decoupled from React. The Canvas
 * component forwards normalized pointer events here; this module reads/writes
 * the store to drive creation, selection, dragging, resizing, and rotating.
 *
 * Keeping this logic outside the component keeps the component lean and makes
 * the interaction state machine easy to reason about.
 */

import type {
  Bounds,
  Point,
  TransformHandle,
  WhiteboardElement,
} from "../types";
import { store } from "../state/store";
import { screenToScene } from "../utils/coordinates";
import { HANDLE_SIZE, HIT_THRESHOLD, MIN_DRAG_SIZE } from "../constants";
import { createElement } from "../core/element";
import { getElementAtPoint, getElementsInBounds } from "../core/hitTest";
import { boundsFromPoints, getCommonBounds } from "../core/bounds";
import {
  computeResizedBounds,
  getResizeHandles,
  resizeElementToBounds,
  rotateSelection,
} from "../core/transform";
import { hasPoints, isTextElement, mutateElement } from "../core/element";
import { distance } from "../utils/math";

/** Normalized pointer info passed in from the component. */
export interface PointerInfo {
  screenX: number;
  screenY: number;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
  /** Space held → force panning regardless of active tool. */
  spaceKey: boolean;
}

/** Mutable per-gesture context retained between down/move/up. */
interface GestureState {
  // Selection box origin (scene).
  selectOrigin: Point | null;
  // Drag bookkeeping.
  dragLast: Point | null;
  dragStartElements: WhiteboardElement[] | null;
  // Resize bookkeeping.
  resizeHandle: TransformHandle | null;
  resizeOriginalBounds: Bounds | null;
  resizeStartElements: WhiteboardElement[] | null;
  // Rotate bookkeeping.
  rotateCenter: Point | null;
  rotateStartAngle: number;
  rotateStartElements: WhiteboardElement[] | null;
  // Creation bookkeeping.
  creatingId: string | null;
  createOrigin: Point | null;
  // Pan bookkeeping.
  panStart: { x: number; y: number; scrollX: number; scrollY: number } | null;
  // Whether a meaningful drag has occurred.
  moved: boolean;
}

const gesture: GestureState = {
  selectOrigin: null,
  dragLast: null,
  dragStartElements: null,
  resizeHandle: null,
  resizeOriginalBounds: null,
  resizeStartElements: null,
  rotateCenter: null,
  rotateStartAngle: 0,
  rotateStartElements: null,
  creatingId: null,
  createOrigin: null,
  panStart: null,
  moved: false,
};

function resetGesture(): void {
  gesture.selectOrigin = null;
  gesture.dragLast = null;
  gesture.dragStartElements = null;
  gesture.resizeHandle = null;
  gesture.resizeOriginalBounds = null;
  gesture.resizeStartElements = null;
  gesture.rotateCenter = null;
  gesture.rotateStartElements = null;
  gesture.creatingId = null;
  gesture.createOrigin = null;
  gesture.panStart = null;
  gesture.moved = false;
}

/** Scene-space hit threshold given the current zoom. */
function sceneThreshold(): number {
  return HIT_THRESHOLD / store.getState().viewport.zoom;
}

/**
 * Detect whether a screen point is over a selection handle, returning the
 * handle name or null. Operates in screen space (handles are zoom-independent).
 */
function handleAtPoint(screen: Point): TransformHandle | null {
  const state = store.getState();
  const bounds = getCommonBounds(
    state.elements.filter((e) => state.selectedIds.has(e.id)),
  );
  if (!bounds) return null;
  const vp = state.viewport;
  const toScreen = (x: number, y: number): Point => ({
    x: x * vp.zoom + vp.scrollX,
    y: y * vp.zoom + vp.scrollY,
  });
  const tl = toScreen(bounds.minX, bounds.minY);
  const br = toScreen(bounds.maxX, bounds.maxY);

  // Rotation knob.
  const cx = (tl.x + br.x) / 2;
  const rotateY = tl.y - 24;
  if (distance(screen, { x: cx, y: rotateY }) <= HANDLE_SIZE) return "rotate";

  const handles = getResizeHandles({
    minX: tl.x,
    minY: tl.y,
    maxX: br.x,
    maxY: br.y,
  });
  for (const h of handles) {
    if (
      Math.abs(screen.x - h.x) <= HANDLE_SIZE &&
      Math.abs(screen.y - h.y) <= HANDLE_SIZE
    ) {
      return h.handle;
    }
  }
  return null;
}

/** Handle pointer down: begins a gesture based on the active tool. */
export function onPointerDown(info: PointerInfo): void {
  resetGesture();
  const state = store.getState();
  const vp = state.viewport;
  const scene = screenToScene(info.screenX, info.screenY, vp);
  const screen = { x: info.screenX, y: info.screenY };

  // Middle-button or space → pan.
  if (info.button === 1 || info.spaceKey || state.tool === "pan") {
    gesture.panStart = {
      x: info.screenX,
      y: info.screenY,
      scrollX: vp.scrollX,
      scrollY: vp.scrollY,
    };
    store.setInteraction({
      kind: "panning",
      startX: info.screenX,
      startY: info.screenY,
      origScrollX: vp.scrollX,
      origScrollY: vp.scrollY,
    });
    return;
  }

  if (state.tool === "selection") {
    startSelectionGesture(info, scene, screen);
    return;
  }

  if (state.tool === "eraser") {
    eraseAtPoint(scene);
    gesture.creatingId = "eraser";
    return;
  }

  if (state.tool === "text") {
    beginTextCreation(scene);
    return;
  }

  // Shape/line/draw creation.
  beginShapeCreation(state.tool, scene);
}

function startSelectionGesture(
  info: PointerInfo,
  scene: Point,
  screen: Point,
): void {
  const state = store.getState();

  // 1) A transform handle?
  const handle = handleAtPoint(screen);
  if (handle) {
    const selected = state.elements.filter((e) => state.selectedIds.has(e.id));
    if (handle === "rotate") {
      const center = centerOf(getCommonBounds(selected)!);
      gesture.rotateCenter = center;
      gesture.rotateStartAngle = Math.atan2(
        scene.y - center.y,
        scene.x - center.x,
      );
      gesture.rotateStartElements = selected.map((e) => ({ ...e }));
      store.setInteraction({ kind: "rotating", center });
    } else {
      gesture.resizeHandle = handle;
      gesture.resizeOriginalBounds = getCommonBounds(selected);
      gesture.resizeStartElements = selected.map((e) => ({ ...e }));
      store.setInteraction({
        kind: "resizing",
        handle,
        origin: scene,
        pivot: scene,
      });
    }
    return;
  }

  // 2) An element under the cursor?
  const hit = getElementAtPoint(state.elements, scene, sceneThreshold());
  if (hit) {
    const alreadySelected = state.selectedIds.has(hit.id);
    if (!alreadySelected) {
      store.selectByGroup(hit, info.shiftKey);
    } else if (info.shiftKey) {
      store.toggleSelected(hit.id, true);
    }
    // Begin dragging the (possibly just-updated) selection.
    const fresh = store.getState();
    gesture.dragStartElements = fresh.elements
      .filter((e) => fresh.selectedIds.has(e.id))
      .map((e) => ({ ...e }));
    gesture.dragLast = scene;
    store.setInteraction({ kind: "dragging", origin: scene, lastScene: scene });
    return;
  }

  // 3) Empty space → start a marquee box-select.
  if (!info.shiftKey) store.clearSelection();
  gesture.selectOrigin = scene;
  store.setInteraction({ kind: "selecting", origin: scene });
}

function beginShapeCreation(
  tool: WhiteboardElement["type"],
  scene: Point,
): void {
  const state = store.getState();
  const element = createElement({
    type: tool,
    x: scene.x,
    y: scene.y,
    width: 0,
    height: 0,
    style: state.currentStyle,
  });
  store.addElement(element);
  store.setSelection([element.id]);
  gesture.creatingId = element.id;
  gesture.createOrigin = scene;
  store.setInteraction({ kind: "creating", elementId: element.id, origin: scene });
}

function beginTextCreation(scene: Point): void {
  const state = store.getState();
  const element = createElement({
    type: "text",
    x: scene.x,
    y: scene.y,
    width: 0,
    height: 0,
    style: state.currentStyle,
  });
  store.addElement(element);
  store.setSelection([element.id]);
  store.setEditingText(element.id);
  store.setTool("selection");
}

/** Handle pointer move: advances the active gesture. */
export function onPointerMove(info: PointerInfo): void {
  const state = store.getState();
  const vp = state.viewport;
  const scene = screenToScene(info.screenX, info.screenY, vp);

  // Panning.
  if (gesture.panStart) {
    const dx = info.screenX - gesture.panStart.x;
    const dy = info.screenY - gesture.panStart.y;
    store.setViewport({
      ...vp,
      scrollX: gesture.panStart.scrollX + dx,
      scrollY: gesture.panStart.scrollY + dy,
    });
    return;
  }

  // Creating a shape/line/freehand.
  if (gesture.creatingId && gesture.creatingId !== "eraser") {
    updateCreatingElement(gesture.creatingId, scene, info.shiftKey);
    gesture.moved = true;
    return;
  }

  // Erasing as we drag.
  if (gesture.creatingId === "eraser") {
    eraseAtPoint(scene);
    return;
  }

  // Resizing.
  if (gesture.resizeHandle && gesture.resizeOriginalBounds) {
    applyResize(scene, info.shiftKey);
    gesture.moved = true;
    return;
  }

  // Rotating.
  if (gesture.rotateCenter && gesture.rotateStartElements) {
    applyRotate(scene);
    gesture.moved = true;
    return;
  }

  // Dragging selection.
  if (gesture.dragLast && gesture.dragStartElements) {
    applyDrag(scene);
    gesture.moved = true;
    return;
  }

  // Marquee selection.
  if (gesture.selectOrigin) {
    const box = boundsFromPoints(gesture.selectOrigin, scene);
    store.setMarquee(box);
    const inside = getElementsInBounds(state.elements, box);
    store.setSelection(inside.map((e) => e.id));
  }
}

function updateCreatingElement(
  id: string,
  scene: Point,
  shift: boolean,
): void {
  const state = store.getState();
  const el = state.elements.find((e) => e.id === id);
  if (!el || !gesture.createOrigin) return;
  const origin = gesture.createOrigin;

  if (el.type === "draw" && hasPoints(el)) {
    const points = [...el.points, { x: scene.x - el.x, y: scene.y - el.y }];
    store.updateElement(id, { points } as never);
    return;
  }

  if ((el.type === "line" || el.type === "arrow") && hasPoints(el)) {
    let end = { x: scene.x - origin.x, y: scene.y - origin.y };
    if (shift) end = constrainAngle(end);
    store.updateElement(id, {
      points: [{ x: 0, y: 0 }, end],
      width: end.x,
      height: end.y,
    } as never);
    return;
  }

  // Rectangles, ellipses, diamonds: width/height from origin to pointer.
  let width = scene.x - origin.x;
  let height = scene.y - origin.y;
  if (shift) {
    const size = Math.max(Math.abs(width), Math.abs(height));
    width = Math.sign(width || 1) * size;
    height = Math.sign(height || 1) * size;
  }
  store.updateElement(id, {
    x: width < 0 ? scene.x : origin.x,
    y: height < 0 ? scene.y : origin.y,
    width: Math.abs(width),
    height: Math.abs(height),
  } as never);
}

/** Snap a vector to the nearest 15° increment (for shift-constrained lines). */
function constrainAngle(v: Point): Point {
  const len = Math.hypot(v.x, v.y);
  const angle = Math.atan2(v.y, v.x);
  const step = Math.PI / 12;
  const snapped = Math.round(angle / step) * step;
  return { x: Math.cos(snapped) * len, y: Math.sin(snapped) * len };
}

function applyDrag(scene: Point): void {
  if (!gesture.dragStartElements || !gesture.dragLast) return;
  const origin = store.getState().interaction;
  const start =
    origin.kind === "dragging" ? origin.origin : gesture.dragLast;
  const dx = scene.x - start.x;
  const dy = scene.y - start.y;
  const startMap = new Map(
    gesture.dragStartElements.map((e) => [e.id, e]),
  );
  const elements = store.getState().elements.map((el) => {
    const s = startMap.get(el.id);
    if (!s) return el;
    return mutateElement(el, { x: s.x + dx, y: s.y + dy });
  });
  store.replaceElements(elements);
}

function applyResize(scene: Point, keepAspect: boolean): void {
  if (
    !gesture.resizeHandle ||
    !gesture.resizeOriginalBounds ||
    !gesture.resizeStartElements
  ) {
    return;
  }
  const newBounds = computeResizedBounds(
    gesture.resizeHandle,
    gesture.resizeOriginalBounds,
    scene,
    keepAspect,
  );
  const startMap = new Map(
    gesture.resizeStartElements.map((e) => [e.id, e]),
  );
  const elements = store.getState().elements.map((el) => {
    const s = startMap.get(el.id);
    if (!s) return el;
    return resizeElementToBounds(
      s,
      gesture.resizeOriginalBounds!,
      newBounds,
    );
  });
  store.replaceElements(elements);
}

function applyRotate(scene: Point): void {
  if (!gesture.rotateCenter || !gesture.rotateStartElements) return;
  const center = gesture.rotateCenter;
  const angleNow = Math.atan2(scene.y - center.y, scene.x - center.x);
  const delta = angleNow - gesture.rotateStartAngle;
  const startMap = new Map(
    gesture.rotateStartElements.map((e) => [e.id, e]),
  );
  const ids = new Set(startMap.keys());
  const startEls = store
    .getState()
    .elements.filter((e) => ids.has(e.id))
    .map((e) => startMap.get(e.id)!);
  const rotated = rotateSelection(startEls, center, delta);
  const rotatedMap = new Map(rotated.map((e) => [e.id, e]));
  const elements = store.getState().elements.map((el) =>
    rotatedMap.get(el.id) ?? el,
  );
  store.replaceElements(elements);
}

function eraseAtPoint(scene: Point): void {
  const state = store.getState();
  const hit = getElementAtPoint(state.elements, scene, sceneThreshold());
  if (hit) {
    store.setSelection([hit.id]);
    store.deleteSelected();
  }
}

/** Handle pointer up: finalize the gesture and commit history if needed. */
export function onPointerUp(): void {
  const state = store.getState();

  // Finish panning.
  if (gesture.panStart) {
    store.setInteraction({ kind: "idle" });
    resetGesture();
    return;
  }

  // Finish creating.
  if (gesture.creatingId && gesture.creatingId !== "eraser") {
    const el = state.elements.find((e) => e.id === gesture.creatingId);
    if (el && !isMeaningful(el)) {
      // Discard tiny accidental shapes.
      store.setSelection([el.id]);
      store.deleteSelected();
    } else {
      if (!state.toolLocked) store.setTool("selection");
      store.commit();
    }
    finishGesture();
    return;
  }

  if (gesture.creatingId === "eraser") {
    finishGesture();
    return;
  }

  // Finish drag/resize/rotate → commit if something moved.
  if (
    gesture.moved &&
    (gesture.dragStartElements ||
      gesture.resizeStartElements ||
      gesture.rotateStartElements)
  ) {
    store.commit();
  }

  finishGesture();
}

function finishGesture(): void {
  store.setMarquee(null);
  store.setInteraction({ kind: "idle" });
  resetGesture();
}

/** Whether a freshly-created element is big enough to keep. */
function isMeaningful(el: WhiteboardElement): boolean {
  if (isTextElement(el)) return el.text.trim().length > 0;
  if (hasPoints(el)) {
    if (el.type === "draw") return el.points.length > 1;
    const last = el.points[el.points.length - 1];
    return Math.hypot(last.x, last.y) >= MIN_DRAG_SIZE;
  }
  return Math.abs(el.width) >= MIN_DRAG_SIZE && Math.abs(el.height) >= MIN_DRAG_SIZE;
}

function centerOf(b: Bounds): Point {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

/** Expose a double-click handler: enter text edit or create text. */
export function onDoubleClick(info: PointerInfo): void {
  const state = store.getState();
  const scene = screenToScene(info.screenX, info.screenY, state.viewport);
  const hit = getElementAtPoint(state.elements, scene, sceneThreshold());
  if (hit && isTextElement(hit)) {
    store.setSelection([hit.id]);
    store.setEditingText(hit.id);
    return;
  }
  // Double-click empty space creates a text element.
  beginTextCreation(scene);
}
