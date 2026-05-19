import { useEffect, useRef, useState } from 'react';
import { useMatchStore } from '@/lib/store';
import { cn } from '@/lib/cn';

interface SettingsPanelProps {
  /** 'sidebar' (desktop): botón ancho que expande hacia abajo.
   *  'icon' (mobile): botón ⚙️ chiquito que abre un popover absoluto. */
  variant?: 'sidebar' | 'icon';
}

/**
 * SETTINGS PANEL — toggles para Superpower Mode + UI Pro Max.
 * Dos variantes para que se pueda usar en sidebar desktop y en header mobile.
 * El estado vive en zustand persisted, así sobrevive recargas.
 */
export const SettingsPanel = ({ variant = 'sidebar' }: SettingsPanelProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const superpowerMode = useMatchStore((s) => s.superpowerMode);
  const setSuperpowerMode = useMatchStore((s) => s.setSuperpowerMode);
  const uiProMax = useMatchStore((s) => s.uiProMax);
  const setUiProMax = useMatchStore((s) => s.setUiProMax);
  const anyOn = superpowerMode || uiProMax;

  // Cerrar al hacer click afuera (útil sobre todo en variante icon).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors',
            anyOn
              ? 'text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15'
              : 'text-muted-fg hover:text-fg hover:bg-surface-2',
          )}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <span>⚙️</span>
          <span className="flex-1 text-left">Modos</span>
          {anyOn && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              ON
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label="Modos experimentales"
          className={cn(
            'w-8 h-8 rounded-full border grid place-items-center cursor-pointer transition-colors relative',
            anyOn
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
              : 'border-border bg-surface-2 text-muted-fg hover:text-fg hover:border-primary/40',
          )}
        >
          <span className="text-sm leading-none">⚙️</span>
          {anyOn && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-bg" />
          )}
        </button>
      )}

      {open && (
        <div
          className={cn(
            'z-50 rounded-md border border-border bg-surface shadow-xl p-2 space-y-1',
            variant === 'sidebar'
              ? 'absolute left-0 right-0 mt-1'
              : 'absolute right-0 mt-2 w-72',
          )}
        >
          <ToggleRow
            id="superpower"
            label="Superpower Mode"
            icon="⚡"
            description="Atajos y panel denso en live match"
            checked={superpowerMode}
            onChange={setSuperpowerMode}
          />
          <ToggleRow
            id="ui-pro-max"
            label="UI Pro Max"
            icon="✨"
            description="Tema premium · animaciones · más densidad"
            checked={uiProMax}
            onChange={setUiProMax}
          />
          <p className="text-[9px] text-muted-fg/80 leading-snug px-1 pt-1">
            Modos experimentales. Si algo se ve raro, desactivá y reportá.
          </p>
        </div>
      )}
    </div>
  );
};

const ToggleRow = ({
  id, label, icon, description, checked, onChange,
}: {
  id: string;
  label: string;
  icon: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label
    htmlFor={id}
    className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-surface-2 cursor-pointer transition-colors"
  >
    <span className="text-base leading-none pt-0.5">{icon}</span>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-semibold text-fg">{label}</div>
      <div className="text-[10px] text-muted-fg leading-tight mt-0.5">{description}</div>
    </div>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 w-4 h-4 rounded border-border accent-primary cursor-pointer"
    />
  </label>
);
