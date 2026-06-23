/**
 * Main canvas component - the central drawing surface.
 * Manages the canvas element, hooks, and overlays.
 */

import React, { useRef, useState, useCallback } from 'react';
import { useCanvas } from '../hooks/useCanvas';
import { useAppContext } from '../store/AppContext';
import { TextEditor } from './TextEditor';
import { ContextMenu } from './ContextMenu';
import { TextElement } from '../types';

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getCursor } = useCanvas(canvasRef);
  const { state, getVisibleElements } = useAppContext();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Find any text element currently being edited
  const editingTextElement = getVisibleElements().find(
    el => el.type === 'text' && (el as TextElement).isEditing
  ) as TextElement | undefined;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return (
    <div
      className="canvas-container"
      style={{ cursor: getCursor() }}
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        className="main-canvas"
        style={{ display: 'block', touchAction: 'none' }}
      />

      {/* Text editor overlay */}
      {editingTextElement && (
        <TextEditor element={editingTextElement} />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
