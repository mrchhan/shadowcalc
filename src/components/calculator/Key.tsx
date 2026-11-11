import type { ReactNode } from 'react';

export type KeyVariant = 'digit' | 'operator' | 'action' | 'equals' | 'sci';

interface KeyProps {
  id: string;
  label: ReactNode;
  ariaLabel?: string;
  variant?: KeyVariant;
  span?: number;
  pressed?: boolean;
  title?: string;
  onPress: () => void;
}

export function Key({ id, label, ariaLabel, variant = 'digit', span, pressed, title, onPress }: KeyProps) {
  return (
    <button
      type="button"
      className={`key key--${variant}${pressed ? ' is-pressed' : ''}`}
      style={span ? { gridColumn: `span ${span}` } : undefined}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      data-key={id}
      onClick={onPress}
    >
      <span className="key__label">{label}</span>
    </button>
  );
}
