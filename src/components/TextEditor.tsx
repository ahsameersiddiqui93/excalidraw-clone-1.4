/**
 * Floating text editor overlay for editing text elements on the canvas.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../store/AppContext';
import { TextElement } from '../types';
import { canvasToScreen } from '../utils/geometry';

interface TextEditorProps {
  element: TextElement;
}

const FONT_FAMILIES: Record<string, string> = {
  hand: '"Caveat", "Comic Sans MS", cursive',
  normal: '"Segoe UI", Arial, sans-serif',
  code: '"Fira Code", "Courier New", monospace',
};

export function TextEditor({ element }: TextEditorProps) {
  const { state, dispatch } = useAppContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { offsetX, offsetY, zoom } = state.viewTransform;
  const screenPos = canvasToScreen(element.x, element.y, offsetX, offsetY, zoom);

  const fontFamily = FONT_FAMILIES[element.style.fontFamily] || FONT_FAMILIES.normal;
  const fontSize = element.style.fontSize * zoom;

  const finishEditing = useCallback(() => {
    const text = textareaRef.current?.value ?? '';
    if (!text.trim()) {
      dispatch({ type: 'DELETE_ELEMENTS', ids: [element.id] });
    } else {
      // Calculate width/height based on text content
      const lines = text.split('\n');
      const lineHeight = element.style.fontSize * 1.4;
      const height = lines.length * lineHeight;
      // Approximate width
      const maxLen = Math.max(...lines.map(l => l.length));
      const width = Math.max(100, maxLen * element.style.fontSize * 0.6);
      dispatch({
        type: 'UPDATE_ELEMENT',
        id: element.id,
        updates: { text, isEditing: false, width, height },
      });
    }
    dispatch({ type: 'SET_TOOL', tool: 'selection' });
  }, [dispatch, element]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.value = element.text;
    // Place cursor at end
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, [element.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      finishEditing();
    }
    // Allow Enter for newlines, but Ctrl+Enter finishes
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      finishEditing();
    }
    e.stopPropagation();
  };

  const handleBlur = () => {
    finishEditing();
  };

  const handleInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    // Auto-resize
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
    ta.style.width = 'auto';
    ta.style.width = `${Math.max(100, ta.scrollWidth)}px`;
  };

  return (
    <div
      className="text-editor-overlay"
      style={{
        position: 'absolute',
        left: screenPos.x,
        top: screenPos.y,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <textarea
        ref={textareaRef}
        className="text-editor-textarea"
        defaultValue={element.text}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onInput={handleInput}
        style={{
          pointerEvents: 'all',
          position: 'absolute',
          top: 0,
          left: 0,
          minWidth: '100px',
          minHeight: `${fontSize * 1.4}px`,
          font: `${fontSize}px ${fontFamily}`,
          color: element.style.strokeColor,
          opacity: element.style.opacity / 100,
          textAlign: element.style.textAlign as React.CSSProperties['textAlign'],
          background: 'transparent',
          border: '1px dashed #4a90e2',
          outline: 'none',
          resize: 'none',
          padding: '2px 4px',
          lineHeight: '1.4',
          overflow: 'hidden',
          whiteSpace: 'pre',
          boxSizing: 'border-box',
          transformOrigin: 'top left',
          transform: element.angle !== 0 ? `rotate(${element.angle}rad)` : undefined,
        }}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  );
}
