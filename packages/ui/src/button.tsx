/**
 * @sportiq/ui/button — Branded button primitive.
 *
 * Variants reflect the SportIQ visual hierarchy:
 *   primary    — blue, the call-to-action
 *   secondary  — outlined navy, neutral actions
 *   ghost      — transparent, low-stakes actions
 *   danger     — red, destructive actions
 *   live       — lime, "go live" or "start match"
 *
 * Sizes:
 *   sm  — compact, list-row actions
 *   md  — default, forms and toolbars
 *   lg  — hero CTAs, landing pages
 *
 * The component uses CSS variables (var(--blue-600), etc.) so it stays
 * consistent with globals.css regardless of Tailwind class purging.
 */

'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'live';
export type ButtonSize    = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:    ButtonVariant;
  size?:       ButtonSize;
  loading?:    boolean;
  leftIcon?:   ReactNode;
  rightIcon?:  ReactNode;
  fullWidth?:  boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: 'var(--blue-600)',  color: 'white', border: '1px solid var(--blue-700)' },
  secondary: { background: 'var(--navy-700)',  color: 'var(--text-primary)', border: '1px solid var(--surface-border)' },
  ghost:     { background: 'transparent',       color: 'var(--text-secondary)', border: '1px solid transparent' },
  danger:    { background: 'var(--red-500)',   color: 'white', border: '1px solid #DC2626' },
  live:      { background: 'var(--lime-500)',  color: 'var(--navy-950)', border: '1px solid var(--lime-600)' },
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant   = 'primary',
    size      = 'md',
    loading   = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    className,
    children,
    style,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      style={{ ...VARIANT_STYLES[variant], ...style }}
      className={cn(
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150',
        'hover:brightness-110 active:scale-[.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-[var(--surface-base)] focus-visible:ring-[var(--blue-500)]',
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading
        ? <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
        : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
