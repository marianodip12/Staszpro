/**
 * @sportiq/ui/spinner — Animated loader (uses Lucide Loader2 + rotation).
 */
'use client';

import { Loader2 } from 'lucide-react';
import { cn } from './utils';

export interface SpinnerProps {
  size?:      number;
  className?: string;
  label?:     string;
}

export function Spinner({ size = 20, className, label }: SpinnerProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)} role="status">
      <Loader2 size={size} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
      {label && (
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      )}
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

export function FullPageSpinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Spinner size={28} label={label} />
    </div>
  );
}
