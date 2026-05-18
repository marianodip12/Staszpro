/**
 * @sportiq/ui/input — Text input with label + error states.
 *
 * Includes:
 *   - <Input>     plain input wrapper
 *   - <Field>     full field with label, input, error and helper
 *   - <Textarea>  textarea variant
 *
 * All variants use SportIQ design tokens and the same visual rhythm
 * (height, radius, focus ring) so forms feel coherent.
 */

'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from './utils';

// ─── Plain input ──────────────────────────────────────────────────────────────

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, style, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      style={{
        background:  'var(--navy-800)',
        color:       'var(--text-primary)',
        borderColor: invalid ? 'var(--red-500)' : 'var(--surface-border)',
        ...style,
      }}
      className={cn(
        'w-full h-10 px-3 rounded-lg border text-sm',
        'placeholder:text-[var(--text-muted)]',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2',
        invalid
          ? 'focus-visible:ring-[var(--red-500)]'
          : 'focus-visible:ring-[var(--blue-500)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  );
});

// ─── Field (label + input + error/helper) ─────────────────────────────────────

export interface FieldProps {
  label?:     string;
  error?:     string | null;
  helper?:    string;
  required?:  boolean;
  htmlFor?:   string;
  className?: string;
  children:   ReactNode;
}

export function Field({ label, error, helper, required, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
          {required && <span style={{ color: 'var(--red-400)' }} className="ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error
        ? <p className="text-xs" style={{ color: 'var(--red-400)' }}>{error}</p>
        : helper
          ? <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{helper}</p>
          : null}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, style, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      style={{
        background:  'var(--navy-800)',
        color:       'var(--text-primary)',
        borderColor: invalid ? 'var(--red-500)' : 'var(--surface-border)',
        ...style,
      }}
      className={cn(
        'w-full px-3 py-2 rounded-lg border text-sm resize-vertical',
        'placeholder:text-[var(--text-muted)]',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2',
        invalid
          ? 'focus-visible:ring-[var(--red-500)]'
          : 'focus-visible:ring-[var(--blue-500)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  );
});
