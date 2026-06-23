/**
 * Style panel - shown when elements are selected or as the current style picker.
 * Controls stroke color, fill color, stroke width, opacity, roughness, font, etc.
 */

import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { ElementStyle, StrokeStyle, FillStyle, RoughnessLevel, FontFamily, TextAlign } from '../types';

const STROKE_COLORS = [
  '#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00',
  '#ae3ec9', '#0c8599', '#e64980', '#ffffff',
];

const FILL_COLORS = [
  'transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99',
  '#e8d5fb', '#99e9f2', '#fcc2d7', '#f1f3f5',
];

const STROKE_WIDTHS = [1, 2, 4, 6];

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onClick: () => void;
  title?: string;
}

function ColorSwatch({ color, selected, onClick, title }: ColorSwatchProps) {
  return (
    <button
      className={`color-swatch ${selected ? 'selected' : ''}`}
      style={{
        backgroundColor: color === 'transparent' ? 'transparent' : color,
        border: color === 'transparent' ? '2px dashed #ccc' : selected ? '2px solid #4a90e2' : '2px solid transparent',
      }}
      onClick={onClick}
      title={title || color}
      aria-label={title || color}
    />
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="style-section">
      <div className="style-section-title">{title}</div>
      {children}
    </div>
  );
}

