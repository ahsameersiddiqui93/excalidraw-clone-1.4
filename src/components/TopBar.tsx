/**
 * components/TopBar.tsx
 * -----------------------------------------------------------------------------
 * Top controls bar: menu (import/export/reset), undo/redo, and grid toggle.
 */

import { store, useStoreState } from "../state/useStore";
import { MenuIcon, RedoIcon, UndoIcon } from "./Icons";
import {
  downloadText,
  jsonToScene,
  openTextFile,
  sceneToJSON,
} from "../io/serialize";
import { downloadPNG, downloadSVG } from "../io/exportImage";
import { useState } from "react";

export function TopBar(): JSX.Element {
  const canUndo = useStoreState((s) => s.canUndo);
  const canRedo = useStoreState((s) => s.canRedo);
  const showGrid = useStoreState((s) => s.showGrid);
  const [menuOpen, setMenuOpen] = useState(false);

  const exportJSON = () => {
    const s = store.getState();
    downloadText(
      "whiteboard.json",
      sceneToJSON({ elements: s.elements, viewport: s.viewport }),
    );
    setMenuOpen(false);
  };

  const importJSON = async () => {
    setMenuOpen(false);
    try {
      const text = await openTextFile("application/json");
      const scene = jsonToScene(text);
      store.loadDocument(scene.elements, scene.viewport);
    } catch (err) {
      console.error("Import failed:", err);
      alert("Could not import file: " + (err as Error).message);
    }
  };

  const exportPNG = () => {
    void downloadPNG(store.getState().elements);
    setMenuOpen(false);
  };

  const exportSVG = () => {
    downloadSVG(store.getState().elements);
    setMenuOpen(false);
  };

  const reset = () => {
    if (confirm("Clear the entire canvas? This cannot be undone.")) {
      store.resetScene();
    }
    setMenuOpen(false);
  };

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <div className="menu-wrapper">
          <button
            className="icon-button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MenuIcon size={18} />
          </button>
          {menuOpen && (
            <div className="menu-dropdown" role="menu">
              <button role="menuitem" onClick={importJSON}>
                Open… (JSON)
              </button>
              <button role="menuitem" onClick={exportJSON}>
                Save to… (JSON)
              </button>
              <div className="menu-divider" />
              <button role="menuitem" onClick={exportPNG}>
                Export PNG
              </button>
              <button role="menuitem" onClick={exportSVG}>
                Export SVG
              </button>
              <div className="menu-divider" />
              <button role="menuitem" className="danger" onClick={reset}>
                Reset canvas
              </button>
            </div>
          )}
        </div>
        <span className="app-title">Whiteboard</span>
      </div>

      <div className="top-bar-right">
        <button
          className="icon-button"
          disabled={!canUndo}
          onClick={() => store.undo()}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <UndoIcon size={18} />
        </button>
        <button
          className="icon-button"
          disabled={!canRedo}
          onClick={() => store.redo()}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <RedoIcon size={18} />
        </button>
        <button
          className={`text-button${showGrid ? " active" : ""}`}
          onClick={() => store.toggleGrid()}
          title="Toggle grid"
        >
          Grid
        </button>
      </div>
    </header>
  );
}
