/**
 * Root application component.
 * Assembles all UI panels and the canvas into the whiteboard layout.
 */

import React from 'react';
import { AppProvider } from '../store/AppContext';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { TopBar } from './TopBar';
import { StylePanel } from './StylePanel';
import { ZoomControls } from './ZoomControls';
import { useKeyboard } from '../hooks/useKeyboard';

function WhiteboardApp() {
  // Register keyboard shortcuts
  useKeyboard();

  return (
    <div className="app">
      {/* Top bar */}
      <TopBar />

      {/* Main content area */}
      <div className="app-body">
        {/* Left toolbar */}
        <Toolbar />

        {/* Canvas */}
        <Canvas />

        {/* Right style panel */}
        <StylePanel />
      </div>

      {/* Floating zoom controls */}
      <ZoomControls />
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <WhiteboardApp />
    </AppProvider>
  );
}
