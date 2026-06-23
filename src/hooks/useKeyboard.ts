/**
 * useKeyboard hook - handles all keyboard shortcuts for the whiteboard.
 */

import { useEffect, useCallback } from 'react';
import { useAppContext } from '../store/AppContext';
import { ToolType } from '../types';

export function useKeyboard() {
  const { state, dispatch, getSelectedElements, getVisibleElements } = useAppContext();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't intercept when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // ─── Undo / Redo ──────────────────────────────────────────────────────────
    if (ctrl && e.key === 'z' && !shift) {
      e.preventDefault();
      dispatch({ type: 'UNDO' });
      return;
    }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && shift))) {
      e.preventDefault();
      dispatch({ type: 'REDO' });
      return;
    }

    // ─── Copy / Paste / Duplicate ─────────────────────────────────────────────
    if (ctrl && e.key === 'c') {
      e.preventDefault();
      const selected = getSelectedElements();
      if (selected.length > 0) {
        const data = JSON.stringify(selected);
        navigator.clipboard.writeText(data).catch(() => {
          sessionStorage.setItem('wb_clipboard', data);
        });
      }
      return;
    }

    if (ctrl && e.key === 'v') {
      e.preventDefault();
      const paste = async () => {
        let data: string | null = null;
        try {
          data = await navigator.clipboard.readText();
        } catch {
          data = sessionStorage.getItem('wb_clipboard');
        }
        if (!data) return;
        try {
          const elements = JSON.parse(data);
          if (!Array.isArray(elements)) return;
          const { generateId, generateSeed } = await import('../utils/geometry');
          const OFFSET = 20;
          const newElements = elements.map((el: any) => ({
            ...el,
            id: generateId(),
            seed: generateSeed(),
            x: el.x + OFFSET,
            y: el.y + OFFSET,
            isDeleted: false,
          }));
          dispatch({ type: 'PUSH_HISTORY' });
          newElements.forEach((el: any) => dispatch({ type: 'ADD_ELEMENT', element: el }));
          dispatch({ type: 'SELECT_ELEMENTS', ids: newElements.map((el: any) => el.id) });
        } catch {
          // Not whiteboard data, ignore
        }
      };
      paste();
      return;
    }

    if (ctrl && e.key === 'd') {
      e.preventDefault();
      const selected = getSelectedElements();
      if (selected.length === 0) return;
      const OFFSET = 20;
      import('../utils/geometry').then(({ generateId, generateSeed }) => {
        const newElements = selected.map(el => ({
          ...el,
          id: generateId(),
          seed: generateSeed(),
          x: el.x + OFFSET,
          y: el.y + OFFSET,
          isDeleted: false,
        }));
        dispatch({ type: 'PUSH_HISTORY' });
        newElements.forEach(el => dispatch({ type: 'ADD_ELEMENT', element: el }));
        dispatch({ type: 'SELECT_ELEMENTS', ids: newElements.map(el => el.id) });
      });
      return;
    }

    // ─── Select All ───────────────────────────────────────────────────────────
    if (ctrl && e.key === 'a') {
      e.preventDefault();
      const visible = getVisibleElements();
      dispatch({ type: 'SELECT_ELEMENTS', ids: visible.map(el => el.id) });
      return;
    }

    // ─── Delete ───────────────────────────────────────────────────────────────
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selected = getSelectedElements();
      if (selected.length > 0) {
        e.preventDefault();
        dispatch({ type: 'PUSH_HISTORY' });
        dispatch({ type: 'DELETE_ELEMENTS', ids: selected.map(el => el.id) });
      }
      return;
    }

    // ─── Escape ───────────────────────────────────────────────────────────────
    if (e.key === 'Escape') {
      dispatch({ type: 'DESELECT_ALL' });
      dispatch({ type: 'SET_TOOL', tool: 'selection' });
      return;
    }

    // ─── Tool Shortcuts ───────────────────────────────────────────────────────
    const toolMap: Record<string, ToolType> = {
      'v': 'selection',
      'h': 'hand',
      'r': 'rectangle',
      'e': 'ellipse',
      'd': 'diamond',
      'l': 'line',
      'a': 'arrow',
      'p': 'pencil',
      't': 'text',
    };

    if (!ctrl && !shift && toolMap[e.key.toLowerCase()]) {
      dispatch({ type: 'SET_TOOL', tool: toolMap[e.key.toLowerCase()] });
      return;
    }

    // ─── Zoom ─────────────────────────────────────────────────────────────────
    if (ctrl && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      dispatch({ type: 'SET_ZOOM', zoom: state.viewTransform.zoom * 1.2 });
      return;
    }
    if (ctrl && e.key === '-') {
      e.preventDefault();
      dispatch({ type: 'SET_ZOOM', zoom: state.viewTransform.zoom / 1.2 });
      return;
    }
    if (ctrl && e.key === '0') {
      e.preventDefault();
      dispatch({ type: 'SET_VIEW_TRANSFORM', transform: { zoom: 1, offsetX: 0, offsetY: 0 } });
      return;
    }

    // ─── Layer Ordering ───────────────────────────────────────────────────────
    if (ctrl && e.key === ']') {
      e.preventDefault();
      const selected = getSelectedElements();
      if (selected.length > 0) {
        dispatch({ type: 'PUSH_HISTORY' });
        if (shift) {
          dispatch({ type: 'BRING_TO_FRONT', ids: selected.map(el => el.id) });
        } else {
          dispatch({ type: 'BRING_FORWARD', ids: selected.map(el => el.id) });
        }
      }
      return;
    }
    if (ctrl && e.key === '[') {
      e.preventDefault();
      const selected = getSelectedElements();
      if (selected.length > 0) {
        dispatch({ type: 'PUSH_HISTORY' });
        if (shift) {
          dispatch({ type: 'SEND_TO_BACK', ids: selected.map(el => el.id) });
        } else {
          dispatch({ type: 'SEND_BACKWARD', ids: selected.map(el => el.id) });
        }
      }
      return;
    }

    // ─── Group / Ungroup ──────────────────────────────────────────────────────
    if (ctrl && e.key === 'g') {
      e.preventDefault();
      const selected = getSelectedElements();
      if (selected.length > 1) {
        dispatch({ type: 'PUSH_HISTORY' });
        if (shift) {
          // Ungroup - find unique group IDs
          const groupIds = new Set(selected.map(el => el.groupId).filter(Boolean) as string[]);
          groupIds.forEach(gid => dispatch({ type: 'UNGROUP_ELEMENTS', groupId: gid }));
        } else {
          dispatch({ type: 'GROUP_ELEMENTS', ids: selected.map(el => el.id) });
        }
      }
      return;
    }

    // ─── Lock / Unlock ────────────────────────────────────────────────────────
    if (ctrl && e.key === 'l') {
      e.preventDefault();
      const selected = getSelectedElements();
      if (selected.length > 0) {
        const allLocked = selected.every(el => el.locked);
        if (allLocked) {
          dispatch({ type: 'UNLOCK_ELEMENTS', ids: selected.map(el => el.id) });
        } else {
          dispatch({ type: 'LOCK_ELEMENTS', ids: selected.map(el => el.id) });
        }
      }
      return;
    }

    // ─── Arrow Key Nudge ──────────────────────────────────────────────────────
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      const selected = getSelectedElements();
      if (selected.length === 0) return;
      e.preventDefault();
      const step = shift ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      const updates = selected.map(el => ({
        id: el.id,
        updates: { x: el.x + dx, y: el.y + dy },
      }));
      dispatch({ type: 'UPDATE_ELEMENTS', updates });
      return;
    }
  }, [state, dispatch, getSelectedElements, getVisibleElements]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
