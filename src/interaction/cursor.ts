/**
 * interaction/cursor.ts
 * -----------------------------------------------------------------------------
 * Maps the active tool (and modifier state) to a CSS cursor string.
 */

import type { ToolType } from "../types";

/** CSS cursor for the canvas given the active tool and whether Space is held. */
export function cursorForState(tool: ToolType, spaceHeld: boolean): string {
  if (spaceHeld || tool === "pan") return "grab";
  switch (tool) {
    case "selection":
      return "default";
    case "text":
      return "text";
    case "eraser":
      return "cell";
    case "draw":
      return "crosshair";
    default:
      return "crosshair";
  }
}
