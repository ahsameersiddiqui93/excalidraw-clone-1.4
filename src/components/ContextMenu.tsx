/**
 * Right-click context menu for element operations.
 */

import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../store/AppContext';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const { dispatch, getSelectedElements } = useAppContext();
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = getSelectedElements();
  const hasSelection = selected.length > 0;
  const hasGroup = selected.some(el => el.groupId !== null);
  const allLocked = selected.length > 0 && selected.every(el => el.locked);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const action = (fn: () => void) => () => { fn(); onClose(); };

  const duplicate = action(() => {
    if (!hasSelection) return;
    import('../utils/geometry').then(({ generateId, generateSeed }) => {
      const newElements = selected.map(el => ({
        ...el,
        id: generateId(),
        seed: generateSeed(),
        x: el.x + 20,
        y: el.y + 20,
        isDeleted: false,
      }));
      dispatch({ type: 'PUSH_HISTORY' });
      newElements.forEach(el => dispatch({ type: 'ADD_ELEMENT', element: el }));
      dispatch({ type: 'SELECT_ELEMENTS', ids: newElements.map(el => el.id) });
    });
  });

  const deleteSelected = action(() => {
    if (!hasSelection) return;
    dispatch({ type: 'PUSH_HISTORY' });
    dispatch({ type: 'DELETE_ELEMENTS', ids: selected.map(el => el.id) });
  });

  const bringToFront = action(() => {
    dispatch({ type: 'PUSH_HISTORY' });
    dispatch({ type: 'BRING_TO_FRONT', ids: selected.map(el => el.id) });
  });

  const sendToBack = action(() => {
    dispatch({ type: 'PUSH_HISTORY' });
    dispatch({ type: 'SEND_TO_BACK', ids: selected.map(el => el.id) });
  });

  const bringForward = action(() => {
    dispatch({ type: 'PUSH_HISTORY' });
    dispatch({ type: 'BRING_FORWARD', ids: selected.map(el => el.id) });
  });

  const sendBackward = action(() => {
    dispatch({ type: 'PUSH_HISTORY' });
    dispatch({ type: 'SEND_BACKWARD', ids: selected.map(el => el.id) });
  });

  const group = action(() => {
    if (selected.length < 2) return;
    dispatch({ type: 'PUSH_HISTORY' });
    dispatch({ type: 'GROUP_ELEMENTS', ids: selected.map(el => el.id) });
  });

  const ungroup = action(() => {
    const groupIds = new Set(selected.map(el => el.groupId).filter(Boolean) as string[]);
    dispatch({ type: 'PUSH_HISTORY' });
    groupIds.forEach(gid => dispatch({ type: 'UNGROUP_ELEMENTS', groupId: gid }));
  });

  const toggleLock = action(() => {
    if (allLocked) {
      dispatch({ type: 'UNLOCK_ELEMENTS', ids: selected.map(el => el.id) });
    } else {
      dispatch({ type: 'LOCK_ELEMENTS', ids: selected.map(el => el.id) });
    }
  });

  const selectAll = action(() => {
    // We need visible elements - dispatch select all
    dispatch({ type: 'SELECT_ELEMENTS', ids: [] }); // Will be handled differently
  });

  // Adjust position to stay within viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 300),
    zIndex: 10000,
  };

  return (
    <div ref={menuRef} className="context-menu" style={menuStyle}>
      {hasSelection && (
        <>
          <button className="context-menu-item" onClick={duplicate}>
            <span>Duplicate</span>
            <span className="shortcut">Ctrl+D</span>
          </button>
          <button className="context-menu-item danger" onClick={deleteSelected}>
            <span>Delete</span>
            <span className="shortcut">Del</span>
          </button>
          <div className="context-menu-divider"/>
          <button className="context-menu-item" onClick={bringToFront}>
            <span>Bring to Front</span>
            <span className="shortcut">Ctrl+Shift+]</span>
          </button>
          <button className="context-menu-item" onClick={bringForward}>
            <span>Bring Forward</span>
            <span className="shortcut">Ctrl+]</span>
          </button>
          <button className="context-menu-item" onClick={sendBackward}>
            <span>Send Backward</span>
            <span className="shortcut">Ctrl+[</span>
          </button>
          <button className="context-menu-item" onClick={sendToBack}>
            <span>Send to Back</span>
            <span className="shortcut">Ctrl+Shift+[</span>
          </button>
          <div className="context-menu-divider"/>
          {selected.length > 1 && (
            <button className="context-menu-item" onClick={group}>
              <span>Group</span>
              <span className="shortcut">Ctrl+G</span>
            </button>
          )}
          {hasGroup && (
            <button className="context-menu-item" onClick={ungroup}>
              <span>Ungroup</span>
              <span className="shortcut">Ctrl+Shift+G</span>
            </button>
          )}
          <button className="context-menu-item" onClick={toggleLock}>
            <span>{allLocked ? 'Unlock' : 'Lock'}</span>
            <span className="shortcut">Ctrl+L</span>
          </button>
          <div className="context-menu-divider"/>
        </>
      )}
      <button className="context-menu-item" onClick={action(() => dispatch({ type: 'UNDO' }))}>
        <span>Undo</span>
        <span className="shortcut">Ctrl+Z</span>
      </button>
      <button className="context-menu-item" onClick={action(() => dispatch({ type: 'REDO' }))}>
        <span>Redo</span>
        <span className="shortcut">Ctrl+Y</span>
      </button>
    </div>
  );
}
