/**
 * state/store.ts
 * -----------------------------------------------------------------------------
 * Centralized application store. A tiny, dependency-free observable store with
 * a React-friendly subscribe API (compatible with useSyncExternalStore).
 *
 * Design goals:
 *  - Single source of truth for elements, selection, viewport, active tool,
 *    and editing/UI state.
 *  - All element mutations route through a small set of actions so history,
 *    autosave, and the render cache stay consistent.
 *  - Immutable updates: a new `elements` array reference is produced on every
 *    change so React/`useSyncExternalStore` can detect changes cheaply.
 */

import type {
  Bounds,
  ElementStyle,
  InteractionMode,
  ToolType,
  Viewport,
  WhiteboardElement,
} from "../types";
import { DEFAULT_STYLE, DEFAULT_VIEWPORT, STORAGE_KEY } from "../constants";
import { History } from "./history";
import { clearCache, invalidate } from "../render/shapeCache";
import {
  arrangeLayers,
  expandSelectionByGroup,
  groupElements,
  ungroupElements,
  type LayerOp,
} from "../core/scene";
import { duplicateElement, mutateElement } from "../core/element";
import { getCommonBounds } from "../core/bounds";
import { DUPLICATE_OFFSET } from "../constants";
import { loadScene, persistScene } from "./persistence";

/** Full UI + document state held by the store. */
export interface AppState {
  elements: WhiteboardElement[];
  selectedIds: Set<string>;
  editingTextId: string | null;
  tool: ToolType;
  /** Whether the active tool stays selected after drawing (toolbar lock). */
  toolLocked: boolean;
  viewport: Viewport;
  currentStyle: ElementStyle;
  interaction: InteractionMode;
  marquee: Bounds | null;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

type Listener = () => void;

const INITIAL_STATE: AppState = {
  elements: [],
  selectedIds: new Set(),
  editingTextId: null,
  tool: "selection",
  toolLocked: false,
  viewport: { ...DEFAULT_VIEWPORT },
  currentStyle: { ...DEFAULT_STYLE },
  interaction: { kind: "idle" },
  marquee: null,
  showGrid: true,
  canUndo: false,
  canRedo: false,
};

class Store {
  private state: AppState = INITIAL_STATE;
  private listeners = new Set<Listener>();
  private history = new History();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const restored = loadScene();
    if (restored) {
      this.state = {
        ...INITIAL_STATE,
        elements: restored.elements,
        viewport: restored.viewport,
      };
    }
    this.history.reset(this.state.elements);
    this.refreshHistoryFlags();
  }

