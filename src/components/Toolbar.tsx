/**
 * Left-side vertical toolbar with drawing tool buttons.
 */

import React from 'react';
import { useAppContext } from '../store/AppContext';
import { ToolType } from '../types';

interface ToolConfig {
  tool: ToolType;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

const TOOLS: ToolConfig[] = [
  {
    tool: 'selection',
    label: 'Selection',
    shortcut: 'V',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3l14 9-7 1-4 7z"/>
      </svg>
    ),
  },
  {
    tool: 'hand',
    label: 'Hand (Pan)',
    shortcut: 'H',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
      </svg>
    ),
  },
  { tool: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </svg>
  )},
  { tool: 'ellipse', label: 'Ellipse', shortcut: 'E', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="12" rx="10" ry="7"/>
    </svg>
  )},
  { tool: 'diamond', label: 'Diamond', shortcut: 'D', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 22,12 12,22 2,12"/>
    </svg>
  )},
  { tool: 'line', label: 'Line', shortcut: 'L', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="5" y1="19" x2="19" y2="5"/>
    </svg>
  )},
  { tool: 'arrow', label: 'Arrow', shortcut: 'A', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="19" y2="5"/>
      <polyline points="9,5 19,5 19,15"/>
    </svg>
  )},
  { tool: 'pencil', label: 'Pencil', shortcut: 'P', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  )},
  { tool: 'text', label: 'Text', shortcut: 'T', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,7 4,4 20,4 20,7"/>
      <line x1="9" y1="20" x2="15" y2="20"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  )},
];

export function Toolbar() {
  const { state, dispatch } = useAppContext();

  return (
    <div className="toolbar">
      {TOOLS.map(({ tool, label, shortcut, icon }) => (
        <button
          key={tool}
          className={`tool-btn ${state.selectedTool === tool ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_TOOL', tool })}
          title={`${label} (${shortcut})`}
          aria-label={label}
          aria-pressed={state.selectedTool === tool}
        >
          <span className="tool-icon">{icon}</span>
          <span className="tool-shortcut">{shortcut}</span>
        </button>
      ))}
    </div>
  );
}
