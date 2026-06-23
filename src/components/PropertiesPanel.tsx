/**
 * components/PropertiesPanel.tsx
 * -----------------------------------------------------------------------------
 * The floating style/property editor (left side). Edits the "current style"
 * for new elements and, when a selection exists, applies live to it. Also hosts
 * actions for the selection: layering, duplicate, lock, delete, group.
 */

import { store, useAppState } from "../state/useStore";
import type {
  FillStyle,
  FontFamily,
  Roughness,
  StrokeStyle,
  TextAlign,
} from "../types";
import {
  BACKGROUND_PALETTE,
  STROKE_PALETTE,
} from "../constants";
import { isTextElement } from "../core/element";

export function PropertiesPanel(): JSX.Element | null {
  const state = useAppState();
  const hasSelection = state.selectedIds.size > 0;

  // The displayed style: from the first selected element, else current style.
  const firstSelected = state.elements.find((e) =>
    state.selectedIds.has(e.id),
  );
  const style = firstSelected
    ? {
        strokeColor: firstSelected.strokeColor,
        backgroundColor: firstSelected.backgroundColor,
        fillStyle: firstSelected.fillStyle,
        strokeWidth: firstSelected.strokeWidth,
        strokeStyle: firstSelected.strokeStyle,
        roughness: firstSelected.roughness,
        opacity: firstSelected.opacity,
        fontSize: isTextElement(firstSelected)
          ? firstSelected.fontSize
          : state.currentStyle.fontSize,
        fontFamily: isTextElement(firstSelected)
          ? firstSelected.fontFamily
          : state.currentStyle.fontFamily,
        textAlign: isTextElement(firstSelected)
          ? firstSelected.textAlign
          : state.currentStyle.textAlign,
      }
    : state.currentStyle;

  // Hide the panel entirely when the selection tool is active with no selection
  // AND the active tool can't create styled elements (pan/selection/eraser).
  const creating =
    state.tool !== "selection" &&
    state.tool !== "pan" &&
    state.tool !== "eraser";
  if (!hasSelection && !creating) return null;

  const showText =
    state.tool === "text" ||
    (hasSelection &&
      state.elements.some(
        (e) => state.selectedIds.has(e.id) && isTextElement(e),
      ));

  const apply = (patch: Parameters<typeof store.updateStyleForSelection>[0]) => {
    if (hasSelection) store.updateStyleForSelection(patch);
    else store.setCurrentStyle(patch);
  };

  return (
    <aside className="panel properties-panel" aria-label="Properties">
      {/* Stroke color */}
      <Section title="Stroke">
        <div className="swatch-row">
          {STROKE_PALETTE.map((color) => (
            <button
              key={color}
              className={`swatch${style.strokeColor === color ? " active" : ""}`}
              style={{ background: color }}
              onClick={() => apply({ strokeColor: color })}
              aria-label={`Stroke ${color}`}
            />
          ))}
          <input
            type="color"
            className="swatch color-input"
            value={style.strokeColor}
            onChange={(e) => apply({ strokeColor: e.target.value })}
            aria-label="Custom stroke color"
          />
        </div>
      </Section>

      {/* Background / fill color */}
      <Section title="Background">
        <div className="swatch-row">
          {BACKGROUND_PALETTE.map((color) => (
            <button
              key={color}
              className={`swatch${
                style.backgroundColor === color ? " active" : ""
              }${color === "transparent" ? " transparent" : ""}`}
              style={
                color === "transparent" ? undefined : { background: color }
              }
              onClick={() => apply({ backgroundColor: color })}
              aria-label={`Background ${color}`}
            />
          ))}
          <input
            type="color"
            className="swatch color-input"
            value={
              style.backgroundColor === "transparent"
                ? "#ffffff"
                : style.backgroundColor
            }
            onChange={(e) => apply({ backgroundColor: e.target.value })}
            aria-label="Custom background color"
          />
        </div>
      </Section>

      {/* Fill style */}
      <Section title="Fill">
        <SegmentedControl<FillStyle>
          value={style.fillStyle}
          options={[
            { value: "hachure", label: "Hachure" },
            { value: "cross-hatch", label: "Cross" },
            { value: "solid", label: "Solid" },
          ]}
          onChange={(v) => apply({ fillStyle: v })}
        />
      </Section>

      {/* Stroke width */}
      <Section title="Stroke width">
        <SegmentedControl<number>
          value={style.strokeWidth}
          options={[
            { value: 1, label: "S" },
            { value: 2, label: "M" },
            { value: 4, label: "L" },
          ]}
          onChange={(v) => apply({ strokeWidth: v })}
        />
      </Section>

      {/* Stroke style */}
      <Section title="Stroke style">
        <SegmentedControl<StrokeStyle>
          value={style.strokeStyle}
          options={[
            { value: "solid", label: "—" },
            { value: "dashed", label: "- -" },
            { value: "dotted", label: "···" },
          ]}
          onChange={(v) => apply({ strokeStyle: v })}
        />
      </Section>

      {/* Roughness / sketchiness */}
      <Section title="Sloppiness">
        <SegmentedControl<Roughness>
          value={style.roughness}
          options={[
            { value: 0, label: "Clean" },
            { value: 1, label: "Rough" },
            { value: 2, label: "Wild" },
          ]}
          onChange={(v) => apply({ roughness: v })}
        />
      </Section>

      {/* Opacity */}
      <Section title="Opacity">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={style.opacity}
          onChange={(e) => apply({ opacity: Number(e.target.value) })}
          aria-label="Opacity"
        />
      </Section>

      {showText && (
        <>
          <Section title="Font size">
            <SegmentedControl<number>
              value={style.fontSize}
              options={[
                { value: 16, label: "S" },
                { value: 20, label: "M" },
                { value: 28, label: "L" },
                { value: 36, label: "XL" },
              ]}
              onChange={(v) => apply({ fontSize: v })}
            />
          </Section>
          <Section title="Font family">
            <SegmentedControl<FontFamily>
              value={style.fontFamily}
              options={[
                { value: "hand-drawn", label: "Hand" },
                { value: "normal", label: "Normal" },
                { value: "code", label: "Code" },
              ]}
              onChange={(v) => apply({ fontFamily: v })}
            />
          </Section>
          <Section title="Align">
            <SegmentedControl<TextAlign>
              value={style.textAlign}
              options={[
                { value: "left", label: "L" },
                { value: "center", label: "C" },
                { value: "right", label: "R" },
              ]}
              onChange={(v) => apply({ textAlign: v })}
            />
          </Section>
        </>
      )}

      {hasSelection && (
        <Section title="Actions">
          <div className="action-grid">
            <button onClick={() => store.arrange("backward")} title="Send backward">
              ⬇ Back
            </button>
            <button onClick={() => store.arrange("forward")} title="Bring forward">
              ⬆ Front
            </button>
            <button onClick={() => store.arrange("back")} title="Send to back">
              ⤓ To back
            </button>
            <button onClick={() => store.arrange("front")} title="Bring to front">
              ⤒ To front
            </button>
            <button onClick={() => store.group()} title="Group (Ctrl+G)">
              Group
            </button>
            <button onClick={() => store.ungroup()} title="Ungroup (Ctrl+Shift+G)">
              Ungroup
            </button>
            <button onClick={() => store.duplicateSelected()} title="Duplicate (Ctrl+D)">
              Duplicate
            </button>
            <button onClick={() => store.toggleLockSelected()} title="Lock/Unlock">
              Lock
            </button>
            <button
              className="danger"
              onClick={() => store.deleteSelected()}
              title="Delete (Del)"
            >
              Delete
            </button>
          </div>
        </Section>
      )}
    </aside>
  );
}

/** A titled group within the panel. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="panel-section">
      <div className="panel-section-title">{title}</div>
      {children}
    </div>
  );
}

/** A generic segmented (radio-like) control. */
function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}): JSX.Element {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          className={`segment${opt.value === value ? " active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
