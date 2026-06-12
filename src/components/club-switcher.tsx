import { useState } from 'react';
import { ROLE_LABELS, useClubContext } from '@/lib/club-context';
import { cn } from '@/lib/cn';

/**
 * 👔 Selector de contexto de club (sidebar).
 *
 * Solo aparece si el usuario fue invitado a por lo menos un club.
 * Permite alternar entre "Mis datos" y los datos de cada club al que
 * pertenece. Cambiar de contexto limpia el store local y recarga.
 */
export const ClubSwitcher = () => {
  const { ctx, memberships, loading, enter, exit } = useClubContext();
  const [open, setOpen] = useState(false);

  if (loading || memberships.length === 0) return null;

  const currentLabel = ctx ? `Club: ${shortEmail(ctx.ownerEmail)}` : 'Mis datos';

  return (
    <div className="mt-2 border-t border-border pt-3">
      <div className="text-[9px] uppercase tracking-widest text-muted-fg px-3 mb-1">
        Estás viendo
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors border',
          ctx
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border bg-surface-2 text-fg hover:bg-surface',
        )}
      >
        <span>{ctx ? '👔' : '📂'}</span>
        <span className="flex-1 text-left truncate">{currentLabel}</span>
        <span className="text-[10px] opacity-60">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-1 space-y-1">
          <button
            type="button"
            onClick={() => { if (ctx) exit(); else setOpen(false); }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors',
              !ctx ? 'bg-primary/15 text-primary' : 'text-muted-fg hover:text-fg hover:bg-surface-2',
            )}
          >
            📂 <span className="flex-1 text-left">Mis datos</span>
            {!ctx && <span>✓</span>}
          </button>
          {memberships.map((m) => {
            const active = ctx?.ownerId === m.owner_id;
            return (
              <button
                key={m.owner_id}
                type="button"
                onClick={() => {
                  if (active) { setOpen(false); return; }
                  enter({ ownerId: m.owner_id, ownerEmail: m.owner_email, role: m.role });
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors',
                  active ? 'bg-primary/15 text-primary' : 'text-muted-fg hover:text-fg hover:bg-surface-2',
                )}
              >
                👔
                <span className="flex-1 text-left min-w-0">
                  <span className="block truncate">{shortEmail(m.owner_email)}</span>
                  <span className="block text-[9px] opacity-70">{ROLE_LABELS[m.role]}</span>
                </span>
                {active && <span>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Banner fijo cuando estamos dentro del contexto de un club ajeno.
 * Aclara de quién son los datos y con qué rol, y deja salir en un clic.
 */
export const ClubContextBanner = ({ className }: { className?: string }) => {
  const { ctx, exit, readOnly } = useClubContext();
  if (!ctx) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-primary/40 bg-primary/10 px-3 py-2',
        'flex items-center gap-2 flex-wrap text-xs',
        className,
      )}
    >
      <span>👔</span>
      <span className="flex-1 min-w-0 text-fg">
        Estás viendo los datos del club de{' '}
        <strong className="text-primary">{ctx.ownerEmail}</strong>{' '}
        como <strong>{ROLE_LABELS[ctx.role]}</strong>
        {readOnly && <span className="text-muted-fg"> · no podés crear ni editar nada</span>}
      </span>
      <button
        type="button"
        onClick={() => exit()}
        className="px-2.5 py-1 rounded-md border border-border bg-surface-2 text-[11px] font-medium text-muted-fg hover:text-fg shrink-0 transition-colors"
      >
        Volver a mis datos
      </button>
    </div>
  );
};

const shortEmail = (e: string): string => e.split('@')[0] ?? e;