export function StylePanel() {
  const { state, dispatch, getSelectedElements } = useAppContext();
  const selectedElements = getSelectedElements();
  const style = state.currentStyle;

  const updateStyle = (updates: Partial<ElementStyle>) => {
    dispatch({ type: 'SET_STYLE', style: updates });
    // Also update selected elements
    if (selectedElements.length > 0) {
      const elementUpdates = selectedElements.map(el => ({
        id: el.id,
        updates: { style: { ...el.style, ...updates } },
      }));
      dispatch({ type: 'UPDATE_ELEMENTS', updates: elementUpdates });
    }
  };

  const showTextOptions = selectedElements.some(el => el.type === 'text') ||
    state.selectedTool === 'text';

  return (
    <div className="style-panel">
      {/* Stroke Color */}
      <Section title="Stroke">
        <div className="color-grid">
          {STROKE_COLORS.map(color => (
            <ColorSwatch
              key={color}
              color={color}
              selected={style.strokeColor === color}
              onClick={() => updateStyle({ strokeColor: color })}
            />
          ))}
        </div>
        <div className="custom-color-row">
          <label className="custom-color-label">Custom</label>
          <input
            type="color"
            value={style.strokeColor === 'transparent' ? '#000000' : style.strokeColor}
            onChange={e => updateStyle({ strokeColor: e.target.value })}
            className="color-input"
          />
        </div>
      </Section>

      {/* Fill Color */}
      <Section title="Fill">
        <div className="color-grid">
          {FILL_COLORS.map(color => (
            <ColorSwatch
              key={color}
              color={color}
              selected={style.fillColor === color}
              onClick={() => updateStyle({ fillColor: color, fillStyle: color === 'transparent' ? 'none' : 'solid' })}
              title={color === 'transparent' ? 'None' : color}
            />
          ))}
        </div>
        <div className="custom-color-row">
          <label className="custom-color-label">Custom</label>
          <input
            type="color"
            value={style.fillColor === 'transparent' ? '#ffffff' : style.fillColor}
            onChange={e => updateStyle({ fillColor: e.target.value, fillStyle: 'solid' })}
            className="color-input"
          />
        </div>
      </Section>

      {/* Fill Style */}
      {style.fillColor !== 'transparent' && (
        <Section title="Fill Style">
          <div className="btn-group">
            {(['solid', 'hatch', 'cross-hatch'] as FillStyle[]).map(fs => (
              <button
                key={fs}
                className={`style-btn ${style.fillStyle === fs ? 'active' : ''}`}
                onClick={() => updateStyle({ fillStyle: fs })}
                title={fs}
              >
                {fs === 'solid' ? '■' : fs === 'hatch' ? '▤' : '▦'}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Stroke Width */}
      <Section title="Stroke Width">
        <div className="btn-group">
          {STROKE_WIDTHS.map(w => (
            <button
              key={w}
              className={`style-btn stroke-width-btn ${style.strokeWidth === w ? 'active' : ''}`}
              onClick={() => updateStyle({ strokeWidth: w })}
              title={`${w}px`}
            >
              <svg viewBox="0 0 24 4" width="24" height={w * 2 + 2}>
                <line x1="2" y1={w} x2="22" y2={w} stroke="currentColor" strokeWidth={w} strokeLinecap="round"/>
              </svg>
            </button>
          ))}
        </div>
      </Section>

      {/* Stroke Style */}
      <Section title="Stroke Style">
        <div className="btn-group">
          {(['solid', 'dashed', 'dotted'] as StrokeStyle[]).map(ss => (
            <button
              key={ss}
              className={`style-btn ${style.strokeStyle === ss ? 'active' : ''}`}
              onClick={() => updateStyle({ strokeStyle: ss })}
              title={ss}
            >
              <svg viewBox="0 0 24 4" width="24" height="4">
                <line
                  x1="2" y1="2" x2="22" y2="2"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={ss === 'dashed' ? '6,3' : ss === 'dotted' ? '2,3' : undefined}
                />
              </svg>
            </button>
          ))}
        </div>
      </Section>

      {/* Roughness */}
      <Section title="Roughness">
        <div className="btn-group">
          {([0, 1, 2] as RoughnessLevel[]).map(r => (
            <button
              key={r}
              className={`style-btn ${style.roughness === r ? 'active' : ''}`}
              onClick={() => updateStyle({ roughness: r })}
              title={r === 0 ? 'Smooth' : r === 1 ? 'Normal' : 'Rough'}
            >
              {r === 0 ? '—' : r === 1 ? '∿' : '≈'}
            </button>
          ))}
        </div>
      </Section>

      {/* Opacity */}
      <Section title={`Opacity: ${style.opacity}%`}>
        <input
          type="range"
          min="10"
          max="100"
          step="10"
          value={style.opacity}
          onChange={e => updateStyle({ opacity: parseInt(e.target.value) })}
          className="opacity-slider"
        />
      </Section>

      {/* Text Options */}
      {showTextOptions && (
        <>
          <Section title="Font Family">
            <div className="btn-group">
              {(['hand', 'normal', 'code'] as FontFamily[]).map(ff => (
                <button
                  key={ff}
                  className={`style-btn font-btn ${style.fontFamily === ff ? 'active' : ''}`}
                  onClick={() => updateStyle({ fontFamily: ff })}
                  title={ff}
                  style={{
                    fontFamily: ff === 'hand' ? 'Caveat, cursive' : ff === 'code' ? 'monospace' : 'sans-serif',
                  }}
                >
                  Aa
                </button>
              ))}
            </div>
          </Section>

          <Section title="Font Size">
            <div className="btn-group">
              {[12, 16, 20, 28, 36].map(size => (
                <button
                  key={size}
                  className={`style-btn ${style.fontSize === size ? 'active' : ''}`}
                  onClick={() => updateStyle({ fontSize: size })}
                  title={`${size}px`}
                >
                  {size}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Text Align">
            <div className="btn-group">
              {(['left', 'center', 'right'] as TextAlign[]).map(ta => (
                <button
                  key={ta}
                  className={`style-btn ${style.textAlign === ta ? 'active' : ''}`}
                  onClick={() => updateStyle({ textAlign: ta })}
                  title={ta}
                >
                  {ta === 'left' ? '≡' : ta === 'center' ? '≡' : '≡'}
                  <span style={{ fontSize: '10px', display: 'block' }}>{ta[0].toUpperCase()}</span>
                </button>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
