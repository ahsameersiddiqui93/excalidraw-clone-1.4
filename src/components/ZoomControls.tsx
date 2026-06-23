/**
 * components/ZoomControls.tsx
 * -----------------------------------------------------------------------------
 * Floating bottom-left zoom controls: zoom out, current percentage (click to
 * reset to 100%), and zoom in. Zoom is centered on the viewport middle.
 */

import { useStoreState } from "../state/useStore";
import { MinusIcon, PlusIcon } from "./Icons";
import { resetZoomTo100, stepZoom, zoomToFit } from "../interaction/viewport";

export function ZoomControls(): JSX.Element {
  const zoom = useStoreState((s) => s.viewport.zoom);

  // Center the zoom operation on the current window center.
  const center = (): [number, number] => [
    window.innerWidth / 2,
    window.innerHeight / 2,
  ];

  return (
    <div className="zoom-controls" role="group" aria-label="Zoom">
      <button
        className="icon-button"
        onClick={() => stepZoom(-1, ...center())}
        title="Zoom out (Ctrl+-)"
        aria-label="Zoom out"
      >
        <MinusIcon size={16} />
      </button>
      <button
        className="zoom-label"
        onClick={() => resetZoomTo100(...center())}
        title="Reset zoom to 100% (Ctrl+0)"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        className="icon-button"
        onClick={() => stepZoom(1, ...center())}
        title="Zoom in (Ctrl+=)"
        aria-label="Zoom in"
      >
        <PlusIcon size={16} />
      </button>
      <button
        className="text-button"
        onClick={() => zoomToFit(window.innerWidth, window.innerHeight)}
        title="Zoom to fit"
      >
        Fit
      </button>
    </div>
  );
}
