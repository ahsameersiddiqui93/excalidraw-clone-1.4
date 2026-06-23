/**
 * components/Canvas.tsx
 * -----------------------------------------------------------------------------
 * The infinite canvas surface. Responsibilities:
 *  - Maintain a HiDPI-correct <canvas> sized to its container.
 *  - Drive a requestAnimationFrame render loop that calls renderScene whenever
 *    the relevant state changes.
 *  - Translate DOM pointer/wheel events into the interaction layer.
 *  - Host the in-place text editor overlay.
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { store, useAppState } from "../state/useStore";
import {
  createRoughCanvas,
  renderScene,
  type RenderContext,
} from "../render/renderer";
import {
  onDoubleClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  type PointerInfo,
} from "../interaction/pointer";
import { handleWheel } from "../interaction/viewport";
import { getCommonBounds } from "../core/bounds";
import { TextEditor } from "./TextEditor";
import { cursorForState } from "../interaction/cursor";

export function Canvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rctxRef = useRef<RenderContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const spaceRef = useRef(false);

  const state = useAppState();

  /** (Re)create the canvas backing store at the correct device pixel ratio. */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    rctxRef.current = {
      ctx,
      rc: createRoughCanvas(canvas),
      width: canvas.width,
      height: canvas.height,
      devicePixelRatio: dpr,
    };
    scheduleRender();
  }, []);

  /** Render exactly once on the next animation frame (coalesces calls). */
  const scheduleRender = useCallback(() => {
    if (frameRef.current != null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const rctx = rctxRef.current;
      if (!rctx) return;
      const s = store.getState();
      const selected = s.elements.filter((e) => s.selectedIds.has(e.id));
      renderScene(rctx, s.elements, s.viewport, {
        selectedIds: s.selectedIds,
        selectionBounds:
          s.editingTextId || selected.length === 0
            ? null
            : getCommonBounds(selected),
        marquee: s.marquee,
        showGrid: s.showGrid,
      });
    });
  }, []);

  // Initial sizing + window resize handling.
  useLayoutEffect(() => {
    resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [resize]);

  // Re-render whenever store state changes.
  useEffect(() => {
    return store.subscribe(scheduleRender);
  }, [scheduleRender]);

  // Track the Space key for temporary panning.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Non-passive wheel listener so we can preventDefault to stop page zoom.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      handleWheel(
        e.deltaX,
        e.deltaY,
        e.ctrlKey || e.metaKey,
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const toInfo = (e: React.PointerEvent): PointerInfo => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      screenX: e.clientX - rect.left,
      screenY: e.clientY - rect.top,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      button: e.button,
      spaceKey: spaceRef.current,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Commit any pending text edit when starting a new gesture elsewhere.
    if (store.getState().editingTextId) store.setEditingText(null);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    onPointerDown(toInfo(e));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    onPointerMove(toInfo(e));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    onPointerUp();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    onDoubleClick({
      screenX: e.clientX - rect.left,
      screenY: e.clientY - rect.top,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      button: 0,
      spaceKey: false,
    });
  };

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ cursor: cursorForState(state.tool, spaceRef.current) }}
    >
      <canvas
        ref={canvasRef}
        className="canvas-surface"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />
      {state.editingTextId && <TextEditor elementId={state.editingTextId} />}
    </div>
  );
}
