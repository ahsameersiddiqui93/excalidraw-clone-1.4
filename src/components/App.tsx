/**
 * components/App.tsx
 * -----------------------------------------------------------------------------
 * Root application shell. Composes the canvas with the floating UI panels and
 * installs the global keyboard shortcut handler.
 */

import { useEffect } from "react";
import { Canvas } from "./Canvas";
import { Toolbar } from "./Toolbar";
import { TopBar } from "./TopBar";
import { PropertiesPanel } from "./PropertiesPanel";
import { ZoomControls } from "./ZoomControls";
import { handleKeyDown } from "../interaction/keyboard";

export function App(): JSX.Element {
  // Install global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (handleKeyDown(e)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <Canvas />
      <TopBar />
      <Toolbar />
      <PropertiesPanel />
      <ZoomControls />
    </div>
  );
}
