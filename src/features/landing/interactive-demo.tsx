import { useMemo, useState } from 'react';
import { CourtView } from '@/components/handball/court-view';
import { GoalGrid } from '@/components/handball/goal-grid';
import { useT } from '@/lib/i18n';
import type { CourtZoneId, GoalZoneId } from '@/domain/types';
import { POSITIONS } from '@/domain/constants';
import { cn } from '@/lib/cn';

type Mode = 'rapido' | 'completo';
type Outcome = 'goal' | 'saved' | 'miss' | 'post';
type QuickEvent = Outcome | 'foul_2min' | 'yellow' | 'blue' | 'red' | 'turnover';

interface DemoShot {
  id: number;
  goalZone: GoalZoneId;
  courtZone: CourtZoneId;
  outcome: Outcome;
  player?: string;
}

interface QuickLog {
  id: number;
  event: QuickEvent;
  player: string;
}

interface DemoPlayer { number: number; name: string; position: string }

const DEMO_PLAYERS: DemoPlayer[] = [
  { number: 7,  name: 'D. Simonet',   position: 'Armador' },
  { number: 8,  name: 'P. Vainstein', position: 'Lat. Izq.' },
  { number: 11, name: 'D. Bonanno',   position: 'Ext. Izq.' },
  { number: 14, name: 'P. Portela',   position: 'Ext. Der.' },
  { number: 5,  name: 'G. Carou',     position: 'Pivote' },
  { number: 1,  name: 'J. Bar',       position: 'Arquero' },
];

const SEED_SHOTS: DemoShot[] = [
  { id: 1, goalZone: 'tl', courtZone: 'lateral_left',  outcome: 'goal' },
  { id: 2, goalZone: 'br', courtZone: 'extreme_right', outcome: 'goal' },
  { id: 3, goalZone: 'mc', courtZone: 'center_above',  outcome: 'saved' },
  { id: 4, goalZone: 'tr', courtZone: 'lateral_right', outcome: 'goal' },
  { id: 5, goalZone: 'bl', courtZone: 'near_left',     outcome: 'miss' },
  { id: 6, goalZone: 'tc', courtZone: 'near_center',   outcome: 'goal' },
  { id: 7, goalZone: 'ml', courtZone: 'extreme_left',  outcome: 'saved' },
  { id: 8, goalZone: 'br', courtZone: 'lateral_right', outcome: 'post' },
];

const OUTCOME_COLORS: Record<Outcome, string> = {
  goal:  '#22c55e',
  saved: '#3b82f6',
  miss:  '#ef4444',
  post:  '#f59e0b',
};

const EVENT_INFO: Record<QuickEvent, { label: string; icon: string; color: string; tone: 'fill' | 'outline' }> = {
  goal:      { label: 'Gol',       icon: '⚽', color: '#22c55e', tone: 'fill'    },
  saved:     { label: 'Atajada',   icon: '🧤', color: '#3b82f6', tone: 'fill'    },
  miss:      { label: 'Errado',    icon: '✕',  color: '#71717A', tone: 'outline' },
  post:      { label: 'Palo',      icon: '▮',  color: '#BA7517', tone: 'outline' },
  foul_2min: { label: '2 minutos', icon: '⏱',  color: '#DC2626', tone: 'fill'    },
  yellow:    { label: 'Amarilla',  icon: '🟨', color: '#EAB308', tone: 'fill'    },
  blue:      { label: 'Azul',      icon: '🟦', color: '#3B82F6', tone: 'fill'    },
  red:       { label: 'Roja',      icon: '🟥', color: '#DC2626', tone: 'fill'    },
  turnover:  { label: 'Pérdida',   icon: '↻',  color: '#71717A', tone: 'outline' },
};

