/**
 * @sportiq/ui/error-fallback — Standard error display.
 *
 * Used by Next.js error.tsx files. Receives the error and a reset() callback
 * provided by the framework. Shows a friendly message + retry + optional
 * "report bug" link.
 */
'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './button';

export interface ErrorFallbackProps {
  error:           Error & { digest?: string };
  reset?:          () => void;
  title?:          string;
  description?:    string;
  showDigest?:     boolean;
}

export function ErrorFallback({
  error,
  reset,
  title       = 'Algo salió mal',
  description = 'Ocurrió un error inesperado. Probá de nuevo en unos segundos.',
  showDigest  = true,
}: ErrorFallbackProps) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center p-6">
      <div className="card p-6 max-w-md text-center">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)' }}
        >
          <AlertTriangle size={22} style={{ color: 'var(--red-400)' }} />
        </div>
        <h2 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
        {showDigest && error.digest && (
          <p className="text-xs font-mono mb-5 px-2 py-1 rounded inline-block"
             style={{ background: 'var(--navy-900)', color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }}>
            ref: {error.digest}
          </p>
        )}
        {reset && (
          <Button onClick={reset} leftIcon={<RotateCw size={14} />}>
            Reintentar
          </Button>
        )}
      </div>
    </div>
  );
}
