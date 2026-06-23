/**
 * useCanvas hook - manages the canvas lifecycle, rendering loop,
 * and coordinates all mouse/touch/keyboard interactions.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../store/AppContext';
import { renderElements, renderGrid, renderSelectionOverlay } from '../rendering/renderer';
import {
  screenToCanvas,
  generateId,
  generateSeed,
  hitTestElement,
  getElementBounds,
  normalizeBounds,
  rotatePoint,
  getBoundsCenter,
  getMultiElementBounds,
  snapToGrid as snapValue,
} from '../utils/geometry';
import {
  WhiteboardElement,
  Point,
  RectangleElement,
  EllipseElement,
  DiamondElement,
  LineElement,
  ArrowElement,
  PencilElement,
  TextElement,
  HANDLE_SIZE,
  SELECTION_PADDING,
  ROTATION_HANDLE_OFFSET,
} from '../types';

type ResizeHandlePos = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotation';

interface DragState {
  type: 'none' | 'drawing' | 'moving' | 'resizing' | 'rotating' | 'selecting' | 'panning';
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  elementIds: string[];
  elementStartPositions: Map<string, { x: number; y: number; width: number; height: number; points?: Point[] }>;
  resizeHandle: ResizeHandlePos | null;
  rotationStartAngle: number;
  rotationElementAngle: number;
}

const INITIAL_DRAG: DragState = {
  type: 'none',
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  elementIds: [],
  elementStartPositions: new Map(),
  resizeHandle: null,
  rotationStartAngle: 0,
  rotationElementAngle: 0,
};

export function useCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const { state, dispatch, getVisibleElements, getSelectedElements } = useAppContext();
  const dragRef = useRef<DragState>({ ...INITIAL_DRAG });
  const animFrameRef = useRef<number>(0);
  const isPointerDownRef = useRef(false);

  // ─── Render Loop ────────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Grid
    if (state.showGrid) {
      renderGrid(ctx, width, height, state.viewTransform, state.gridSize);
    }

    // Elements
    const visible = getVisibleElements();
    renderElements(ctx, visible, state.viewTransform);

    // Selection overlay
    renderSelectionOverlay(
      ctx,
      visible,
      state.selection.selectedIds,
      state.viewTransform,
      state.selection.selectionBox
    );
  }, [state, getVisibleElements, canvasRef]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  // ─── Canvas Resize ───────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    });

    const parent = canvas.parentElement;
    if (parent) resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, [canvasRef]);

  // ─── Coordinate Helpers ──────────────────────────────────────────────────────

  const toCanvas = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: screenX, y: screenY };
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const sx = (screenX - rect.left);
    const sy = (screenY - rect.top);
    return screenToCanvas(sx, sy, state.viewTransform.offsetX, state.viewTransform.offsetY, state.viewTransform.zoom);
  }, [canvasRef, state.viewTransform]);

  // ─── Hit Testing ─────────────────────────────────────────────────────────────

  const getResizeHandle = useCallback((element: WhiteboardElement, point: Point): ResizeHandlePos | null => {
    const PADDING = SELECTION_PADDING;
    const HS = HANDLE_SIZE;
    const ROT_OFFSET = ROTATION_HANDLE_OFFSET;

    let x: number, y: number, w: number, h: number;
    if (element.type === 'pencil' || element.type === 'line' || element.type === 'arrow') {
      const pts = element.points;
      if (!pts || pts.length === 0) { x = element.x; y = element.y; w = element.width; h = element.height; }
      else {
        const xs = pts.map(p => p.x + element.x);
        const ys = pts.map(p => p.y + element.y);
        x = Math.min(...xs) - PADDING; y = Math.min(...ys) - PADDING;
        w = Math.max(...xs) - x + PADDING; h = Math.max(...ys) - y + PADDING;
      }
    } else {
      x = element.x - PADDING; y = element.y - PADDING;
      w = element.width + PADDING * 2; h = element.height + PADDING * 2;
    }

    // Rotate point into element space
    const center = { x: element.x + element.width / 2, y: element.y + element.height / 2 };
    const lp = element.angle !== 0 ? rotatePoint(point, center, -element.angle) : point;

    const handles: Array<[ResizeHandlePos, number, number]> = [
      ['nw', x, y], ['n', x + w / 2, y], ['ne', x + w, y],
      ['e', x + w, y + h / 2],
      ['se', x + w, y + h], ['s', x + w / 2, y + h], ['sw', x, y + h],
      ['w', x, y + h / 2],
      ['rotation', x + w / 2, y - ROT_OFFSET],
    ];

    for (const [pos, hx, hy] of handles) {
      if (Math.abs(lp.x - hx) <= HS && Math.abs(lp.y - hy) <= HS) {
        return pos;
      }
    }
    return null;
  }, []);

  const getElementAtPoint = useCallback((point: Point): WhiteboardElement | null => {
    const visible = getVisibleElements();
    // Iterate in reverse (top-most first)
    for (let i = visible.length - 1; i >= 0; i--) {
      if (hitTestElement(visible[i], point)) return visible[i];
    }
    return null;
  }, [getVisibleElements]);

  // ─── Element Creation ────────────────────────────────────────────────────────

  const createElementAt = useCallback((point: Point): WhiteboardElement | null => {
    const { selectedTool, currentStyle } = state;
    const id = generateId();
    const seed = generateSeed();
    const base = {
      id, seed, version: 1, isDeleted: false, locked: false, groupId: null,
      angle: 0, style: { ...currentStyle },
      x: point.x, y: point.y, width: 0, height: 0,
    };

    switch (selectedTool) {
      case 'rectangle':
        return { ...base, type: 'rectangle' } as RectangleElement;
      case 'ellipse':
        return { ...base, type: 'ellipse' } as EllipseElement;
      case 'diamond':
        return { ...base, type: 'diamond' } as DiamondElement;
      case 'line':
        return { ...base, type: 'line', points: [{ x: 0, y: 0 }, { x: 0, y: 0 }] } as LineElement;
      case 'arrow':
        return { ...base, type: 'arrow', points: [{ x: 0, y: 0 }, { x: 0, y: 0 }], startArrowhead: 'none', endArrowhead: 'arrow', startBindingId: null, endBindingId: null } as ArrowElement;
      case 'pencil':
        return { ...base, type: 'pencil', points: [{ x: 0, y: 0 }], pressures: [0.5] } as PencilElement;
      case 'text':
        return { ...base, type: 'text', text: '', isEditing: true, width: 200, height: 40 } as TextElement;
      default:
        return null;
    }
  }, [state]);

  // ─── Pointer Down ────────────────────────────────────────────────────────────

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.altKey || state.selectedTool === 'hand'))) {
      // Middle mouse or alt+drag = pan
      dragRef.current = { ...INITIAL_DRAG, type: 'panning', startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
      dispatch({ type: 'SET_IS_PANNING', value: true });
      return;
    }

    if (e.button !== 0) return;

    const canvasPoint = toCanvas(e.clientX, e.clientY);
    const { selectedTool } = state;

    if (selectedTool === 'hand') {
      dragRef.current = { ...INITIAL_DRAG, type: 'panning', startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
      dispatch({ type: 'SET_IS_PANNING', value: true });
      return;
    }

    if (selectedTool === 'selection') {
      const selectedEls = getSelectedElements();

      // Check resize/rotation handles on selected elements
      if (selectedEls.length === 1) {
        const handle = getResizeHandle(selectedEls[0], canvasPoint);
        if (handle) {
          const el = selectedEls[0];
          const startPositions = new Map([[el.id, { x: el.x, y: el.y, width: el.width, height: el.height }]]);
          if (handle === 'rotation') {
            const center = getBoundsCenter(getElementBounds(el));
            const startAngle = Math.atan2(canvasPoint.y - center.y, canvasPoint.x - center.x);
            dragRef.current = {
              ...INITIAL_DRAG, type: 'rotating',
              startX: canvasPoint.x, startY: canvasPoint.y,
              lastX: canvasPoint.x, lastY: canvasPoint.y,
              elementIds: [el.id],
              elementStartPositions: startPositions,
              resizeHandle: handle,
              rotationStartAngle: startAngle,
              rotationElementAngle: el.angle,
            };
          } else {
            dragRef.current = {
              ...INITIAL_DRAG, type: 'resizing',
              startX: canvasPoint.x, startY: canvasPoint.y,
              lastX: canvasPoint.x, lastY: canvasPoint.y,
              elementIds: [el.id],
              elementStartPositions: startPositions,
              resizeHandle: handle,
              rotationStartAngle: 0,
              rotationElementAngle: 0,
            };
          }
          isPointerDownRef.current = true;
          return;
        }
      }

      // Hit test elements
      const hit = getElementAtPoint(canvasPoint);
      if (hit && !hit.locked) {
        // If clicking on already-selected element, start moving
        if (state.selection.selectedIds.has(hit.id)) {
          // Move all selected
          const selected = getSelectedElements();
          const startPositions = new Map(
            selected.map(el => [el.id, { x: el.x, y: el.y, width: el.width, height: el.height,
              points: (el.type === 'pencil' || el.type === 'line' || el.type === 'arrow') ? [...el.points] : undefined }])
          );
          dispatch({ type: 'PUSH_HISTORY' });
          dragRef.current = {
            ...INITIAL_DRAG, type: 'moving',
            startX: canvasPoint.x, startY: canvasPoint.y,
            lastX: canvasPoint.x, lastY: canvasPoint.y,
            elementIds: selected.map(el => el.id),
            elementStartPositions: startPositions,
            resizeHandle: null, rotationStartAngle: 0, rotationElementAngle: 0,
          };
        } else {
          // Select and start moving
          const newIds = e.shiftKey
            ? [...state.selection.selectedIds, hit.id]
            : [hit.id];
          dispatch({ type: 'SELECT_ELEMENTS', ids: newIds });
          const selected = getVisibleElements().filter(el => newIds.includes(el.id));
          const startPositions = new Map(
            selected.map(el => [el.id, { x: el.x, y: el.y, width: el.width, height: el.height,
              points: (el.type === 'pencil' || el.type === 'line' || el.type === 'arrow') ? [...el.points] : undefined }])
          );
          dispatch({ type: 'PUSH_HISTORY' });
          dragRef.current = {
            ...INITIAL_DRAG, type: 'moving',
            startX: canvasPoint.x, startY: canvasPoint.y,
            lastX: canvasPoint.x, lastY: canvasPoint.y,
            elementIds: newIds,
            elementStartPositions: startPositions,
            resizeHandle: null, rotationStartAngle: 0, rotationElementAngle: 0,
          };
        }
      } else {
        // Start rubber-band selection
        if (!e.shiftKey) dispatch({ type: 'DESELECT_ALL' });
        dragRef.current = {
          ...INITIAL_DRAG, type: 'selecting',
          startX: canvasPoint.x, startY: canvasPoint.y,
          lastX: canvasPoint.x, lastY: canvasPoint.y,
          elementIds: [], elementStartPositions: new Map(),
          resizeHandle: null, rotationStartAngle: 0, rotationElementAngle: 0,
        };
        dispatch({ type: 'SET_IS_SELECTING', value: true });
      }
      isPointerDownRef.current = true;
      return;
    }

    // Drawing tools
    if (selectedTool === 'text') {
      // Check if clicking on existing text element
      const hit = getElementAtPoint(canvasPoint);
      if (hit && hit.type === 'text') {
        dispatch({ type: 'SELECT_ELEMENTS', ids: [hit.id] });
        return;
      }
      const el = createElementAt(canvasPoint);
      if (el) {
        dispatch({ type: 'PUSH_HISTORY' });
        dispatch({ type: 'ADD_ELEMENT', element: el });
        dispatch({ type: 'SELECT_ELEMENTS', ids: [el.id] });
      }
      return;
    }

    const el = createElementAt(canvasPoint);
    if (el) {
      dispatch({ type: 'PUSH_HISTORY' });
      dispatch({ type: 'ADD_ELEMENT', element: el });
      dispatch({ type: 'SET_DRAWING', drawing: { isDrawing: true, currentElementId: el.id, startPoint: canvasPoint, lastPoint: canvasPoint } });
      dragRef.current = {
        ...INITIAL_DRAG, type: 'drawing',
        startX: canvasPoint.x, startY: canvasPoint.y,
        lastX: canvasPoint.x, lastY: canvasPoint.y,
        elementIds: [el.id], elementStartPositions: new Map(),
        resizeHandle: null, rotationStartAngle: 0, rotationElementAngle: 0,
      };
    }
    isPointerDownRef.current = true;
  }, [state, dispatch, toCanvas, getSelectedElements, getVisibleElements, getElementAtPoint, getResizeHandle, createElementAt]);

  // ─── Pointer Move ────────────────────────────────────────────────────────────

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (drag.type === 'none') return;

    const canvasPoint = toCanvas(e.clientX, e.clientY);

    if (drag.type === 'panning') {
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      dispatch({ type: 'SET_VIEW_TRANSFORM', transform: {
        offsetX: state.viewTransform.offsetX + dx,
        offsetY: state.viewTransform.offsetY + dy,
      }});
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      return;
    }

    if (drag.type === 'selecting') {
      const box = normalizeBounds(drag.startX, drag.startY, canvasPoint.x, canvasPoint.y);
      dispatch({ type: 'SET_SELECTION_BOX', box });

      // Select elements within box
      const visible = getVisibleElements();
      const inBox = visible.filter(el => {
        if (el.isDeleted) return false;
        const bounds = getElementBounds(el);
        return (
          bounds.x >= box.x && bounds.y >= box.y &&
          bounds.x + bounds.width <= box.x + box.width &&
          bounds.y + bounds.height <= box.y + box.height
        );
      });
      dispatch({ type: 'SELECT_ELEMENTS', ids: inBox.map(el => el.id) });
      dragRef.current.lastX = canvasPoint.x;
      dragRef.current.lastY = canvasPoint.y;
      return;
    }

    if (drag.type === 'moving') {
      const dx = canvasPoint.x - drag.startX;
      const dy = canvasPoint.y - drag.startY;
      const updates = drag.elementIds.map(id => {
        const start = drag.elementStartPositions.get(id);
        if (!start) return { id, updates: {} };
        let newX = start.x + dx;
        let newY = start.y + dy;
        if (state.snapToGrid) {
          newX = snapValue(newX, state.gridSize);
          newY = snapValue(newY, state.gridSize);
        }
        return { id, updates: { x: newX, y: newY } };
      });
      dispatch({ type: 'UPDATE_ELEMENTS', updates });
      return;
    }

    if (drag.type === 'resizing') {
      const id = drag.elementIds[0];
      const start = drag.elementStartPositions.get(id);
      if (!start || !drag.resizeHandle) return;

      const dx = canvasPoint.x - drag.startX;
      const dy = canvasPoint.y - drag.startY;
      let { x, y, width, height } = start;

      switch (drag.resizeHandle) {
        case 'se': width += dx; height += dy; break;
        case 'sw': x += dx; width -= dx; height += dy; break;
        case 'ne': width += dx; y += dy; height -= dy; break;
        case 'nw': x += dx; y += dy; width -= dx; height -= dy; break;
        case 'e': width += dx; break;
        case 'w': x += dx; width -= dx; break;
        case 's': height += dy; break;
        case 'n': y += dy; height -= dy; break;
      }

      // Minimum size
      if (width < 10) { if (drag.resizeHandle.includes('w')) x = start.x + start.width - 10; width = 10; }
      if (height < 10) { if (drag.resizeHandle.includes('n')) y = start.y + start.height - 10; height = 10; }

      dispatch({ type: 'UPDATE_ELEMENT', id, updates: { x, y, width, height } });
      return;
    }

    if (drag.type === 'rotating') {
      const id = drag.elementIds[0];
      const el = getVisibleElements().find(e => e.id === id);
      if (!el) return;
      const center = getBoundsCenter(getElementBounds(el));
      const currentAngle = Math.atan2(canvasPoint.y - center.y, canvasPoint.x - center.x);
      const angleDelta = currentAngle - drag.rotationStartAngle;
      let newAngle = drag.rotationElementAngle + angleDelta;
      // Snap to 15° increments when shift held
      if (e.shiftKey) {
        const snap = Math.PI / 12;
        newAngle = Math.round(newAngle / snap) * snap;
      }
      dispatch({ type: 'UPDATE_ELEMENT', id, updates: { angle: newAngle } });
      return;
    }

    if (drag.type === 'drawing') {
      const id = drag.elementIds[0];
      const startPt = { x: drag.startX, y: drag.startY };
      const { selectedTool } = state;

      if (selectedTool === 'pencil') {
        const el = getVisibleElements().find(e => e.id === id);
        if (!el || el.type !== 'pencil') return;
        const newPoint = { x: canvasPoint.x - el.x, y: canvasPoint.y - el.y };
        const pressure = (e as any).pressure ?? 0.5;
        dispatch({ type: 'UPDATE_ELEMENT', id, updates: {
          points: [...el.points, newPoint],
          pressures: [...el.pressures, pressure],
        }});
      } else if (selectedTool === 'line' || selectedTool === 'arrow') {
        const dx = canvasPoint.x - startPt.x;
        const dy = canvasPoint.y - startPt.y;
        // Constrain to 45° if shift held
        let endX = canvasPoint.x, endY = canvasPoint.y;
        if (e.shiftKey) {
          const angle = Math.atan2(dy, dx);
          const snap = Math.PI / 4;
          const snapped = Math.round(angle / snap) * snap;
          const len = Math.sqrt(dx * dx + dy * dy);
          endX = startPt.x + len * Math.cos(snapped);
          endY = startPt.y + len * Math.sin(snapped);
        }
        dispatch({ type: 'UPDATE_ELEMENT', id, updates: {
          points: [{ x: 0, y: 0 }, { x: endX - startPt.x, y: endY - startPt.y }],
          width: Math.abs(endX - startPt.x),
          height: Math.abs(endY - startPt.y),
        }});
      } else {
        // Rectangle, ellipse, diamond
        let w = canvasPoint.x - startPt.x;
        let h = canvasPoint.y - startPt.y;
        // Constrain to square if shift held
        if (e.shiftKey) {
          const size = Math.max(Math.abs(w), Math.abs(h));
          w = w < 0 ? -size : size;
          h = h < 0 ? -size : size;
        }
        const bounds = normalizeBounds(startPt.x, startPt.y, startPt.x + w, startPt.y + h);
        dispatch({ type: 'UPDATE_ELEMENT', id, updates: bounds });
      }
      dragRef.current.lastX = canvasPoint.x;
      dragRef.current.lastY = canvasPoint.y;
    }
  }, [state, dispatch, toCanvas, getVisibleElements]);

  // ─── Pointer Up ──────────────────────────────────────────────────────────────

  const handlePointerUp = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;

    if (drag.type === 'panning') {
      dispatch({ type: 'SET_IS_PANNING', value: false });
    }

    if (drag.type === 'selecting') {
      dispatch({ type: 'SET_SELECTION_BOX', box: null });
      dispatch({ type: 'SET_IS_SELECTING', value: false });
    }

    if (drag.type === 'drawing') {
      const id = drag.elementIds[0];
      const el = getVisibleElements().find(e => e.id === id);
      if (el) {
        // Remove tiny elements
        if (el.type !== 'pencil' && el.type !== 'text' && el.type !== 'line' && el.type !== 'arrow') {
          if (el.width < 5 && el.height < 5) {
            dispatch({ type: 'DELETE_ELEMENTS', ids: [id] });
          } else {
            // Auto-select after drawing
            dispatch({ type: 'SELECT_ELEMENTS', ids: [id] });
            dispatch({ type: 'SET_TOOL', tool: 'selection' });
          }
        } else if (el.type === 'pencil') {
          if (el.points.length < 3) {
            dispatch({ type: 'DELETE_ELEMENTS', ids: [id] });
          } else {
            dispatch({ type: 'SELECT_ELEMENTS', ids: [id] });
            dispatch({ type: 'SET_TOOL', tool: 'selection' });
          }
        } else if (el.type === 'line' || el.type === 'arrow') {
          const pts = el.points;
          const len = Math.sqrt((pts[1].x - pts[0].x) ** 2 + (pts[1].y - pts[0].y) ** 2);
          if (len < 5) {
            dispatch({ type: 'DELETE_ELEMENTS', ids: [id] });
          } else {
            dispatch({ type: 'SELECT_ELEMENTS', ids: [id] });
            dispatch({ type: 'SET_TOOL', tool: 'selection' });
          }
        }
      }
      dispatch({ type: 'SET_DRAWING', drawing: { isDrawing: false, currentElementId: null, startPoint: null, lastPoint: null } });
    }

    dragRef.current = { ...INITIAL_DRAG };
    isPointerDownRef.current = false;
  }, [dispatch, getVisibleElements]);

  // ─── Wheel (Zoom + Pan) ──────────────────────────────────────────────────────

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      // Pinch-to-zoom or ctrl+wheel
      const delta = -e.deltaY * 0.01;
      const newZoom = state.viewTransform.zoom * (1 + delta);
      dispatch({ type: 'SET_ZOOM', zoom: newZoom, centerX, centerY });
    } else {
      // Pan
      const dx = e.shiftKey ? -e.deltaY : -e.deltaX;
      const dy = e.shiftKey ? 0 : -e.deltaY;
      dispatch({ type: 'SET_VIEW_TRANSFORM', transform: {
        offsetX: state.viewTransform.offsetX + dx,
        offsetY: state.viewTransform.offsetY + dy,
      }});
    }
  }, [state.viewTransform, dispatch, canvasRef]);

  // ─── Event Listeners ─────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, canvasRef]);

  // ─── Cursor Style ────────────────────────────────────────────────────────────

  const getCursor = useCallback((): string => {
    if (state.isPanning || state.selectedTool === 'hand') return 'grab';
    if (dragRef.current.type === 'panning') return 'grabbing';
    if (state.selectedTool !== 'selection') return 'crosshair';
    return 'default';
  }, [state.isPanning, state.selectedTool]);

  return { getCursor };
}
