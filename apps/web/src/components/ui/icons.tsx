// Minimal inline SVG icon set (stroke-based, inherits currentColor).
// Replaces emoji glyphs for a consistent, professional look.

type IconProps = { className?: string; strokeWidth?: number };

const base = (className = 'w-5 h-5', strokeWidth = 1.75) => ({
  className,
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const SearchIcon = ({ className, strokeWidth }: IconProps) => (
  <svg {...base(className, strokeWidth)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);

export const UserIcon = ({ className, strokeWidth }: IconProps) => (
  <svg {...base(className, strokeWidth)}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" /></svg>
);

export const CartIcon = ({ className, strokeWidth }: IconProps) => (
  <svg {...base(className, strokeWidth)}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L21 7H5.5" /></svg>
);

export const ChevronRight = ({ className, strokeWidth }: IconProps) => (
  <svg {...base(className, strokeWidth)}><path d="m9 6 6 6-6 6" /></svg>
);

export const ChevronLeft = ({ className, strokeWidth }: IconProps) => (
  <svg {...base(className, strokeWidth)}><path d="m15 6-6 6 6 6" /></svg>
);

export const StarIcon = ({ className, filled = false }: IconProps & { filled?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.8 6.1 21l1.2-6.5L2.5 9.4l6.6-.9z" />
  </svg>
);

export const BagIcon = ({ className, strokeWidth }: IconProps) => (
  <svg {...base(className, strokeWidth)}><path d="M6 7h12l-1 13H7L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
);

export const CheckIcon = ({ className, strokeWidth }: IconProps) => (
  <svg {...base(className, strokeWidth)}><path d="m5 13 4 4L19 7" /></svg>
);

export const AlertIcon = ({ className, strokeWidth }: IconProps) => (
  <svg {...base(className, strokeWidth)}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
);