  // --- Subscription API (useSyncExternalStore compatible) ------------------

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): AppState => this.state;

  private emit(): void {
    for (const l of this.listeners) l();
  }

  /** Replace state with a shallow-merged patch and notify subscribers. */
  private set(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private refreshHistoryFlags(): void {
    this.state = {
      ...this.state,
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
    };
  }

  // --- History + persistence ----------------------------------------------

  /**
   * Commit the current element array to history and schedule an autosave.
   * Call this once at the *end* of a logical user action (e.g. pointer up),
   * not on every intermediate frame while dragging.
   */
  commit(): void {
    this.history.record(this.state.elements);
    this.refreshHistoryFlags();
    this.scheduleSave();
    this.emit();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      persistScene({
        elements: this.state.elements,
        viewport: this.state.viewport,
      });
    }, 400);
  }

  undo(): void {
    const snapshot = this.history.undo();
    if (!snapshot) return;
    this.set({ elements: snapshot, selectedIds: new Set() });
    this.refreshHistoryFlags();
    this.scheduleSave();
    this.emit();
  }

  redo(): void {
    const snapshot = this.history.redo();
    if (!snapshot) return;
    this.set({ elements: snapshot, selectedIds: new Set() });
    this.refreshHistoryFlags();
    this.scheduleSave();
    this.emit();
  }

  // --- Tool + viewport -----------------------------------------------------

  setTool(tool: ToolType): void {
    const selectedIds =
      tool === "selection" ? this.state.selectedIds : new Set<string>();
    this.set({ tool, selectedIds });
  }

  setToolLocked(locked: boolean): void {
    this.set({ toolLocked: locked });
  }

  setViewport(viewport: Viewport): void {
    this.set({ viewport });
    this.scheduleSave();
  }

  setInteraction(interaction: InteractionMode): void {
    this.set({ interaction });
  }

  setMarquee(marquee: Bounds | null): void {
    this.set({ marquee });
  }

  toggleGrid(): void {
    this.set({ showGrid: !this.state.showGrid });
  }

  // --- Selection -----------------------------------------------------------

  setSelection(ids: Iterable<string>): void {
    this.set({ selectedIds: new Set(ids) });
  }

  clearSelection(): void {
    if (this.state.selectedIds.size === 0) return;
    this.set({ selectedIds: new Set() });
  }

  selectAll(): void {
    const ids = this.state.elements
      .filter((e) => !e.isDeleted && !e.locked)
      .map((e) => e.id);
    this.set({ selectedIds: new Set(ids) });
  }

  /** Toggle membership of one id, optionally additive (shift-click). */
  toggleSelected(id: string, additive: boolean): void {
    const next = new Set(additive ? this.state.selectedIds : []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.set({ selectedIds: next });
  }

  selectByGroup(element: WhiteboardElement, additive: boolean): void {
    const groupIds = expandSelectionByGroup(this.state.elements, element);
    const next = new Set(additive ? this.state.selectedIds : []);
    for (const id of groupIds) next.add(id);
    this.set({ selectedIds: next });
  }

  get selectedElements(): WhiteboardElement[] {
    return this.state.elements.filter((e) => this.state.selectedIds.has(e.id));
  }

  // --- Element CRUD --------------------------------------------------------

  /** Add a new element (without committing — caller decides when to commit). */
  addElement(element: WhiteboardElement): void {
    this.set({ elements: [...this.state.elements, element] });
  }

  /** Replace the entire element array (used during drag/resize live updates). */
  replaceElements(elements: WhiteboardElement[]): void {
    this.set({ elements });
  }

  /** Update a single element by id with a partial patch. */
  updateElement(id: string, patch: Partial<WhiteboardElement>): void {
    const elements = this.state.elements.map((el) =>
      el.id === id ? mutateElement(el, patch as never) : el,
    );
    this.set({ elements });
  }

  /** Apply a style patch to all selected elements and to the current style. */
  updateStyleForSelection(patch: Partial<ElementStyle>): void {
    const currentStyle = { ...this.state.currentStyle, ...patch };
    const elements = this.state.elements.map((el) =>
      this.state.selectedIds.has(el.id)
        ? mutateElement(el, patch as never)
        : el,
    );
    this.set({ elements, currentStyle });
  }

  setCurrentStyle(patch: Partial<ElementStyle>): void {
    this.set({ currentStyle: { ...this.state.currentStyle, ...patch } });
  }

  deleteSelected(): void {
    if (this.state.selectedIds.size === 0) return;
    const elements = this.state.elements.filter((el) => {
      if (this.state.selectedIds.has(el.id)) {
        invalidate(el.id);
        return false;
      }
      return true;
    });
    this.set({ elements, selectedIds: new Set() });
    this.commit();
  }

  duplicateSelected(): void {
    const selected = this.selectedElements;
    if (selected.length === 0) return;
    const clones = selected.map((el) =>
      duplicateElement(el, { x: DUPLICATE_OFFSET, y: DUPLICATE_OFFSET }),
    );
    this.set({
      elements: [...this.state.elements, ...clones],
      selectedIds: new Set(clones.map((c) => c.id)),
    });
    this.commit();
  }

  toggleLockSelected(): void {
    const ids = this.state.selectedIds;
    if (ids.size === 0) return;
    const allLocked = this.selectedElements.every((e) => e.locked);
    const elements = this.state.elements.map((el) =>
      ids.has(el.id) ? mutateElement(el, { locked: !allLocked }) : el,
    );
    this.set({ elements });
    this.commit();
  }

  // --- Layering + grouping -------------------------------------------------

  arrange(op: LayerOp): void {
    const elements = arrangeLayers(
      this.state.elements,
      this.state.selectedIds,
      op,
    );
    this.set({ elements });
    this.commit();
  }

  group(): void {
    if (this.state.selectedIds.size < 2) return;
    const { elements } = groupElements(
      this.state.elements,
      this.state.selectedIds,
    );
    this.set({ elements });
    this.commit();
  }

  ungroup(): void {
    const elements = ungroupElements(
      this.state.elements,
      this.state.selectedIds,
    );
    this.set({ elements });
    this.commit();
  }

  // --- Text editing --------------------------------------------------------

  setEditingText(id: string | null): void {
    this.set({ editingTextId: id });
  }

  // --- Clipboard (in-memory) ----------------------------------------------

  private clipboard: WhiteboardElement[] = [];

  copySelected(): void {
    this.clipboard = this.selectedElements.map((e) => ({ ...e }));
  }

  cutSelected(): void {
    this.copySelected();
    this.deleteSelected();
  }

  paste(offset = DUPLICATE_OFFSET): void {
    if (this.clipboard.length === 0) return;
    const clones = this.clipboard.map((el) =>
      duplicateElement(el, { x: offset, y: offset }),
    );
    this.set({
      elements: [...this.state.elements, ...clones],
      selectedIds: new Set(clones.map((c) => c.id)),
      tool: "selection",
    });
    this.commit();
  }

  get hasClipboard(): boolean {
    return this.clipboard.length > 0;
  }

  // --- Whole-scene ops -----------------------------------------------------

  /** Replace the whole document (used by JSON import). */
  loadDocument(elements: WhiteboardElement[], viewport: Viewport): void {
    clearCache();
    this.set({ elements, viewport, selectedIds: new Set() });
    this.history.reset(elements);
    this.refreshHistoryFlags();
    this.scheduleSave();
    this.emit();
  }

  /** Clear the canvas entirely. */
  resetScene(): void {
    clearCache();
    this.set({
      elements: [],
      selectedIds: new Set(),
      viewport: { ...DEFAULT_VIEWPORT },
    });
    this.history.reset([]);
    this.refreshHistoryFlags();
    this.scheduleSave();
    this.emit();
  }

  /** The bounding box of the current selection, or null. */
  getSelectionBounds(): Bounds | null {
    return getCommonBounds(this.selectedElements);
  }
}

/** The singleton store instance shared across the app. */
export const store = new Store();

/** Exposed for tests that need a clean instance. */
export { Store, STORAGE_KEY };
