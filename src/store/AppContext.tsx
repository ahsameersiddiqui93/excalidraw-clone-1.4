/**
 * Centralized application state management using React Context + useReducer.
 * Provides a single source of truth for all whiteboard state.
 */

import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import {
  AppState,
  WhiteboardElement,
  ToolType,
  ElementStyle,
  ViewTransform,
  DEFAULT_STYLE,
  MIN_ZOOM,
  MAX_ZOOM,
  HistoryEntry,
  Point,
  BoundingBox,
} from '../types';
import { generateId, generateSeed, getElementBounds, getMultiElementBounds } from '../utils/geometry';

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AppState = {
  elements: [],
  selectedTool: 'selection',
  viewTransform: { offsetX: 0, offsetY: 0, zoom: 1 },
  selection: {
    selectedIds: new Set(),
    isSelecting: false,
    selectionBox: null,
  },
  drawing: {
    isDrawing: false,
    currentElementId: null,
    startPoint: null,
    lastPoint: null,
  },
  currentStyle: { ...DEFAULT_STYLE },
  history: { past: [], future: [] },
  isPanning: false,
  showGrid: true,
  snapToGrid: false,
  gridSize: 20,
};

// ─── Action Types ─────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_TOOL'; tool: ToolType }
  | { type: 'ADD_ELEMENT'; element: WhiteboardElement }
  | { type: 'UPDATE_ELEMENT'; id: string; updates: Partial<WhiteboardElement> }
  | { type: 'UPDATE_ELEMENTS'; updates: Array<{ id: string; updates: Partial<WhiteboardElement> }> }
  | { type: 'DELETE_ELEMENTS'; ids: string[] }
  | { type: 'SET_ELEMENTS'; elements: WhiteboardElement[] }
  | { type: 'SELECT_ELEMENTS'; ids: string[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_SELECTION_BOX'; box: BoundingBox | null }
  | { type: 'SET_IS_SELECTING'; value: boolean }
  | { type: 'SET_DRAWING'; drawing: Partial<AppState['drawing']> }
  | { type: 'SET_VIEW_TRANSFORM'; transform: Partial<ViewTransform> }
  | { type: 'SET_ZOOM'; zoom: number; centerX?: number; centerY?: number }
  | { type: 'SET_STYLE'; style: Partial<ElementStyle> }
  | { type: 'SET_IS_PANNING'; value: boolean }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_SNAP' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_HISTORY' }
  | { type: 'BRING_FORWARD'; ids: string[] }
  | { type: 'SEND_BACKWARD'; ids: string[] }
  | { type: 'BRING_TO_FRONT'; ids: string[] }
  | { type: 'SEND_TO_BACK'; ids: string[] }
  | { type: 'GROUP_ELEMENTS'; ids: string[] }
  | { type: 'UNGROUP_ELEMENTS'; groupId: string }
  | { type: 'LOCK_ELEMENTS'; ids: string[] }
  | { type: 'UNLOCK_ELEMENTS'; ids: string[] }
  | { type: 'RESET_CANVAS' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function makeHistoryEntry(elements: WhiteboardElement[]): HistoryEntry {
  return { elements: elements.map(e => ({ ...e, style: { ...e.style } })), timestamp: Date.now() };
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, selectedTool: action.tool, selection: { ...state.selection, selectedIds: new Set() } };

    case 'ADD_ELEMENT':
      return { ...state, elements: [...state.elements, action.element] };

    case 'UPDATE_ELEMENT': {
      const elements = state.elements.map(el =>
        el.id === action.id ? { ...el, ...action.updates, style: action.updates.style ? { ...el.style, ...action.updates.style } : el.style } as WhiteboardElement : el
      );
      return { ...state, elements };
    }

    case 'UPDATE_ELEMENTS': {
      const updateMap = new Map(action.updates.map(u => [u.id, u.updates]));
      const elements = state.elements.map(el => {
        const updates = updateMap.get(el.id);
        if (!updates) return el;
        return { ...el, ...updates, style: updates.style ? { ...el.style, ...updates.style } : el.style } as WhiteboardElement;
      });
      return { ...state, elements };
    }

    case 'DELETE_ELEMENTS': {
      const idSet = new Set(action.ids);
      const elements = state.elements.map(el =>
        idSet.has(el.id) ? { ...el, isDeleted: true } : el
      );
      const selectedIds = new Set([...state.selection.selectedIds].filter(id => !idSet.has(id)));
      return { ...state, elements, selection: { ...state.selection, selectedIds } };
    }

    case 'SET_ELEMENTS':
      return { ...state, elements: action.elements };

    case 'SELECT_ELEMENTS':
      return { ...state, selection: { ...state.selection, selectedIds: new Set(action.ids) } };

    case 'DESELECT_ALL':
      return { ...state, selection: { ...state.selection, selectedIds: new Set(), selectionBox: null } };

    case 'SET_SELECTION_BOX':
      return { ...state, selection: { ...state.selection, selectionBox: action.box } };

    case 'SET_IS_SELECTING':
      return { ...state, selection: { ...state.selection, isSelecting: action.value } };

    case 'SET_DRAWING':
      return { ...state, drawing: { ...state.drawing, ...action.drawing } };

    case 'SET_VIEW_TRANSFORM':
      return { ...state, viewTransform: { ...state.viewTransform, ...action.transform } };

    case 'SET_ZOOM': {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, action.zoom));
      if (action.centerX !== undefined && action.centerY !== undefined) {
        const { offsetX, offsetY, zoom } = state.viewTransform;
        const newOffsetX = action.centerX - (action.centerX - offsetX) * (newZoom / zoom);
        const newOffsetY = action.centerY - (action.centerY - offsetY) * (newZoom / zoom);
        return { ...state, viewTransform: { zoom: newZoom, offsetX: newOffsetX, offsetY: newOffsetY } };
      }
      return { ...state, viewTransform: { ...state.viewTransform, zoom: newZoom } };
    }

    case 'SET_STYLE':
      return { ...state, currentStyle: { ...state.currentStyle, ...action.style } };

    case 'SET_IS_PANNING':
      return { ...state, isPanning: action.value };

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };

    case 'TOGGLE_SNAP':
      return { ...state, snapToGrid: !state.snapToGrid };

    case 'PUSH_HISTORY': {
      const entry = makeHistoryEntry(state.elements);
      const past = [...state.history.past, entry].slice(-100); // keep last 100
      return { ...state, history: { past, future: [] } };
    }

    case 'UNDO': {
      if (state.history.past.length === 0) return state;
      const past = [...state.history.past];
      const entry = past.pop()!;
      const currentEntry = makeHistoryEntry(state.elements);
      const future = [currentEntry, ...state.history.future];
      return {
        ...state,
        elements: entry.elements,
        history: { past, future },
        selection: { ...state.selection, selectedIds: new Set() },
      };
    }

    case 'REDO': {
      if (state.history.future.length === 0) return state;
      const future = [...state.history.future];
      const entry = future.shift()!;
      const currentEntry = makeHistoryEntry(state.elements);
      const past = [...state.history.past, currentEntry];
      return {
        ...state,
        elements: entry.elements,
        history: { past, future },
        selection: { ...state.selection, selectedIds: new Set() },
      };
    }

    case 'BRING_FORWARD': {
      const idSet = new Set(action.ids);
      const elements = [...state.elements];
      for (let i = elements.length - 2; i >= 0; i--) {
        if (idSet.has(elements[i].id) && !idSet.has(elements[i + 1].id)) {
          [elements[i], elements[i + 1]] = [elements[i + 1], elements[i]];
        }
      }
      return { ...state, elements };
    }

    case 'SEND_BACKWARD': {
      const idSet = new Set(action.ids);
      const elements = [...state.elements];
      for (let i = 1; i < elements.length; i++) {
        if (idSet.has(elements[i].id) && !idSet.has(elements[i - 1].id)) {
          [elements[i], elements[i - 1]] = [elements[i - 1], elements[i]];
        }
      }
      return { ...state, elements };
    }

    case 'BRING_TO_FRONT': {
      const idSet = new Set(action.ids);
      const rest = state.elements.filter(el => !idSet.has(el.id));
      const selected = state.elements.filter(el => idSet.has(el.id));
      return { ...state, elements: [...rest, ...selected] };
    }

    case 'SEND_TO_BACK': {
      const idSet = new Set(action.ids);
      const rest = state.elements.filter(el => !idSet.has(el.id));
      const selected = state.elements.filter(el => idSet.has(el.id));
      return { ...state, elements: [...selected, ...rest] };
    }

    case 'GROUP_ELEMENTS': {
      const groupId = generateId();
      const idSet = new Set(action.ids);
      const elements = state.elements.map(el =>
        idSet.has(el.id) ? { ...el, groupId } : el
      );
      return { ...state, elements };
    }

    case 'UNGROUP_ELEMENTS': {
      const elements = state.elements.map(el =>
        el.groupId === action.groupId ? { ...el, groupId: null } : el
      );
      return { ...state, elements };
    }

    case 'LOCK_ELEMENTS': {
      const idSet = new Set(action.ids);
      const elements = state.elements.map(el =>
        idSet.has(el.id) ? { ...el, locked: true } : el
      );
      return { ...state, elements };
    }

    case 'UNLOCK_ELEMENTS': {
      const idSet = new Set(action.ids);
      const elements = state.elements.map(el =>
        idSet.has(el.id) ? { ...el, locked: false } : el
      );
      return { ...state, elements };
    }

    case 'RESET_CANVAS':
      return {
        ...initialState,
        currentStyle: { ...state.currentStyle },
        history: { past: [], future: [] },
      };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Convenience helpers
  getVisibleElements: () => WhiteboardElement[];
  getSelectedElements: () => WhiteboardElement[];
  getElementById: (id: string) => WhiteboardElement | undefined;
  pushHistory: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const getVisibleElements = useCallback(() => {
    return state.elements.filter(el => !el.isDeleted);
  }, [state.elements]);

  const getSelectedElements = useCallback(() => {
    return state.elements.filter(
      el => !el.isDeleted && state.selection.selectedIds.has(el.id)
    );
  }, [state.elements, state.selection.selectedIds]);

  const getElementById = useCallback((id: string) => {
    return state.elements.find(el => el.id === id);
  }, [state.elements]);

  const pushHistory = useCallback(() => {
    dispatch({ type: 'PUSH_HISTORY' });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, getVisibleElements, getSelectedElements, getElementById, pushHistory }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export function useAppState(): AppState {
  return useAppContext().state;
}

export function useDispatch(): React.Dispatch<Action> {
  return useAppContext().dispatch;
}
