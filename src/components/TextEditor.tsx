/**
 * components/TextEditor.tsx
 * -----------------------------------------------------------------------------
 * In-place text editing overlay. A transparent <textarea> is positioned over
 * the text element (in screen space) so users can edit directly on the canvas.
 * On blur/commit the element's text + measured size are written back to the
 * store and history is committed.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { store, useAppState } from "../state/useStore";
import { isTextElement } from "../core/element";
import { measureText } from "../render/text";
import { FONT_FAMILY_CSS } from "../constants";
import { sceneToScreen } from "../utils/coordinates";
import type { TextElement } from "../types";

interface Props {
  elementId: string;
}

export function TextEditor({ elementId }: Props): JSX.Element | null {
  const state = useAppState();
  const ref = useRef<HTMLTextAreaElement>(null);
  const element = state.elements.find((e) => e.id === elementId);
  const [value, setValue] = useState(
    element && isTextElement(element) ? element.text : "",
  );

  // Focus the textarea when editing begins.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.focus();
    node.setSelectionRange(node.value.length, node.value.length);
  }, [elementId]);

  // Keep the element sized to its content while typing.
  useLayoutEffect(() => {
    if (!element || !isTextElement(element)) return;
    const metrics = measureText(value, element.fontSize, element.fontFamily);
    store.updateElement(elementId, {
      text: value,
      width: Math.max(metrics.width, 1),
      height: Math.max(metrics.height, element.fontSize),
    } as Partial<TextElement>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!element || !isTextElement(element)) return null;

  const vp = state.viewport;
  const screen = sceneToScreen(element.x, element.y, vp);

  const commit = () => {
    const trimmed = value;
    if (trimmed.trim().length === 0) {
      // Empty text → discard the element.
      store.setSelection([elementId]);
      store.deleteSelected();
    } else {
      store.commit();
    }
    store.setEditingText(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Escape commits; Enter inserts a newline (Shift+Enter also newline).
    if (e.key === "Escape") {
      e.preventDefault();
      commit();
    }
    e.stopPropagation();
  };

  return (
    <textarea
      ref={ref}
      className="text-editor"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      spellCheck={false}
      style={{
        left: screen.x,
        top: screen.y,
        fontSize: element.fontSize * vp.zoom,
        lineHeight: 1.25,
        fontFamily: FONT_FAMILY_CSS[element.fontFamily],
        color: element.strokeColor,
        textAlign: element.textAlign,
        transformOrigin: "top left",
      }}
    />
  );
}
