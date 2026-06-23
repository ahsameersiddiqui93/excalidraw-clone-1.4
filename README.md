# Infinite Whiteboard

A production-quality, infinite-canvas whiteboard application built with **React + TypeScript + Vite**. It provides a hand-drawn ("sketchy") drawing experience with shapes, freehand, text, multi-select transforms, grouping, undo/redo, import/export, and a fast canvas renderer — in a clean-room, original implementation.

> This is an original implementation. It does not use, copy, or derive from any third-party whiteboard's source code or architecture.

---

## Table of Contents

1. [Features](#features)
2. [Quick Start](#quick-start)
3. [Scripts](#scripts)
4. [System Architecture](#system-architecture)
5. [Folder Structure](#folder-structure)
6. [Data Models](#data-models)
7. [Rendering Strategy](#rendering-strategy)
8. [State Management Design](#state-management-design)
9. [Interaction Layer](#interaction-layer)
10. [Import / Export](#import--export)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Testing Strategy](#testing-strategy)
13. [Feature Parity Checklist](#feature-parity-checklist)
14. [Known Limitations](#known-limitations)

---

## Features

- **Infinite canvas** with smooth pan & zoom (mouse wheel, trackpad pinch, Space-drag).
- **Drawing tools:** selection, rectangle, ellipse, diamond, line, arrow, freehand pencil, text.
- **Element operations:** create, move, resize (8 handles), rotate, multi-select, group/ungroup, copy/paste, duplicate, delete, lock/unlock, layer ordering.
- **Styling:** stroke color, fill color, fill style (hachure/cross-hatch/solid), stroke width, stroke style (solid/dashed/dotted), opacity, sketch roughness, font family/size, text alignment.
- **History:** efficient undo/redo with snapshot-based tracking.
- **Import/Export:** PNG, SVG, JSON export; JSON import that restores both elements and viewport.
- **Autosave** to `localStorage` so your work persists between reloads.
- **Minimalist UI:** floating top bar, top-center tool palette, left properties panel, bottom-left zoom controls.

---

## Quick Start

Requirements: **Node.js 18+** and **npm**.

```bash
cd whiteboard
npm install      # install dependencies
npm run dev      # start the Vite dev server (http://localhost:5173)
```

To create a production build and preview it:

```bash
npm run build    # type-check + bundle into dist/
npm run preview  # serve the production build locally
```

---

## Scripts

| Script             | Description                                        |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Start the development server with HMR.             |
| `npm run build`    | Type-check (`tsc`) and build for production.       |
| `npm run preview`  | Preview the production build.                      |
| `npm test`         | Run the unit test suite (Vitest).                  |
| `npm run test:watch` | Run tests in watch mode.                         |
| `npm run lint`     | Lint the codebase with ESLint.                     |

---

## System Architecture

The application is organized into clearly separated layers, each with a single responsibility. Data flows in one direction: **interaction → store → render**.

```
┌──────────────────────────────────────────────────────────────┐
│                         UI (React)                             │
│  TopBar · Toolbar · PropertiesPanel · ZoomControls · Canvas    │
└───────────────┬───────────────────────────────┬───────────────┘
                │ dispatch actions               │ subscribe (selectors)
                ▼                                 ▼
┌──────────────────────────────────────────────────────────────┐
│                  State (centralized store)                     │
│   store.ts  ·  history.ts  ·  persistence.ts  ·  useStore.ts   │
└───────────────┬───────────────────────────────┬───────────────┘
                │ reads element data             │ notifies on change
                ▼                                 ▼
┌────────────────────────────┐      ┌────────────────────────────┐
│        Core (pure)         │      │        Render (canvas)      │
│ element · bounds · hitTest │      │ renderer · shapeCache · text│
│ transform · scene          │      └────────────────────────────┘
└────────────────────────────┘
                ▲
                │ pure geometry
┌────────────────────────────┐
│         Utils (pure)       │
│  math · coordinates · id   │
└────────────────────────────┘

Interaction layer (pointer · keyboard · viewport · cursor) translates DOM
events into store actions and core operations.

IO layer (serialize · exportImage) handles JSON/PNG/SVG.
```

**Key principles**

- **Pure core/utils:** geometry, hit-testing, bounds, and transforms are side-effect-free and individually unit-tested.
- **Single source of truth:** the store owns all element and viewport state.
- **Render decoupled from React:** the canvas renders imperatively via a `requestAnimationFrame` loop driven by store subscriptions, so heavy drawing never triggers React re-renders.
- **Minimal React re-renders:** UI components subscribe to narrow slices of state via selector hooks.

---

## Folder Structure

```
whiteboard/
├── index.html                 # Vite HTML entry
├── package.json
├── tsconfig.json / tsconfig.node.json
├── vite.config.ts             # Vite + Vitest config
├── .eslintrc.cjs
└── src/
    ├── main.tsx               # React mount point
    ├── styles.css             # Global + component styles (design tokens)
    ├── types.ts               # All shared types / data models
    ├── constants.ts           # Defaults, palettes, limits
    │
    ├── utils/                 # Pure helpers (no DOM)
    │   ├── math.ts            # clamp, lerp, distance, rotation, segments
    │   ├── coordinates.ts     # screen<->scene, zoomAtPoint
    │   └── id.ts              # id + seed generation
    │
    ├── core/                  # Pure domain logic
    │   ├── element.ts         # element factory + immutable mutation
    │   ├── bounds.ts          # bounding boxes, AABB, common bounds
    │   ├── hitTest.ts         # point/marquee hit-testing, handles
    │   ├── transform.ts       # resize/rotate math
    │   └── scene.ts           # scene-level queries (z-order, groups)
    │
    ├── render/                # Canvas rendering
    │   ├── renderer.ts        # scene render loop, selection UI, grid
    │   ├── shapeCache.ts      # cached rough.js drawables per element
    │   └── text.ts            # text measurement + drawing
    │
    ├── state/                 # Centralized state management
    │   ├── store.ts           # the store: actions + reducers
    │   ├── history.ts         # undo/redo stack
    │   ├── persistence.ts     # localStorage autosave + scene validation
    │   └── useStore.ts        # React selector hooks
    │
    ├── interaction/           # DOM event → action translation
    │   ├── pointer.ts         # pointer gesture state machine
    │   ├── keyboard.ts        # global keyboard shortcuts
    │   ├── viewport.ts        # wheel/zoom/pan + zoom-to-fit
    │   └── cursor.ts          # tool → CSS cursor mapping
    │
    ├── io/                    # Import / export
    │   ├── serialize.ts       # JSON (de)serialization + file dialogs
    │   └── exportImage.ts     # PNG / SVG export
    │
    └── components/            # React UI
        ├── App.tsx            # shell + global key handler
        ├── Canvas.tsx         # canvas surface + RAF render loop
        ├── TextEditor.tsx     # in-place text editing overlay
        ├── Toolbar.tsx        # tool palette
        ├── TopBar.tsx         # menu, undo/redo, grid
        ├── PropertiesPanel.tsx# style + action editor
        ├── ZoomControls.tsx   # zoom in/out/reset/fit
        └── Icons.tsx          # inline SVG icon set
```

---

## Data Models

All models live in [`src/types.ts`](src/types.ts). The cornerstone is the `WhiteboardElement` discriminated union:

```ts
type WhiteboardElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | LinearElement   // line | arrow, has points[]
  | DrawElement     // freehand, has points[] + pressures[]
  | TextElement;    // text, fontSize, fontFamily, textAlign
```

Every element extends `BaseElement`, which holds geometry (`x, y, width, height, angle`), styling (`strokeColor`, `backgroundColor`, `fillStyle`, `strokeWidth`, `strokeStyle`, `roughness`, `opacity`), and bookkeeping (`seed`, `version`, `groupIds`, `locked`, `isDeleted`).

- **`seed`** makes the rough/sketch rendering deterministic and stable across renders.
- **`version`** is bumped on every mutation; the render cache keys off it to know when to regenerate a drawable.
- **`groupIds`** is an ordered list (outermost group last) enabling nested grouping.

The serializable document is `SceneData { elements, viewport }`, wrapped on export in a versioned `WhiteboardFile` envelope.

---

## Rendering Strategy

Rendering is performed imperatively on a single `<canvas>` element, **outside** the React render cycle:

1. **HiDPI sizing** — the canvas backing store is sized to `cssSize × devicePixelRatio` for crisp output; a `ResizeObserver` keeps it in sync.
2. **RAF coalescing** — `Canvas.tsx` subscribes to the store. On any change it schedules a single `requestAnimationFrame` that calls `renderScene`, so bursts of updates collapse into one paint.
3. **Viewport transform** — the renderer applies `translate(scroll) → scale(zoom)` once, then draws all elements in scene coordinates.
4. **Shape cache** — `shapeCache.ts` memoizes each element's generated rough.js drawable keyed by `id + version`, avoiding expensive path regeneration when only the camera moves.
5. **Selection & overlays** — selection outlines, transform handles, the marquee, and the optional grid are drawn in screen space on top of the scene.

This separation keeps interaction at 60fps even with large drawings, because panning/zooming never re-runs React and reuses cached drawables.

---

## State Management Design

A small, dependency-free **observable store** (`src/state/store.ts`) is the single source of truth. It exposes:

- **State:** `elements`, `selectedIds`, `viewport`, `tool`, `currentStyle`, `editingTextId`, `marquee`, `showGrid`, `canUndo`, `canRedo`.
- **Actions:** element CRUD, selection, transforms, grouping, layer ordering, duplication, lock, tool/style changes, viewport updates, undo/redo, load/reset.
- **Subscriptions:** components subscribe through selector hooks in `useStore.ts` (`useStoreState(selector)` / `useAppState()`), backed by React's `useSyncExternalStore` for tear-free reads and minimal re-renders.

**History** (`history.ts`) keeps immutable element-array snapshots with a capped stack (`HISTORY_LIMIT`). A commit is recorded only when elements actually change. The viewport is deliberately excluded from history (panning/zooming is not undoable). **Persistence** (`persistence.ts`) autosaves the scene to `localStorage` and validates/normalizes any scene loaded from disk or storage.

---

## Interaction Layer

`interaction/pointer.ts` implements a small **gesture state machine** (`idle → creating | drawing | dragging | resizing | rotating | selecting | panning`) so each pointer gesture is unambiguous. `viewport.ts` handles wheel events: `Ctrl/⌘ + wheel` (and trackpad pinch) zoom toward the cursor via `zoomAtPoint`, while plain wheel/two-finger gestures pan. `keyboard.ts` installs global shortcuts, and `cursor.ts` maps the active tool to a CSS cursor.

---

## Import / Export

- **JSON export** (`serialize.ts`) writes a versioned `WhiteboardFile` (pretty-printed). **JSON import** accepts both the envelope and a raw `{elements, viewport}` object, validates it, and restores the camera.
- **PNG export** (`exportImage.ts`) renders the current elements to an off-screen canvas tightly cropped to their bounds (with padding) and downloads a raster image.
- **SVG export** produces a vector document of the scene for lossless scaling and editing in vector tools.

---

## Keyboard Shortcuts

| Action            | Shortcut                          |
| ----------------- | --------------------------------- |
| Select tool       | `V` / `1`                         |
| Rectangle         | `R` / `2`                         |
| Diamond           | `D` / `3`                         |
| Ellipse           | `O` / `4`                         |
| Arrow             | `A` / `5`                         |
| Line              | `L` / `6`                         |
| Draw (pencil)     | `P` / `7`                         |
| Text              | `T` / `8`                         |
| Eraser            | `E`                               |
| Pan (hand)        | `H` or hold `Space`               |
| Undo              | `Ctrl/⌘ + Z`                      |
| Redo              | `Ctrl/⌘ + Shift + Z` / `Ctrl + Y` |
| Copy / Paste      | `Ctrl/⌘ + C` / `Ctrl/⌘ + V`       |
| Duplicate         | `Ctrl/⌘ + D`                      |
| Delete            | `Delete` / `Backspace`            |
| Select all        | `Ctrl/⌘ + A`                      |
| Group / Ungroup   | `Ctrl/⌘ + G` / `Ctrl/⌘ + Shift + G` |
| Zoom in / out     | `Ctrl/⌘ + =` / `Ctrl/⌘ + -`       |
| Reset zoom (100%) | `Ctrl/⌘ + 0`                      |

---

## Testing Strategy

Unit tests run under **Vitest** (jsdom environment) and focus on the pure, high-value layers where correctness is critical:

- **`utils/math`** — clamping, interpolation, distances, rotation, point-to-segment distance, angle normalization.
- **`utils/coordinates`** — screen↔scene round-tripping and zoom-at-point anchoring.
- **`core/element`** — factory defaults, immutable mutation (version bump), duplication.
- **`state/history`** — undo/redo stack semantics and redo invalidation.
- **`io/serialize`** — JSON export/import round-trips and error handling.

Run them with:

```bash
npm test          # single run
npm run test:watch
```

The recommended testing pyramid going forward: keep the pure core/utils exhaustively unit-tested, add integration tests around the store's action reducers, and reserve a few end-to-end tests (e.g., Playwright) for canvas gestures.

---

## Feature Parity Checklist

| Category    | Feature                              | Status |
| ----------- | ------------------------------------ | :----: |
| Canvas      | Infinite canvas                      |   ✅   |
| Canvas      | Smooth pan & zoom                    |   ✅   |
| Canvas      | Mouse wheel zoom                     |   ✅   |
| Canvas      | Trackpad pinch / pan                 |   ✅   |
| Canvas      | High-performance rendering (RAF+cache)|  ✅   |
| Canvas      | Touch support                        |   ⚠️ Basic (pointer events) |
| Tools       | Selection                            |   ✅   |
| Tools       | Rectangle / Ellipse / Diamond        |   ✅   |
| Tools       | Line / Arrow                         |   ✅   |
| Tools       | Pencil / freehand                    |   ✅   |
| Tools       | Text                                 |   ✅   |
| Elements    | Create / move / resize / rotate      |   ✅   |
| Elements    | Multi-select                         |   ✅   |
| Elements    | Group / ungroup                      |   ✅   |
| Elements    | Copy / paste / duplicate / delete    |   ✅   |
| Elements    | Lock / unlock                        |   ✅   |
| Elements    | Layer ordering                       |   ✅   |
| Styling     | Stroke / fill color                  |   ✅   |
| Styling     | Stroke width / style                 |   ✅   |
| Styling     | Opacity                              |   ✅   |
| Styling     | Rough / sketch appearance            |   ✅   |
| Styling     | Font family / size / alignment       |   ✅   |
| History     | Undo / redo                          |   ✅   |
| Export      | PNG / SVG / JSON                     |   ✅   |
| Import      | JSON (restores viewport)             |   ✅   |
| Shortcuts   | Full keyboard map                    |   ✅   |
| UI          | Toolbar / top bar / panel / zoom     |   ✅   |
| Persistence | localStorage autosave                |   ✅   |

---

## Known Limitations

- **Touch gestures** use the Pointer Events API and work for single-finger drawing/panning, but multi-touch pinch-to-zoom is not specially tuned for every mobile browser.
- **Text** supports a single style per element (no rich text / per-character formatting) and does not yet bind to containers (text-in-shape).
- **Arrows** are not bound to shapes; moving a shape does not reroute connected arrows.
- **Collaboration** (real-time multiplayer) is out of scope for this implementation.
- **Image elements** and embedding are not implemented.
- **SVG/PNG export** rasterizes the sketch appearance using the same renderer; extremely large scenes may take a moment to export.
- **History** is snapshot-based (whole element array); for very large documents this trades memory for simplicity.
