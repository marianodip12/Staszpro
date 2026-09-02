import { useEffect, useRef, useState } from 'react';
import { useI18n, LOCALES, LOCALE_META, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/cn';

interface LocaleMenuProps {
  /** Trigger chico: bandera + código (para el header móvil). Default: bandera + nombre. */
  compact?: boolean;
  /** Lado por el que se abre el menú. Default 'right'. */
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Botón de idioma con menú desplegable. Muestra todos los idiomas con su
 * bandera y su nombre. Reemplaza a los toggles de ES/EN/PT… que no escalan
 * a 6 idiomas.
 */
export const LocaleMenu = ({ compact = false, align = 'right', className }: LocaleMenuProps) => {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = LOCALE_META[locale];

  const pick = (l: Locale) => {
    setLocale(l);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Cambiar idioma / Change language"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2/60 font-semibold text-muted-fg hover:text-fg transition-colors whitespace-nowrap',
          compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
        )}
      >
        <span className="text-[13px] leading-none">{current.flag}</span>
        <span>{compact ? locale.toUpperCase() : current.name}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <path d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 mt-1 min-w-[168px] rounded-lg border border-border bg-surface shadow-lg py-1',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {LOCALES.map((l) => {
            const m = LOCALE_META[l];
            const active = l === locale;
            return (
              <button
                key={l}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => pick(l)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors',
                  active ? 'text-primary font-semibold bg-primary/10' : 'text-fg hover:bg-surface-2',
                )}
              >
                <span className="text-[15px] leading-none">{m.flag}</span>
                <span className="flex-1">{m.name}</span>
                {active && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
