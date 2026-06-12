import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CourtView } from '@/components/handball/court-view';
import { GoalGrid } from '@/components/handball/goal-grid';
import {
  EMPTY_FILTER,
  perGoalkeeper,
  perShooter,
  shooterKeyOf,
  type GoalkeeperSummary,
  type ShooterSummary,
} from '@/domain/analysis';
import { GOAL_QUADRANT_ORDER } from '@/domain/constants';
import { seasonPlayerEvents } from '@/domain/evolution';
import { isShotEvent } from '@/domain/types';
import type {
  CourtZoneId,
  GoalQuadrantId,
  HandballEvent,
  HandballTeam,
  MatchSummary,
} from '@/domain/types';
import { cn } from '@/lib/cn';

/**
 * 👥 Jugadores — vista de temporada.
 *
 * - Totales del plantel (cargados vs con estadísticas)
 * - Eficacia total de temporada por jugador (goles, atajados, errados, palos)
 * - Arqueros: recibidos, atajadas y % de atajadas
 * - Mapa de tiro ACUMULADO de la temporada, filtrable por jugador y por
 *   resultado (dónde convirtió, dónde le atajaron, dónde erró).
 */

// Mismos colores que el análisis de partido (gol/atajada/palo/fuera/errado)
const SHOT_COLORS: Record<string, string> = {
  goal:       '#22c55e',
  saved:      '#3b82f6',
  post:       '#f59e0b',
  miss_fault: '#a855f7',
  miss:       '#ef4444',
};

type ResultFilter = 'all' | 'goal' | 'saved' | 'post' | 'out' | 'miss';

type Selected =
  | { kind: 'shooter'; key: string }
  | { kind: 'keeper'; key: string }
  | null;

const goalkeeperKeyOf = (e: HandballEvent): string | null =>
  e.goalkeeper ? `${e.goalkeeper.number}#${e.goalkeeper.name}` : null;

const matchesResult = (e: HandballEvent, r: ResultFilter): boolean => {
  if (r === 'all') return true;
  if (r === 'out') return e.type === 'miss' && e.goalZone === 'out';
  if (r === 'miss') return e.type === 'miss' && e.goalZone !== 'out';
  return e.type === r;
};

const ACTIVE_TYPE_FOR: Record<ResultFilter, string | null> = {
  all: null,
  goal: 'goal',
  saved: 'saved',
  post: 'post',
  out: 'miss_fault',
  miss: 'miss',
};

