import { useState, useRef } from 'react';
import { useT } from '@/lib/i18n';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GOAL_QUADRANTS, COURT_ZONES } from '@/domain/constants';
import type { CourtZoneId, GoalZoneId, Situation } from '@/domain/types';
import { cn } from '@/lib/cn';

export type ShotOutcome = 'goal' | 'saved' | 'miss' | 'post';

export interface ShotOutcomeDialogProps {
  open: boolean;
  onClose: () => void;
  goalZone: GoalZoneId | null;
  courtZone: CourtZoneId | null;
  onConfirm: (outcome: ShotOutcome, situation: Situation | null) => void;
}

const SITUATIONS: { value: Situation; label: string; short: string; color: string }[] = [
  { value: 'inferioridad', label: 'Inferioridad', short: '−1', color: '#DC2626' },
  { value: 'igualdad',     label: 'Igualdad',     short: '=',  color: '#71717A' },
  { value: 'superioridad', label: 'Superioridad', short: '+1', color: '#22C55E' },
];

export const ShotOutcomeDialog = ({ open, onClose, goalZone, courtZone, onConfirm }: ShotOutcomeDialogProps) => {
  const t = useT();
  const [situation, setSituation] = useState<Situation | null>(null);

  // Protección anti-doble-tap: una vez que el usuario toca un outcome, bloqueamos
  // los botones por 600ms. Esto evita que un tap nervioso o un doble-tap de iOS
  // registre 2 goles del mismo tiro.
  const lockedRef = useRef(false);

  const goalLabel = goalZone === 'post' ? t.live_palo : goalZone === 'out' ? t.live_fuera
    : goalZone ? `${GOAL_QUADRANTS[goalZone].arrow} ${GOAL_QUADRANTS[goalZone].label}` : null;
  const courtLabel = courtZone ? COURT_ZONES[courtZone].label : null;

  const handleConfirm = (outcome: ShotOutcome) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setTimeout(() => { lockedRef.current = false; }, 600);
    onConfirm(outcome, situation);
    setSituation(null); // Reset para próximo tiro
  };

  const handleClose = () => {
    setSituation(null);
    lockedRef.current = false;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title={t.outcome_title}>
      {/* Zona y cuadrante */}
      <div className="flex items-center justify-center gap-2 mb-3 text-xs text-muted-fg">
        {courtLabel && <span className="px-2 py-1 rounded-md bg-surface-2 border border-border text-fg">{courtLabel}</span>}
        <span>→</span>
        {goalLabel && (
          <span className={cn('px-2 py-1 rounded-md border',
            goalZone === 'post' ? 'bg-warning/15 border-warning/40 text-warning' :
            goalZone === 'out'  ? 'bg-surface-2 border-border text-muted-fg' :
                                  'bg-primary/15 border-primary/40 text-primary')}>
            {goalLabel}
          </span>
        )}
      </div>

      {/* Slider de situación */}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-fg mb-2 text-center">
          Situación <span className="normal-case text-[10px]">(opcional)</span>
        </p>
        <div className="grid grid-cols-3 gap-1.5 bg-surface-2/40 p-1 rounded-lg">
          {SITUATIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSituation(situation === s.value ? null : s.value)}
              className={cn(
                'py-2 px-2 rounded-md text-xs font-medium transition-all border flex flex-col items-center gap-0.5',
                situation === s.value
                  ? 'border-2 text-white shadow-md'
                  : 'border-transparent text-muted-fg hover:text-fg hover:bg-surface',
              )}
              style={situation === s.value ? { background: s.color, borderColor: s.color } : undefined}
            >
              <span className={cn('text-base font-bold tabular', situation !== s.value && 'opacity-60')}>
                {s.short}
              </span>
              <span className="text-[10px]">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Outcome buttons */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Button variant="success" onClick={() => handleConfirm('goal')} className="h-14 text-base">{t.outcome_goal}</Button>
        <Button onClick={() => handleConfirm('saved')} className="h-14 text-base bg-save hover:bg-save/90">{t.outcome_saved}</Button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Button variant="secondary" onClick={() => handleConfirm('miss')} className="h-11 text-sm">{t.outcome_miss}</Button>
        <Button variant="secondary" onClick={() => handleConfirm('post')} className="h-11 text-sm text-warning border-warning/40 bg-warning/10">{t.outcome_post}</Button>
      </div>

      {/* Botón Cancelar grande y visible — el bug original era que en mobile no
          había forma de cerrar el modal sin registrar un evento. */}
      <Button
        variant="ghost"
        onClick={handleClose}
        className="w-full h-11 text-sm text-muted-fg border border-border"
      >
        ✕ Cancelar (no registrar tiro)
      </Button>
    </Dialog>
  );
};
