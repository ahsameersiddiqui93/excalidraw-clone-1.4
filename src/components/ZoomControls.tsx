/**
 * Floating zoom controls in the bottom-right corner.
 */

import React from 'react';
import { useAppContext } from '../store/AppContext';
import { ZOOM_LEVELS, MIN_ZOOM, MAX_ZOOM } from '../types';

export function ZoomControls() {
  const { state, dispatch } = useAppContext();
  const zoom = state.viewTransform.zoom;
  const zoomPercent = Math.round(zoom * 100);

  const zoomIn = () => {
    const next = ZOOM_LEVELS.find(z => z > zoom) ?? MAX_ZOOM;
    dispatch({ type: 'SET_ZOOM', zoom: next });
  };

  const zoomOut = () => {
    const prev = [...ZOOM_LEVELS].reverse().find(z => z < zoom) ?? MIN_ZOOM;
    dispatch({ type: 'SET_ZOOM', zoom: prev });
  };

  const resetZoom = () => {
    dispatch({ type: 'SET_VIEW_TRANSFORM', transform: { zoom: 1, offsetX: 0, offsetY: 0 } });
  };

  const fitToScreen = () => {
    // This would need canvas dimensions - simplified version
    dispatch({ type: 'SET_VIEW_TRANSFORM', transform: { zoom: 1, offsetX: 0, offsetY: 0 } });
  };

  return (
    <div className="zoom-controls">
      <button
        className="zoom-btn"
        onClick={zoomOut}
        disabled={zoom <= MIN_ZOOM}
        title="Zoom Out (Ctrl+-)"
        aria-label="Zoom Out"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </button>

      <button
        className="zoom-level-btn"
        onClick={resetZoom}
        title="Reset Zoom (Ctrl+0)"
        aria-label={`Zoom: ${zoomPercent}%`}
      >
        {zoomPercent}%
      </button>

      <button
        className="zoom-btn"
        onClick={zoomIn}
        disabled={zoom >= MAX_ZOOM}
        title="Zoom In (Ctrl+=)"
        aria-label="Zoom In"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </button>
    </div>
  );
}