export const PlayersSeasonView = ({ matches, myTeamName, myTeam, myColor }: {
  matches: MatchSummary[];
  myTeamName: string;
  myTeam: HandballTeam | null;
  myColor: string;
}) => {
  const [selected, setSelected] = useState<Selected>(null);
  const [result, setResult] = useState<ResultFilter>('all');

  // Eventos de toda la temporada, normalizados: 'home' = mi equipo
  const seasonEvents = useMemo(
    () => seasonPlayerEvents(matches, myTeamName),
    [matches, myTeamName],
  );

  const shooters = useMemo(
    () => perShooter(seasonEvents, { ...EMPTY_FILTER, team: 'home' }),
    [seasonEvents],
  );
  const keepers = useMemo(
    () => perGoalkeeper(seasonEvents, EMPTY_FILTER).filter((k) => k.team === 'home'),
    [seasonEvents],
  );

  // Plantel: cargados en el equipo vs con estadísticas en la temporada
  const rosterCount = myTeam?.players.length ?? 0;
  const withStatsCount = useMemo(() => {
    const names = new Set<string>();
    for (const s of shooters) names.add(s.key);
    for (const k of keepers) names.add(k.key);
    return names.size;
  }, [shooters, keepers]);

  const teamShots = useMemo(
    () => shooters.reduce((acc, s) => acc + s.shots, 0),
    [shooters],
  );
  const teamGoals = useMemo(
    () => shooters.reduce((acc, s) => acc + s.goals, 0),
    [shooters],
  );
  const teamPct = teamShots === 0 ? 0 : Math.round((teamGoals / teamShots) * 100);

  // Goles recibidos: goles del rival en toda la temporada
  const teamConceded = useMemo(
    () => seasonEvents.filter((e) => e.team === 'away' && e.type === 'goal').length,
    [seasonEvents],
  );

  // ─── Eventos base del mapa (según selección) ──────────────────────
  const isKeeper = selected?.kind === 'keeper';
  const baseEvents = useMemo(() => {
    if (selected?.kind === 'shooter') {
      return seasonEvents.filter(
        (e) => e.team === 'home' && isShotEvent(e.type) && shooterKeyOf(e) === selected.key,
      );
    }
    if (selected?.kind === 'keeper') {
      // Tiros del rival que enfrentó este arquero (gol recibido o atajada)
      return seasonEvents.filter(
        (e) => e.team === 'away'
          && (e.type === 'goal' || e.type === 'saved')
          && goalkeeperKeyOf(e) === selected.key,
      );
    }
    return seasonEvents.filter((e) => e.team === 'home' && isShotEvent(e.type));
  }, [seasonEvents, selected]);

  const filteredEvents = useMemo(
    () => baseEvents.filter((e) => matchesResult(e, result)),
    [baseEvents, result],
  );

  // Conteos para los mapas
  const zoneCounts = useMemo(() => {
    const acc: Partial<Record<CourtZoneId, number>> = {};
    for (const e of filteredEvents) {
      if (!e.zone) continue;
      acc[e.zone] = (acc[e.zone] ?? 0) + 1;
    }
    return acc;
  }, [filteredEvents]);

  const quadCounts = useMemo(() => {
    const acc: Partial<Record<GoalQuadrantId, number>> = {};
    for (const e of filteredEvents) {
      const g = e.goalZone;
      if (!g || !(GOAL_QUADRANT_ORDER as readonly string[]).includes(g)) continue;
      acc[g as GoalQuadrantId] = (acc[g as GoalQuadrantId] ?? 0) + 1;
    }
    return acc;
  }, [filteredEvents]);

  // Desglose por tipo (para los overlays de color)
  const { zoneByType, quadByType } = useMemo(() => {
    const zone: Record<string, Partial<Record<CourtZoneId, number>>> = {
      goal: {}, saved: {}, post: {}, miss_fault: {}, miss: {},
    };
    const quad: Record<string, Partial<Record<GoalQuadrantId, number>>> = {
      goal: {}, saved: {}, post: {}, miss_fault: {}, miss: {},
    };
    const bucketOf = (e: HandballEvent): string | null => {
      if (e.type === 'goal') return 'goal';
      if (e.type === 'saved') return 'saved';
      if (e.type === 'post') return 'post';
      if (e.type === 'miss') return e.goalZone === 'out' ? 'miss_fault' : 'miss';
      return null;
    };
    for (const e of baseEvents) {
      const b = bucketOf(e);
      if (!b) continue;
      if (e.zone) zone[b][e.zone] = (zone[b][e.zone] ?? 0) + 1;
      const g = e.goalZone;
      if (g && (GOAL_QUADRANT_ORDER as readonly string[]).includes(g)) {
        const q = g as GoalQuadrantId;
        quad[b][q] = (quad[b][q] ?? 0) + 1;
      }
    }
    return { zoneByType: zone, quadByType: quad };
  }, [baseEvents]);

  const selectedShooter = selected?.kind === 'shooter'
    ? shooters.find((s) => s.key === selected.key) ?? null : null;
  const selectedKeeper = selected?.kind === 'keeper'
    ? keepers.find((k) => k.key === selected.key) ?? null : null;

  const mapTitle = selectedShooter
    ? `${selectedShooter.name} #${selectedShooter.number}`
    : selectedKeeper
      ? `🧤 ${selectedKeeper.name} #${selectedKeeper.number}`
      : 'Todo el equipo';

  const toggleShooterSel = (key: string) => {
    setResult('all');
    setSelected((cur) => (cur?.kind === 'shooter' && cur.key === key ? null : { kind: 'shooter', key }));
  };
  const toggleKeeperSel = (key: string) => {
    setResult('all');
    setSelected((cur) => (cur?.kind === 'keeper' && cur.key === key ? null : { kind: 'keeper', key }));
  };

  if (seasonEvents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-xs text-muted-fg">
          Todavía no hay eventos cargados en la temporada.
        </CardContent>
      </Card>
    );
  }

  // Chips de filtro de resultado (los de tirador y los de arquero difieren)
  const chips: { key: ResultFilter; label: string; count: number }[] = isKeeper
    ? [
        { key: 'all',   label: 'Recibidos',  count: baseEvents.length },
        { key: 'goal',  label: 'Goles',      count: baseEvents.filter((e) => e.type === 'goal').length },
        { key: 'saved', label: 'Atajadas',   count: baseEvents.filter((e) => e.type === 'saved').length },
      ]
    : [
        { key: 'all',   label: 'Todos',    count: baseEvents.length },
        { key: 'goal',  label: 'Goles',    count: baseEvents.filter((e) => e.type === 'goal').length },
        { key: 'saved', label: 'Atajados', count: baseEvents.filter((e) => e.type === 'saved').length },
        { key: 'post',  label: 'Palos',    count: baseEvents.filter((e) => e.type === 'post').length },
        { key: 'out',   label: 'Fuera',    count: baseEvents.filter((e) => e.type === 'miss' && e.goalZone === 'out').length },
        { key: 'miss',  label: 'Errados',  count: baseEvents.filter((e) => e.type === 'miss' && e.goalZone !== 'out').length },
      ];

  return (
    <div className="space-y-3">
      {/* Totales del plantel */}
      <Card>
        <CardContent className="p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
            👥 Plantel · temporada
          </div>
          <div className="grid grid-cols-4 gap-2">
            <PlantelTile value={teamShots} label="Tiros" />
            <PlantelTile value={teamGoals} label="Goles" tone="goal" />
            <PlantelTile value={teamConceded} label="Goles recibidos" tone="danger" />
            <PlantelTile value={`${teamPct}%`} label="Eficacia" tone="primary" />
          </div>
          <div className="text-[10px] text-muted-fg mt-2 text-center">
            {rosterCount} {rosterCount === 1 ? 'jugador cargado' : 'jugadores cargados'} · {withStatsCount} con stats en la temporada
          </div>
        </CardContent>
      </Card>

      {/* 2 columnas en desktop: lista de jugadores ⬅️ | ➡️ mapa del seleccionado */}
      <div className="grid lg:grid-cols-2 gap-3 items-start">
        {/* ── Columna izquierda: listas ── */}
        <div className="space-y-3">
      {/* Tiradores */}
      {shooters.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">
                ⚽ Jugadores · eficacia de temporada
              </div>
              <span className="text-[9px] text-muted-fg">tocá uno para ver su mapa</span>
            </div>
            {/* Encabezado de columnas */}
            <div className="flex items-center gap-2 px-1 pb-1 text-[8px] uppercase tracking-wider text-muted-fg">
              <span className="w-6 shrink-0" />
              <span className="flex-1 min-w-0">Jugador</span>
              <span className="w-7 text-right shrink-0">Tiros</span>
              <span className="w-6 text-right shrink-0 text-goal">G</span>
              <span className="w-6 text-right shrink-0" style={{ color: SHOT_COLORS.saved }}>A</span>
              <span className="w-6 text-right shrink-0 text-danger">E</span>
              <span className="w-6 text-right shrink-0" style={{ color: SHOT_COLORS.post }}>P</span>
              <span className="w-9 text-right shrink-0">% Ef</span>
            </div>
            <div className="space-y-1">
              {shooters.map((s) => (
                <ShooterRow
                  key={s.key}
                  s={s}
                  active={selected?.kind === 'shooter' && selected.key === s.key}
                  onClick={() => toggleShooterSel(s.key)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Arqueros */}
      {keepers.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">
                🧤 Arqueros · temporada
              </div>
              <span className="text-[9px] text-muted-fg">tocá uno para ver dónde le tiraron</span>
            </div>
            <div className="flex items-center gap-2 px-1 pb-1 text-[8px] uppercase tracking-wider text-muted-fg">
              <span className="w-6 shrink-0" />
              <span className="flex-1 min-w-0">Arquero</span>
              <span className="w-9 text-right shrink-0">Recib.</span>
              <span className="w-9 text-right shrink-0" style={{ color: SHOT_COLORS.saved }}>Ataj.</span>
              <span className="w-9 text-right shrink-0 text-danger">Goles</span>
              <span className="w-9 text-right shrink-0">% Ataj</span>
            </div>
            <div className="space-y-1">
              {keepers.map((k) => (
                <KeeperRow
                  key={k.key}
                  k={k}
                  active={selected?.kind === 'keeper' && selected.key === k.key}
                  onClick={() => toggleKeeperSel(k.key)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        </div>

        {/* ── Columna derecha: mapa del jugador clickeado (sticky en desktop) ── */}
        <div className="lg:sticky lg:top-4">
      {/* Mapa de tiro de temporada */}
      <Card className={cn(selected && 'border-primary/40')}>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">
                🎯 Mapa de tiro · temporada
              </div>
              <div className="text-sm font-medium text-fg truncate mt-0.5" style={selected ? { color: myColor } : undefined}>
                {mapTitle}
              </div>
            </div>
            {selected && (
              <button
                type="button"
                onClick={() => { setSelected(null); setResult('all'); }}
                className="text-[10px] px-2 py-1 rounded-full border border-border bg-surface-2 text-muted-fg hover:text-fg shrink-0"
              >
                ✕ Todo el equipo
              </button>
            )}
          </div>

          {/* Filtro por resultado */}
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setResult((r) => (r === c.key ? 'all' : c.key))}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors',
                  result === c.key
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border bg-surface-2 text-muted-fg hover:text-fg',
                )}
              >
                {c.key !== 'all' && (
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: SHOT_COLORS[ACTIVE_TYPE_FOR[c.key] ?? 'miss'] }}
                  />
                )}
                {c.label}
                <span className="font-mono tabular opacity-70">{c.count}</span>
              </button>
            ))}
          </div>

          {/* Arco */}
          <div>
            <div className="text-[10px] text-muted-fg mb-1">
              {isKeeper ? 'Dónde le tiraron (arco)' : 'Dónde terminaron los tiros (arco)'}
            </div>
            <div className="max-w-sm md:max-w-md mx-auto">
              <GoalGrid
                counts={quadCounts}
                countsByType={quadByType}
                shotColors={SHOT_COLORS}
                activeType={ACTIVE_TYPE_FOR[result]}
                selected={null}
                onSelect={() => {}}
              />
            </div>
          </div>

          {/* Cancha */}
          <div>
            <div className="text-[10px] text-muted-fg mb-1">
              {isKeeper ? 'Desde dónde le tiraron (cancha)' : 'Desde dónde se tiró (cancha)'}
            </div>
            <div className="max-w-sm md:max-w-md mx-auto">
              <CourtView
                heatmap={zoneCounts}
                countsByType={zoneByType}
                shotColors={SHOT_COLORS}
                activeType={ACTIVE_TYPE_FOR[result]}
                selectedZone={null}
                onZoneSelect={() => {}}
              />
              {(zoneCounts.long_range ?? 0) > 0 && (
                <div className="mt-2 text-center text-[10px] text-muted-fg">
                  Arco-a-arco: {zoneCounts.long_range}
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-muted-fg text-center">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'tiro' : 'tiros'} en {' '}
            {matches.length} {matches.length === 1 ? 'partido' : 'partidos'}
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
};

// ─── Filas ────────────────────────────────────────────────────────────

const ShooterRow = ({ s, active, onClick }: {
  s: ShooterSummary; active: boolean; onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-2 px-1 py-1.5 rounded-md transition-colors text-left',
      active ? 'bg-primary/15 border border-primary/40' : 'hover:bg-surface-2 border border-transparent',
    )}
  >
    <span className="w-6 h-6 rounded-full bg-surface-2 border border-border grid place-items-center text-[10px] font-bold tabular shrink-0">
      {s.number || '–'}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-xs font-medium truncate">{s.name}</span>
      <StackedBar s={s} />
    </span>
    <span className="w-7 text-right text-xs font-mono tabular shrink-0">{s.shots}</span>
    <span className="w-6 text-right text-xs font-mono tabular font-bold text-goal shrink-0">{s.goals}</span>
    <span className="w-6 text-right text-xs font-mono tabular shrink-0" style={{ color: SHOT_COLORS.saved }}>{s.saved}</span>
    <span className="w-6 text-right text-xs font-mono tabular text-danger shrink-0">{s.miss}</span>
    <span className="w-6 text-right text-xs font-mono tabular shrink-0" style={{ color: SHOT_COLORS.post }}>{s.post}</span>
    <span className={cn(
      'w-9 text-right text-xs font-mono tabular font-bold shrink-0',
      s.pct >= 60 ? 'text-goal' : s.pct >= 40 ? 'text-warning' : 'text-danger',
    )}>
      {s.pct}%
    </span>
  </button>
);

/** Barra apilada con la composición de los tiros del jugador. */
const StackedBar = ({ s }: { s: ShooterSummary }) => {
  if (s.shots === 0) return null;
  const segs = [
    { v: s.goals, c: SHOT_COLORS.goal },
    { v: s.saved, c: SHOT_COLORS.saved },
    { v: s.post,  c: SHOT_COLORS.post },
    { v: s.miss,  c: SHOT_COLORS.miss },
  ].filter((x) => x.v > 0);
  return (
    <span className="mt-1 flex h-1.5 w-full rounded-full overflow-hidden bg-surface-2">
      {segs.map((x, i) => (
        <span key={i} style={{ width: `${(x.v / s.shots) * 100}%`, background: x.c }} />
      ))}
    </span>
  );
};

const KeeperRow = ({ k, active, onClick }: {
  k: GoalkeeperSummary; active: boolean; onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-2 px-1 py-1.5 rounded-md transition-colors text-left',
      active ? 'bg-primary/15 border border-primary/40' : 'hover:bg-surface-2 border border-transparent',
    )}
  >
    <span className="w-6 h-6 rounded-full bg-surface-2 border border-border grid place-items-center text-[10px] font-bold tabular shrink-0">
      {k.number || '–'}
    </span>
    <span className="flex-1 min-w-0 text-xs font-medium truncate">{k.name}</span>
    <span className="w-9 text-right text-xs font-mono tabular shrink-0">{k.faced}</span>
    <span className="w-9 text-right text-xs font-mono tabular font-bold shrink-0" style={{ color: SHOT_COLORS.saved }}>{k.saved}</span>
    <span className="w-9 text-right text-xs font-mono tabular text-danger shrink-0">{k.conceded}</span>
    <span className={cn(
      'w-9 text-right text-xs font-mono tabular font-bold shrink-0',
      k.pct >= 35 ? 'text-goal' : k.pct >= 25 ? 'text-warning' : 'text-danger',
    )}>
      {k.pct}%
    </span>
  </button>
);

const PLANTEL_TONE: Record<string, string> = {
  primary: 'text-primary',
  goal: 'text-goal',
  danger: 'text-danger',
  neutral: 'text-fg',
};

const PlantelTile = ({ value, label, tone = 'neutral' }: {
  value: number | string; label: string; tone?: keyof typeof PLANTEL_TONE;
}) => (
  <div className="flex flex-col items-center justify-center rounded-md bg-surface-2 border border-border py-1.5 px-1">
    <span className={cn('font-mono font-semibold tabular leading-none text-base', PLANTEL_TONE[tone])}>
      {value}
    </span>
    <span className="text-[8px] uppercase tracking-widest text-muted-fg mt-1 text-center leading-tight">{label}</span>
  </div>
);
