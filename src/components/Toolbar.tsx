/**
 * components/Toolbar.tsx
 * -----------------------------------------------------------------------------
 * The left (here: top-center, floating) tool palette. Selecting a tool updates
 * the store. Each tool shows its keyboard shortcut as a tooltip + badge.
 */

import { store, useStoreState } from "../state/useStore";
import type { ToolType } from "../types";
import {
  ArrowIcon,
  DiamondIcon,
  DrawIcon,
  EllipseIcon,
  EraserIcon,
  HandIcon,
  LineIcon,
  RectangleIcon,
  SelectionIcon,
  TextIcon,
} from "./Icons";

interface ToolDef {
  tool: ToolType;
  label: string;
  shortcut: string;
  Icon: (props: { size?: number }) => JSX.Element;
}

const TOOLS: ToolDef[] = [
  { tool: "selection", label: "Selection", shortcut: "V", Icon: SelectionIcon },
  { tool: "rectangle", label: "Rectangle", shortcut: "R", Icon: RectangleIcon },
  { tool: "diamond", label: "Diamond", shortcut: "D", Icon: DiamondIcon },
  { tool: "ellipse", label: "Ellipse", shortcut: "O", Icon: EllipseIcon },
  { tool: "arrow", label: "Arrow", shortcut: "A", Icon: ArrowIcon },
  { tool: "line", label: "Line", shortcut: "L", Icon: LineIcon },
  { tool: "draw", label: "Draw", shortcut: "P", Icon: DrawIcon },
  { tool: "text", label: "Text", shortcut: "T", Icon: TextIcon },
  { tool: "eraser", label: "Eraser", shortcut: "E", Icon: EraserIcon },
  { tool: "pan", label: "Pan", shortcut: "H", Icon: HandIcon },
];

export function Toolbar(): JSX.Element {
  const activeTool = useStoreState((s) => s.tool);

  return (
    <div className="toolbar" role="toolbar" aria-label="Tools">
      {TOOLS.map(({ tool, label, shortcut, Icon }) => (
        <button
          key={tool}
          className={`tool-button${activeTool === tool ? " active" : ""}`}
          title={`${label} — ${shortcut}`}
          aria-label={label}
          aria-pressed={activeTool === tool}
          onClick={() => store.setTool(tool)}
        >
          <Icon size={18} />
          <span className="tool-shortcut">{shortcut}</span>
        </button>
      ))}
    </div>
  );
}
