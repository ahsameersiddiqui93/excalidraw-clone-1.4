/**
 * Top bar with undo/redo, export, import, and canvas controls.
 */

import React, { useRef } from 'react';
import { useAppContext } from '../store/AppContext';
import { exportToPNG, exportToSVG, downloadJSON, importFromJSON, readFileAsText } from '../utils/exportImport';

export function TopBar() {
  const { state, dispatch, getVisibleElements } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;

  const handleExportPNG = () => {
    exportToPNG(getVisibleElements(), 2, 20, true, 'whiteboard.png');
  };

  const handleExportSVG = () => {
    exportToSVG(getVisibleElements(), 20, true, 'whiteboard.svg');
  };

  const handleExportJSON = () => {
    downloadJSON(getVisibleElements(), state.viewTransform, 'whiteboard.json');
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const data = importFromJSON(text);
      if (data) {
        dispatch({ type: 'PUSH_HISTORY' });
        dispatch({ type: 'SET_ELEMENTS', elements: data.elements });
        if (data.viewTransform) {
          dispatch({ type: 'SET_VIEW_TRANSFORM', transform: data.viewTransform });
        }
      }
    } catch (err) {
      console.error('Failed to import file:', err);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearCanvas = () => {
    if (window.confirm('Clear the canvas? This cannot be undone.')) {
      dispatch({ type: 'RESET_CANVAS' });
    }
  };

  return (
    <div className="top-bar">
      {/* App Logo */}
      <div className="top-bar-logo">
        <svg viewBox="0 0 32 32" width="28" height="28">
          <rect x="2" y="2" width="28" height="28" rx="6" fill="#6965db"/>
          <path d="M8 22 L14 10 L20 22" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="10" y1="18" x2="18" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <span className="top-bar-title">Whiteboard</span>
      </div>

      {/* Undo / Redo */}
      <div className="top-bar-group">
        <button
          className="top-bar-btn"
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 14 4 9 9 4"/>
            <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
          </svg>
        </button>
        <button
          className="top-bar-btn"
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 14 20 9 15 4"/>
            <path d="M4 20v-7a4 4 0 0 1 4-4h12"/>
          </svg>
        </button>
      </div>

      <div className="top-bar-divider"/>

      {/* Grid Toggle */}
      <div className="top-bar-group">
        <button
          className={`top-bar-btn ${state.showGrid ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
          title="Toggle Grid"
          aria-label="Toggle Grid"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
          </svg>
        </button>
        <button
          className={`top-bar-btn ${state.snapToGrid ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_SNAP' })}
          title="Snap to Grid"
          aria-label="Snap to Grid"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
          </svg>
        </button>
      </div>

      <div className="top-bar-divider"/>

      {/* Export */}
      <div className="top-bar-group">
        <div className="dropdown">
          <button className="top-bar-btn dropdown-trigger" title="Export">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Export</span>
          </button>
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={handleExportPNG}>
              Export as PNG
            </button>
            <button className="dropdown-item" onClick={handleExportSVG}>
              Export as SVG
            </button>
            <button className="dropdown-item" onClick={handleExportJSON}>
              Export as JSON
            </button>
          </div>
        </div>

        <button
          className="top-bar-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Import JSON"
          aria-label="Import"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJSON}
          style={{ display: 'none' }}
        />
      </div>

      <div className="top-bar-divider"/>

      {/* Clear */}
      <button
        className="top-bar-btn danger"
        onClick={handleClearCanvas}
        title="Clear Canvas"
        aria-label="Clear Canvas"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  );
}
