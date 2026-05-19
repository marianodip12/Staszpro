import { useMemo } from 'react';
import { useMatchStore } from '@/lib/store';
import { buildEvent, EMPTY_DRAFT } from '@/domain/live';
import { computeScore } from '@/domain/events';
import { softDeleteEventRemote } from '@/lib/sync';
import type { EventType, HandballEvent, Team } from '@/domain/types';
import { cn } from '@/lib/cn';

/**
 * SUPERPOWER MODE — barra de atajos para coaches experimentados.
 *
 * Filosofía: durante un partido en vivo, los pasos típicos para registrar
 * un gol son:
 *   1. Tap zona de cancha → 2. Tap cuadrante de arco → 3. Confirmar outcome
 *      → 4. (opcional) Player picker → 5. (opcional) Situation
 *
 * En modo superpower, sacrificamos detalle a cambio de velocidad: 1 tap
 * por evento crítico, sin diálogos. La info se registra con `null` en los
 * campos de detalle (zona, cuadrante, situación, jugador) — el coach puede
 * volver después y editar el evento desde el timeline si necesita el detalle.
 *
 * El panel denso muestra:
 *   - Marcador grande con reloj
 *   - Atajos +1 (gol), ATJ (atajada), ERR (errado), PER (pérdida), 2' (exclusión)
 *   - Botón "↶ Deshacer" para el último evento (por si tap por error)
 *
 * Esto NO reemplaza la UI normal — convive con ella. Si querés detalle, usás
 * la cancha y el goal grid como siempre. La barra de superpower es additive,
 * se inserta arriba del scoreboard cuando el toggle está activo.
 */
export const SuperpowerBar = () => {
  const enabled = useMatchStore((s) => s.superpowerMode);
  const match = useMatchStore((s) => s.liveMatch);
  const events = useMatchStore((s) => s.liveEvents);
  const clock = useMatchStore((s) => s.liveClock);
  const addEvent = useMatchStore((s) => s.addLiveEvent);
  const removeEvent = useMatchStore((s) => s.removeLiveEvent);

  const score = useMemo(() => computeScore(events), [events]);
  const lastEvent: HandballEvent | undefined = events[events.length - 1];

  if (!enabled) return null;

  const quick = (type: EventType, team: Team) => {
    addEvent(
      buildEvent({
        type,
        draft: { ...EMPTY_DRAFT, team },
        clock,
        quickMode: true,
      }),
    );
  };

  const undoLast = () => {
    if (!lastEvent) return;
    removeEvent(lastEvent.id);
    // Si el evento ya estaba sincronizado server-side, marcarlo deleted ahí también.
    // Si nunca llegó al server (sync no corrió todavía), el RPC simplemente no hace nada.
    void softDeleteEventRemote(lastEvent.id);
  };

  return (
    <div
      className="rounded-lg border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-surface to-surface p-3 mb-3 space-y-3"
      data-testid="superpower-bar"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-amber-300">
            Superpower
          </span>
        </div>
        <button
          type="button"
          onClick={undoLast}
          disabled={!lastEvent}
          className={cn(
            'text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded border',
            lastEvent
              ? 'border-border bg-surface-2 text-muted-fg hover:text-fg hover:border-danger/40'
              : 'border-border bg-surface-2/30 text-muted-fg/40 cursor-not-allowed',
          )}
          aria-label="Deshacer último evento"
        >
          ↶ Deshacer
        </button>
      </div>

      {/* Marcador denso */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamPanel
          name={match.home}
          color={match.homeColor}
          score={score.h}
          onGoal={() => quick('goal', 'home')}
          onSave={() => quick('saved', 'home')}
          onMiss={() => quick('miss', 'home')}
          onTurnover={() => quick('turnover', 'home')}
          onExclusion={() => quick('exclusion', 'home')}
        />
        <div className="text-center px-2">
          <div className="text-[9px] uppercase tracking-widest text-muted-fg">
            {clock.half === 1 ? '1T' : '2T'} · {Math.floor(clock.seconds / 60).toString().padStart(2, '0')}:{(clock.seconds % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-[10px] text-muted-fg mt-0.5">vs</div>
        </div>
        <TeamPanel
          name={match.away}
          color={match.awayColor}
          score={score.a}
          onGoal={() => quick('goal', 'away')}
          onSave={() => quick('saved', 'away')}
          onMiss={() => quick('miss', 'away')}
          onTurnover={() => quick('turnover', 'away')}
          onExclusion={() => quick('exclusion', 'away')}
          alignRight
        />
      </div>

      <p className="text-[9px] text-muted-fg leading-tight">
        ⚠️ Modo rápido: los eventos quedan sin zona/cuadrante/jugador.
        Podés editarlos después desde el timeline si necesitás detalle.
      </p>
    </div>
  );
};

// ─── Panel por equipo ─────────────────────────────────────────────

interface TeamPanelProps {
  name: string;
  color: string;
  score: number;
  onGoal: () => void;
  onSave: () => void;
  onMiss: () => void;
  onTurnover: () => void;
  onExclusion: () => void;
  alignRight?: boolean;
}

const TeamPanel = ({
  name, color, score, onGoal, onSave, onMiss, onTurnover, onExclusion, alignRight,
}: TeamPanelProps) => (
  <div className={cn('flex flex-col gap-1.5', alignRight && 'items-end')}>
    <div className={cn('flex items-center gap-2', alignRight && 'flex-row-reverse')}>
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: color }}
        aria-hidden
      />
      <span className="text-xs font-medium truncate">{name}</span>
    </div>
    <div
      className={cn('text-3xl md:text-4xl font-mono font-bold tabular leading-none', alignRight && 'text-right')}
      style={{ color }}
    >
      {score}
    </div>
    <div className="grid grid-cols-5 gap-1 w-full mt-1">
      <QuickBtn label="+1" title="Registrar gol (sin detalle)" onClick={onGoal} variant="goal" />
      <QuickBtn label="ATJ" title="Tiro atajado" onClick={onSave} variant="save" />
      <QuickBtn label="ERR" title="Tiro errado" onClick={onMiss} variant="miss" />
      <QuickBtn label="PER" title="Pérdida" onClick={onTurnover} variant="turnover" />
      <QuickBtn label="2'" title="Exclusión 2 minutos" onClick={onExclusion} variant="exclusion" />
    </div>
  </div>
);

const QuickBtn = ({
  label, title, onClick, variant,
}: {
  label: string;
  title: string;
  onClick: () => void;
  variant: 'goal' | 'save' | 'miss' | 'turnover' | 'exclusion';
}) => {
  const styles: Record<'goal' | 'save' | 'miss' | 'turnover' | 'exclusion', string> = {
    goal: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30',
    save: 'bg-blue-500/20 border-blue-500/50 text-blue-300 hover:bg-blue-500/30',
    miss: 'bg-surface-2 border-border text-muted-fg hover:text-fg',
    turnover: 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30',
    exclusion: 'bg-orange-500/20 border-orange-500/50 text-orange-300 hover:bg-orange-500/30',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'rounded border font-bold text-[10px] py-1.5 px-1 transition-colors active:scale-95',
        styles[variant],
      )}
    >
      {label}
    </button>
  );
};