export const InteractiveDemo = () => {
  const [mode, setMode] = useState<Mode>('rapido');

  return (
    <div className="rounded-xl border border-border bg-surface p-4 md:p-6 space-y-5">
      {/* Toggle de modo */}
      <div className="flex justify-center">
        <div className="inline-flex bg-surface-2 border border-border rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('rapido')}
            className={cn(
              'px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
              mode === 'rapido' ? 'bg-green-600 text-white shadow' : 'text-muted-fg hover:text-fg',
            )}
          >
            ⚡ Modo Rápido
          </button>
          <button
            type="button"
            onClick={() => setMode('completo')}
            className={cn(
              'px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
              mode === 'completo' ? 'bg-blue-600 text-white shadow' : 'text-muted-fg hover:text-fg',
            )}
          >
            📊 Modo Completo
          </button>
        </div>
      </div>

      {mode === 'rapido' ? <QuickModeDemo /> : <CompleteModeDemo />}
    </div>
  );
};

// ═══ MODO RÁPIDO DEMO ═══════════════════════════════════════════════════
const QuickModeDemo = () => {
  const [roster, setRoster] = useState<DemoPlayer[]>(DEMO_PLAYERS);
  const [draftEvent, setDraftEvent] = useState<QuickEvent | null>(null);
  const [show7m, setShow7m] = useState(false);
  const [log, setLog] = useState<QuickLog[]>([
    { id: 1, event: 'goal',      player: 'D. Simonet' },
    { id: 2, event: 'saved',     player: 'J. Bar' },
    { id: 3, event: 'goal',      player: 'P. Vainstein' },
    { id: 4, event: 'foul_2min', player: 'G. Carou' },
  ]);

  const stats = useMemo(() => {
    const goals = log.filter((e) => e.event === 'goal').length;
    const shots = log.filter((e) => ['goal', 'saved', 'miss', 'post'].includes(e.event)).length;
    const pct = shots > 0 ? Math.round((goals / shots) * 100) : 0;
    return { goals, shots, pct };
  }, [log]);

  const handleEventClick = (ev: QuickEvent) => {
    setShow7m(false);
    setDraftEvent(ev);
  };

  const handle7mClick = () => {
    setShow7m(true);
    setDraftEvent(null);
  };

  const handle7mResult = (outcome: Outcome) => {
    setDraftEvent(outcome);
    // Mantenemos show7m para indicar visualmente que viene de 7m
  };

  const handlePlayerClick = (player: string) => {
    if (!draftEvent) return;
    setLog((prev) => [
      { id: prev.length + 1, event: draftEvent, player },
      ...prev,
    ]);
    setDraftEvent(null);
    setShow7m(false);
  };

  const handleReset = () => {
    setLog([]);
    setDraftEvent(null);
    setShow7m(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <DemoStat label="Tiros" value={stats.shots} color="#94a3b8" />
        <DemoStat label="Goles" value={stats.goals} color="#22c55e" />
        <DemoStat label="Eficacia" value={`${stats.pct}%`} color="#3b82f6" />
      </div>

      {/* Paso 1: Elegir evento */}
      <div>
        <p className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
          1. ¿Qué pasó?
        </p>
        <div className="space-y-2">
          {/* Tiros */}
          <div className="grid grid-cols-2 gap-2">
            <QuickEventBtn ev="goal"  active={draftEvent === 'goal' && !show7m}  onClick={() => handleEventClick('goal')} />
            <QuickEventBtn ev="saved" active={draftEvent === 'saved' && !show7m} onClick={() => handleEventClick('saved')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <QuickEventBtn ev="miss" active={draftEvent === 'miss' && !show7m} onClick={() => handleEventClick('miss')} />
            <QuickEventBtn ev="post" active={draftEvent === 'post' && !show7m} onClick={() => handleEventClick('post')} />
          </div>
          {/* 7m especial */}
          <button
            type="button"
            onClick={handle7mClick}
            className={cn(
              'w-full h-10 rounded-md text-xs font-bold tracking-wider transition-all',
              show7m
                ? 'bg-purple-600 text-white shadow ring-2 ring-purple-400 ring-offset-2 ring-offset-surface'
                : 'bg-purple-500/10 text-purple-300 border border-purple-500/40 hover:bg-purple-500/20',
            )}
          >
            🎯 7 METROS (PENAL)
          </button>
          {show7m && (
            <div className="rounded-md border border-purple-500/40 bg-purple-500/5 p-2.5 space-y-1.5 animate-fade-in">
              <p className="text-[10px] text-purple-300 uppercase tracking-widest text-center font-semibold">
                ¿Resultado del 7m?
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <QuickEventBtn ev="goal"  active={draftEvent === 'goal'}  onClick={() => handle7mResult('goal')}  small />
                <QuickEventBtn ev="saved" active={draftEvent === 'saved'} onClick={() => handle7mResult('saved')} small />
                <QuickEventBtn ev="miss"  active={draftEvent === 'miss'}  onClick={() => handle7mResult('miss')}  small />
                <QuickEventBtn ev="post"  active={draftEvent === 'post'}  onClick={() => handle7mResult('post')}  small />
              </div>
            </div>
          )}
          {/* Sanciones */}
          <div className="grid grid-cols-2 gap-2">
            <QuickEventBtn ev="foul_2min" active={draftEvent === 'foul_2min'} onClick={() => handleEventClick('foul_2min')} />
            <QuickEventBtn ev="turnover"  active={draftEvent === 'turnover'}  onClick={() => handleEventClick('turnover')} />
          </div>
          {/* Tarjetas */}
          <div className="grid grid-cols-3 gap-2">
            <QuickEventBtn ev="yellow" active={draftEvent === 'yellow'} onClick={() => handleEventClick('yellow')} small />
            <QuickEventBtn ev="blue"   active={draftEvent === 'blue'}   onClick={() => handleEventClick('blue')}   small />
            <QuickEventBtn ev="red"    active={draftEvent === 'red'}    onClick={() => handleEventClick('red')}    small />
          </div>
        </div>
      </div>

      {/* Paso 2: Elegir jugador */}
      {draftEvent && (
        <div className="animate-fade-in">
          <p className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
            2. ¿Qué jugador? <span className="normal-case text-[10px] text-muted-fg/70 font-normal">(opcional)</span>
          </p>
          <DemoPlayerPicker
            roster={roster}
            onPick={(p) => handlePlayerClick(p.name)}
            onAdd={(p) => {
              setRoster((prev) => prev.some((x) => x.number === p.number) ? prev : [...prev, p]);
              handlePlayerClick(p.name);
            }}
            onSkip={() => handlePlayerClick('—')}
          />
        </div>
      )}

      {/* Log */}
      <div>
        <p className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
          Eventos registrados ({log.length})
        </p>
        <div className="rounded-md border border-border bg-surface-2/30 max-h-[140px] overflow-y-auto">
          {log.length === 0 ? (
            <div className="text-center text-xs text-muted-fg py-6">
              Tocá un evento arriba y un jugador para empezar
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {log.map((e) => {
                const info = EVENT_INFO[e.event];
                return (
                  <div key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider text-white whitespace-nowrap"
                      style={{ background: info.color }}
                    >
                      {info.label.toUpperCase()}
                    </span>
                    <span className="text-fg/90 flex-1 truncate">{e.player}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-muted-fg hover:text-fg transition-colors px-3 py-1.5 rounded border border-border bg-surface-2"
        >
          ↺ Reiniciar demo
        </button>
      </div>
    </div>
  );
};

// ═══ MODO COMPLETO DEMO ═════════════════════════════════════════════════
const CompleteModeDemo = () => {
  const t = useT();
  const [roster, setRoster] = useState<DemoPlayer[]>(DEMO_PLAYERS);
  const [shots, setShots] = useState<DemoShot[]>(SEED_SHOTS);
  const [draftGoal, setDraftGoal] = useState<GoalZoneId | null>(null);
  const [draftCourt, setDraftCourt] = useState<CourtZoneId | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<Outcome | null>(null);

  const canPickOutcome = draftGoal !== null && draftCourt !== null;

  const stats = useMemo(() => {
    const total = shots.length;
    const goals = shots.filter((s) => s.outcome === 'goal').length;
    const pct = total > 0 ? Math.round((goals / total) * 100) : 0;
    return { total, goals, pct };
  }, [shots]);

  const handleOutcome = (outcome: Outcome) => {
    if (!draftGoal || !draftCourt) return;
    // Igual que en un partido real: después del resultado, ¿quién tiró?
    setPendingOutcome(outcome);
  };

  const commitShot = (playerName?: string) => {
    if (!draftGoal || !draftCourt || !pendingOutcome) return;
    setShots((prev) => [
      ...prev,
      { id: prev.length + 1, goalZone: draftGoal, courtZone: draftCourt, outcome: pendingOutcome, player: playerName },
    ]);
    setDraftGoal(null);
    setDraftCourt(null);
    setPendingOutcome(null);
  };

  const handleReset = () => {
    setShots(SEED_SHOTS);
    setDraftGoal(null);
    setDraftCourt(null);
    setPendingOutcome(null);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <DemoStat label={t.landing_demo_summary_shots} value={stats.total} color="#94a3b8" />
        <DemoStat label={t.landing_demo_summary_goals} value={stats.goals} color="#22c55e" />
        <DemoStat label={t.landing_demo_summary_pct}   value={`${stats.pct}%`} color="#3b82f6" />
      </div>

      <div className="grid md:grid-cols-2 gap-5 items-start">
        <section>
          <p className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
            1. {t.landing_demo_goal_label}
          </p>
          <div className="max-w-[340px] mx-auto">
            <GoalGrid
              selected={draftGoal}
              onSelect={(z) => setDraftGoal(draftGoal === z ? null : z)}
            />
          </div>
        </section>

        <section>
          <p className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
            2. {t.landing_demo_court_label}
          </p>
          {/* Igual que en la sección "Modos": media cancha apaisada con
              marco azul degradé. CourtView mantiene su proporción real. */}
          <div className="max-w-[340px] mx-auto rounded-lg border border-blue-700/30 bg-gradient-to-b from-blue-950/40 to-blue-900/20 p-2 overflow-hidden">
            <CourtView
              selectedZone={draftCourt}
              onZoneSelect={(z) => setDraftCourt(draftCourt === z ? null : z)}
            />
          </div>
        </section>
      </div>

      <section>
        <p className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
          3. {t.landing_demo_outcome_label}
        </p>
        <div className="grid grid-cols-4 gap-2">
          <OutcomeBtn label={t.landing_demo_outcome_goal}  color={OUTCOME_COLORS.goal}  disabled={!canPickOutcome} onClick={() => handleOutcome('goal')} />
          <OutcomeBtn label={t.landing_demo_outcome_saved} color={OUTCOME_COLORS.saved} disabled={!canPickOutcome} onClick={() => handleOutcome('saved')} />
          <OutcomeBtn label={t.landing_demo_outcome_miss}  color={OUTCOME_COLORS.miss}  disabled={!canPickOutcome} onClick={() => handleOutcome('miss')} />
          <OutcomeBtn label={t.landing_demo_outcome_post}  color={OUTCOME_COLORS.post}  disabled={!canPickOutcome} onClick={() => handleOutcome('post')} />
        </div>
      </section>

      {pendingOutcome && (
        <section className="animate-fade-in">
          <p className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
            4. ¿Quién tiró?
          </p>
          <DemoPlayerPicker
            roster={roster}
            onPick={(p) => commitShot(p.name)}
            onAdd={(p) => {
              setRoster((prev) => prev.some((x) => x.number === p.number) ? prev : [...prev, p]);
              commitShot(p.name);
            }}
            onSkip={() => commitShot(undefined)}
          />
        </section>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-muted-fg hover:text-fg transition-colors px-3 py-1.5 rounded border border-border bg-surface-2"
        >
          ↺ {t.landing_demo_reset}
        </button>
      </div>
    </div>
  );
};

// ─── Subcomponentes ──────────────────────────────────────────────────

/**
 * Picker de jugadores del demo — réplica fiel del PlayerPicker del partido
 * real: roster agrupado por posición + alta rápida con número, nombre y
 * posición. Lo que se agrega queda disponible para los próximos eventos.
 */
const DemoPlayerPicker = ({
  roster,
  onPick,
  onAdd,
  onSkip,
}: {
  roster: DemoPlayer[];
  onPick: (p: DemoPlayer) => void;
  onAdd: (p: DemoPlayer) => void;
  onSkip: () => void;
}) => {
  const [showForm, setShowForm] = useState(false);
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState<string>('Campo');

  const grouped = useMemo(() => {
    const byPos: Record<string, DemoPlayer[]> = {};
    for (const p of roster) {
      const key = p.position || 'Otros';
      if (!byPos[key]) byPos[key] = [];
      byPos[key].push(p);
    }
    Object.values(byPos).forEach((ps) => ps.sort((a, b) => a.number - b.number));
    return byPos;
  }, [roster]);

  const handleAdd = () => {
    const n = Number(num);
    if (!Number.isFinite(n) || n < 1 || n > 99) return;
    onAdd({ number: n, name: name.trim() || `#${n}`, position });
    setNum(''); setName(''); setPosition('Campo'); setShowForm(false);
  };

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([pos, ps]) => (
        <div key={pos}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-fg mb-1">{pos}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {ps.map((p) => (
              <button
                key={`${p.number}-${p.name}`}
                type="button"
                onClick={() => onPick(p)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border bg-surface-2 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
              >
                <span className="w-6 h-6 rounded-full bg-bg/60 grid place-items-center text-[10px] font-bold tabular border border-border shrink-0">
                  {p.number}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium truncate">{p.name}</p>
                  <p className="text-[9px] text-muted-fg truncate">{p.position}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {showForm ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 space-y-2 animate-fade-in">
          <div className="grid grid-cols-[64px_1fr] gap-2">
            <input
              type="number"
              min={1}
              max={99}
              placeholder="N°"
              value={num}
              onChange={(e) => setNum(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs font-mono"
              autoFocus
            />
            <input
              placeholder="Nombre (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setPosition(pos)}
                className={cn(
                  'px-2 py-1 rounded-md border text-[10px] font-medium transition-colors',
                  position === pos
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-surface-2 text-muted-fg hover:border-primary/50',
                )}
              >
                {pos}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-8 rounded-md border border-border text-[11px] text-muted-fg hover:text-fg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!num}
              className="h-8 rounded-md bg-primary text-white text-[11px] font-semibold disabled:opacity-40 transition-opacity"
            >
              Agregar y taggear
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full text-[11px] text-primary py-1.5 rounded-md border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          ➕ Agregar jugador (número, nombre y posición)
        </button>
      )}

      <button
        type="button"
        onClick={onSkip}
        className="w-full text-[11px] text-muted-fg hover:text-fg py-1.5 rounded-md border border-dashed border-border hover:border-primary/40 transition-colors"
      >
        Saltar (sin asociar jugador)
      </button>
    </div>
  );
};

const DemoStat = ({ label, value, color }: { label: string; value: number | string; color: string }) => (
  <div className="rounded-md border border-border bg-surface-2/40 p-3 text-center">
    <div className="font-mono text-2xl font-semibold tabular leading-none" style={{ color }}>
      {value}
    </div>
    <div className="text-[10px] uppercase tracking-widest text-muted-fg mt-1.5">{label}</div>
  </div>
);

const QuickEventBtn = ({
  ev, active, onClick, small = false,
}: {
  ev: QuickEvent;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) => {
  const info = EVENT_INFO[ev];
  const isFilled = info.tone === 'fill';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md font-bold tracking-wider transition-all flex items-center justify-center gap-1.5',
        small ? 'h-8 text-[10px]' : 'h-10 text-xs',
        active && 'ring-2 ring-offset-2 ring-offset-surface scale-[0.98]',
      )}
      style={
        isFilled
          ? { background: info.color, color: 'white' }
          : { background: 'transparent', color: info.color, border: `1px solid ${info.color}80` }
      }
    >
      <span>{info.icon}</span>
      <span>{info.label}</span>
    </button>
  );
};

const OutcomeBtn = ({
  label, color, disabled, onClick,
}: {
  label: string;
  color: string;
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'h-11 rounded-md border text-xs font-medium transition-all',
      disabled
        ? 'border-border bg-surface-2/30 text-muted-fg/60 cursor-not-allowed'
        : 'hover:scale-[1.02] active:scale-[0.98] text-white',
    )}
    style={!disabled ? { background: color, borderColor: color } : undefined}
  >
    {label}
  </button>
);
