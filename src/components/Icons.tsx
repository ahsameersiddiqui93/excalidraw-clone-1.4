/**
 * components/Icons.tsx
 * -----------------------------------------------------------------------------
 * Lightweight, dependency-free SVG icon set used across the UI. Each icon
 * inherits the current text color via `stroke="currentColor"`.
 */

interface IconProps {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const SelectionIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M5 3l6 16 2-6 6-2z" />
  </svg>
);

export const RectangleIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <rect x="4" y="5" width="16" height="14" rx="1.5" />
  </svg>
);

export const EllipseIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <ellipse cx="12" cy="12" rx="8" ry="6.5" />
  </svg>
);

export const DiamondIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M12 3l9 9-9 9-9-9z" />
  </svg>
);

export const LineIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M4 20L20 4" />
  </svg>
);

export const ArrowIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M4 20L20 4" />
    <path d="M20 11V4h-7" />
  </svg>
);

export const DrawIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M3 18c3 1 4-3 7-3s3 3 6 0" />
    <path d="M14 6l4 4-9 9-4 1 1-4z" />
  </svg>
);

export const TextIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M5 5h14" />
    <path d="M12 5v14" />
  </svg>
);

export const EraserIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M7 21h10" />
    <path d="M5 14l6-6 7 7-5 5H9z" />
  </svg>
);

export const HandIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M8 11V5.5a1.5 1.5 0 013 0V11" />
    <path d="M11 11V4.5a1.5 1.5 0 013 0V11" />
    <path d="M14 11V5.5a1.5 1.5 0 013 0V13c0 4-2 7-6 7s-6-3-6-6l-1-3a1.5 1.5 0 012.6-1.4L8 11" />
  </svg>
);

export const UndoIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M9 7L4 12l5 5" />
    <path d="M4 12h11a5 5 0 010 10h-1" />
  </svg>
);

export const RedoIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M15 7l5 5-5 5" />
    <path d="M20 12H9a5 5 0 000 10h1" />
  </svg>
);

export const TrashIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </svg>
);

export const PlusIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M5 12h14" />
  </svg>
);

export const MenuIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const LockIcon = ({ size = 18 }: IconProps): JSX.Element => (
  <svg {...base(size)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
);
