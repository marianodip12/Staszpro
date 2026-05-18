/**
 * @sportiq/ui/toast — Lightweight toast notification system.
 *
 * Not built on Radix Toast — that requires a Root component wrapped around
 * the whole app. This is a simpler imperative API: anywhere in the tree,
 * call useToast() and dispatch toasts. They render in a fixed container.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Partido guardado');
 *   toast.error('No se pudo conectar al servidor', { duration: 6000 });
 *
 * The provider lives near the root of the app (typically in providers.tsx).
 */

'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from './utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id:        string;
  variant:   ToastVariant;
  message:   string;
  title?:    string;
  duration?: number;   // ms; 0 = stay until dismissed
}

export interface ToastOptions {
  title?:    string;
  duration?: number;
}

interface ToastContextValue {
  toasts:  Toast[];
  push:    (variant: ToastVariant, message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error:   (message: string, options?: ToastOptions) => void;
  info:    (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const push = useCallback(
    (variant: ToastVariant, message: string, options: ToastOptions = {}) => {
      counterRef.current += 1;
      const id = `t-${Date.now()}-${counterRef.current}`;
      const t: Toast = {
        id,
        variant,
        message,
        title:    options.title,
        duration: options.duration ?? (variant === 'error' ? 6000 : 4000),
      };
      setToasts((prev) => [...prev, t]);
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push,
      success: (m, o) => push('success', m, o),
      error:   (m, o) => push('error',   m, o),
      info:    (m, o) => push('info',    m, o),
      warning: (m, o) => push('warning', m, o),
      dismiss,
    }),
    [toasts, push, dismiss],
  );

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('[SportIQ] useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Viewport ─────────────────────────────────────────────────────────────────

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      style={{ width: 'min(380px, calc(100vw - 32px))' }}
      aria-live="polite"
      role="region"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const VARIANT_META: Record<ToastVariant, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  success: { icon: CheckCircle2,  color: 'var(--lime-400)',  bg: 'rgba(132,204,22,.12)' },
  error:   { icon: AlertCircle,   color: 'var(--red-400)',   bg: 'rgba(239,68,68,.12)'  },
  info:    { icon: Info,          color: 'var(--blue-400)',  bg: 'rgba(59,130,246,.12)' },
  warning: { icon: AlertTriangle, color: 'var(--amber-400)', bg: 'rgba(245,158,11,.12)' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { icon: Icon, color, bg } = VARIANT_META[toast.variant];

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, toast.id, onDismiss]);

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg',
        'animate-fade-up',
      )}
      style={{
        background:  'var(--surface-raised)',
        borderColor: 'var(--surface-border)',
      }}
    >
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: bg }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
            {toast.title}
          </p>
        )}
        <p className="text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-1 rounded-md transition-colors hover:bg-[var(--surface-hover)]"
        aria-label="Cerrar notificación"
      >
        <X size={14} style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  );
}
