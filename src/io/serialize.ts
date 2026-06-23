/**
 * io/serialize.ts
 * -----------------------------------------------------------------------------
 * JSON serialization (export) and deserialization (import) of the whiteboard
 * document, plus browser download/upload helpers.
 */

import type {
  SceneData,
  Viewport,
  WhiteboardElement,
  WhiteboardFile,
} from "../types";
import { FILE_SOURCE, FILE_VERSION } from "../constants";
import { normalizeScene } from "../state/persistence";

/** Wrap a scene into the versioned file envelope. */
export function serializeScene(scene: SceneData): WhiteboardFile {
  return {
    type: "whiteboard",
    version: FILE_VERSION,
    source: FILE_SOURCE,
    elements: scene.elements,
    appState: { viewport: scene.viewport },
  };
}

/** Serialize a scene to a pretty-printed JSON string. */
export function sceneToJSON(scene: SceneData): string {
  return JSON.stringify(serializeScene(scene), null, 2);
}

/**
 * Parse a JSON string into a SceneData. Accepts both the file envelope format
 * and a raw {elements, viewport} object. Throws on unrecoverable input.
 */
export function jsonToScene(json: string): SceneData {
  const parsed = JSON.parse(json) as unknown;

  // File envelope form.
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>).type === "whiteboard"
  ) {
    const file = parsed as Partial<WhiteboardFile>;
    const elements = Array.isArray(file.elements)
      ? (file.elements as WhiteboardElement[])
      : [];
    const viewport: Viewport =
      file.appState?.viewport ?? { scrollX: 0, scrollY: 0, zoom: 1 };
    const normalized = normalizeScene({ elements, viewport });
    if (!normalized) throw new Error("Invalid whiteboard file");
    return normalized;
  }

  // Raw scene form.
  const normalized = normalizeScene(parsed);
  if (!normalized) throw new Error("Unrecognized whiteboard JSON");
  return normalized;
}

/** Trigger a browser download of arbitrary text content. */
export function downloadText(
  filename: string,
  text: string,
  mime = "application/json",
): void {
  const blob = new Blob([text], { type: mime });
  downloadBlob(filename, blob);
}

/** Trigger a browser download of a Blob. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Open a file picker and resolve with the chosen file's text content. */
export function openTextFile(accept = "application/json"): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}
