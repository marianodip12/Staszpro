/**
 * PlayerMatchDetailPage — Detalle de un partido personal ya guardado.
 *
 * Muestra info del partido + timeline de eventos, todo read-only.
 * Sin edición todavía — eso queda para etapa 3.
 */

import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  listMyPersonalMatches,
  getPersonalMatchEvents,
  type PersonalEventType,
  type PersonalEvent,
} from '@/lib/personal-profile-api';
import { GoalGrid } from '@/components/handball/goal-grid';
import { CourtView } from '@/components/handball/court-view';
import { cn } from '@/lib/cn';
import type { CourtZoneId, GoalQuadrantId } from '@/domain/types';

// ─── Shot type colors (mismo mapa que usa el coach) ──────────────────────
const SHOT_TYPE_COLORS: Record<string, string> = {
  goal:  '#22c55e',
  saved: '#3b82f6',
  post:  '#f59e0b',
  miss:  '#ef4444',
};

// ─── Labels ───────────────────────────────────────────────────────────────

const TURNOVER_REASON_LABELS: Record<string, string> = {
  mal_pase:       'Mal pase',
  mala_recepcion: 'Mala recepción',
  robo:           'Robo del rival',
  falta_ataque:   'Falta en ataque',
};

const ZONE_LABELS: Record<string, string> = {
  extreme_left:  'Extremo Izq',
  lateral_left:  'Lateral Izq',
  center_above:  'Centro',
  lateral_right: 'Lateral Der',
  extreme_right: 'Extremo Der',
  near_left:     'Cerca Izq',
  near_center:   'Pivote',
  near_right:    'Cerca Der',
  '7m':          '7 metros',
  long_range:    'Arco a arco',
};

const GOAL_SECTION_LABELS: Record<string, string> = {
  tl: 'Arriba izq',  tc: 'Arriba centro',  tr: 'Arriba der',
  ml: 'Medio izq',   mc: 'Medio centro',   mr: 'Medio der',
  bl: 'Abajo izq',   bc: 'Abajo centro',   br: 'Abajo der',
};

// ─── Component ────────────────────────────────────────────────────────────

export const PlayerMatchDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // El match viene del listado — no hay RPC para un match individual, pero es cheap
  const matchesQ = useQuery({
    queryKey: ['personal-matches-all'],
    queryFn: () => listMyPersonalMatches(100, 0),
  });

  const eventsQ = useQuery({
    queryKey: ['personal-match-events', id],
    queryFn: () => getPersonalMatchEvents(id!),
    enabled: !!id,
  });

  const match = useMemo(
    () => matchesQ.data?.find((m) => m.id === id) ?? null,
    [matchesQ.data, id],
  );

  // ⚠️ IMPORTANTE: TODOS los hooks deben llamarse ANTES de cualquier early return.
  // Si un useMemo/useState/etc va después de un `if (...) return`, React lanza
  // el error #310 ("more hooks than previous render") en el segundo render.
  const events = eventsQ.data ?? [];

  // Counts por cuadrante del arco, breakdown por tipo (goal/saved/miss/post)
  const quadCountsByType = useMemo(() => {
    const acc: Record<string, Partial<Record<GoalQuadrantId, number>>> = {
      goal: {}, saved: {}, miss: {}, post: {},
    };
    for (const e of events) {
      if (!e.goal_section) continue;
      if (!isShotType(e.type)) continue;
      const k = e.goal_section as GoalQuadrantId;
      const bucket = acc[e.type];
      if (bucket) bucket[k] = (bucket[k] ?? 0) + 1;
    }
    return acc;
  }, [events]);

  // Total por cuadrante (sumatorio de todos los tipos). Necesario para que
  // GoalGrid pinte los números — usa `counts` como driver de "hay algo o no".
  const quadCounts = useMemo(() => {
    const acc: Partial<Record<GoalQuadrantId, number>> = {};
    for (const e of events) {
      if (!e.goal_section || !isShotType(e.type)) continue;
      const k = e.goal_section as GoalQuadrantId;
      acc[k] = (acc[k] ?? 0) + 1;
    }
    return acc;
  }, [events]);

  // Counts por zona de la cancha, breakdown por tipo
  const zoneCountsByType = useMemo(() => {
    const acc: Record<string, Partial<Record<CourtZoneId, number>>> = {
      goal: {}, saved: {}, miss: {}, post: {},
    };
    for (const e of events) {
      if (!e.zone) continue;
      if (!isShotType(e.type)) continue;
      const k = e.zone as CourtZoneId;
      const bucket = acc[e.type];
      if (bucket) bucket[k] = (bucket[k] ?? 0) + 1;
    }
    return acc;
  }, [events]);

  // Total por zona (heatmap driver de CourtView)
  const zoneCounts = useMemo(() => {
    const acc: Partial<Record<CourtZoneId, number>> = {};
    for (const e of events) {
      if (!e.zone || !isShotType(e.type)) continue;
      const k = e.zone as CourtZoneId;
      acc[k] = (acc[k] ?? 0) + 1;
    }
    return acc;
  }, [events]);

  // ────── A partir de acá pueden haber early returns ──────

  if (matchesQ.isLoading) {
    return <div className="p-8 text-center text-muted-fg text-sm">Cargando partido…</div>;
  }

  if (!match) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold mb-2">Partido no encontrado</h1>
        <p className="text-sm text-muted-fg mb-6">
          El partido no existe o fue eliminado.
        </p>
        <button
          type="button"
          onClick={() => navigate('/app/player/home')}
          className="px-4 py-2.5 rounded-md bg-primary text-primary-fg font-semibold text-sm hover:bg-primary/90"
        >
          Volver a mis stats
        </button>
      </div>
    );
  }

  const result =
    match.my_score > match.opp_score ? 'W' :
    match.my_score < match.opp_score ? 'L' :
    match.my_score === match.opp_score && (match.my_score > 0 || match.opp_score > 0) ? 'D' : '-';

  const stats = summarizeEvents(events);
  const hasMappedShots =
    stats.shots > 0 && events.some((e) => e.goal_section || e.zone);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/app/player/home')}
        className="text-xs text-muted-fg hover:text-fg flex items-center gap-1"
      >
        ← Volver
      </button>

      {/* Header */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-fg">Partido</div>
            <h1 className="text-2xl font-bold truncate">vs {match.opponent}</h1>
            <div className="text-xs text-muted-fg mt-1">
              {match.match_date}
              {match.competition && <> · {match.competition}</>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ResultBadge result={result} />
            <div className="text-right">
              <div className="text-3xl font-mono font-bold tabular-nums">
                {match.my_score} · {match.opp_score}
              </div>
              <div className="text-[10px] text-muted-fg">Yo · Rival</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats resumen */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-3">
          Mi rendimiento
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Goles"       value={stats.goals}      accent="goal" />
          <StatCard label="Tiros"       value={stats.shots} />
          <StatCard label="Efectividad" value={fmtPct(stats.efficiency)} />
          <StatCard label="Atajados"    value={stats.saved} />
          <StatCard label="Errados"     value={stats.missed}     accent="danger" />
          <StatCard label="Palos"       value={stats.posts} />
          <StatCard label="Asistencias" value={stats.assists} />
          <StatCard label="Pérdidas"    value={stats.turnovers} />
          <StatCard label="Exclusiones" value={stats.exclusions} accent="danger" />
          <StatCard label="Amarillas"   value={stats.yellows} />
          <StatCard label="Azules"      value={stats.blues} />
          <StatCard label="Rojas"       value={stats.reds}       accent="danger" />
        </div>
      </div>

      {/* Mapa de tiros */}
      {hasMappedShots && (
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-3">
            Mapa de tiros
          </h2>

          {/* Leyenda de colores */}
          <div className="flex flex-wrap gap-3 mb-4 justify-center text-[10px]">
            <LegendDot color={SHOT_TYPE_COLORS.goal}  label="Gol" />
            <LegendDot color={SHOT_TYPE_COLORS.saved} label="Atajado" />
            <LegendDot color={SHOT_TYPE_COLORS.miss}  label="Errado" />
            <LegendDot color={SHOT_TYPE_COLORS.post}  label="Palo" />
          </div>

          <div className="space-y-6">
            {/* Arco */}
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-medium">Arco</h3>
                <span className="text-[10px] text-muted-fg">Cuadrante impactado</span>
              </div>
              <div className="max-w-md mx-auto">
                <GoalGrid
                  onSelect={() => {}}
                  counts={quadCounts}
                  countsByType={quadCountsByType}
                  shotColors={SHOT_TYPE_COLORS}
                />
              </div>
            </section>

            {/* Cancha */}
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-medium">Cancha</h3>
                <span className="text-[10px] text-muted-fg">Zona del lanzamiento</span>
              </div>
              <div className="max-w-md mx-auto">
                <CourtView
                  onZoneSelect={() => {}}
                  heatmap={zoneCounts}
                  countsByType={zoneCountsByType}
                  shotColors={SHOT_TYPE_COLORS}
                />
              </div>
            </section>
          </div>

          <p className="text-center text-[10px] text-muted-fg mt-3">
            Los números en cada casilla son la cantidad de tiros por tipo
          </p>
        </div>
      )}

      {/* Timeline de eventos */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-3">
          Eventos ({events.length})
        </h2>
        {eventsQ.isLoading ? (
          <p className="text-xs text-muted-fg">Cargando eventos…</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-fg italic">Este partido no tiene eventos cargados.</p>
        ) : (
          <div className="space-y-1">
            {events.map((e, idx) => (
              <div
                key={e.id}
                className="flex items-center gap-2 rounded border border-border bg-surface px-2 py-2 text-xs"
              >
                <span className="text-muted-fg font-mono w-8 shrink-0">#{idx + 1}</span>
                <span className="text-muted-fg font-mono w-8 shrink-0">{e.minute}'</span>
                <EventTypeBadge type={e.type} />
                <div className="flex-1 min-w-0 text-[10px] text-muted-fg truncate">
                  {formatEventDetails(e)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-muted-fg">
        Edición de partidos ya cargados — próximamente.
      </p>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────

interface SummarizedStats {
  goals: number; shots: number; efficiency: number | null;
  saved: number; missed: number; posts: number;
  assists: number; turnovers: number; exclusions: number;
  yellows: number; blues: number; reds: number;
}

const summarizeEvents = (events: PersonalEvent[]): SummarizedStats => {
  let goals = 0, shots = 0, saved = 0, missed = 0, posts = 0;
  let assists = 0, turnovers = 0, exclusions = 0;
  let yellows = 0, blues = 0, reds = 0;
  for (const e of events) {
    switch (e.type) {
      case 'goal':   goals++;  shots++; break;
      case 'saved':  saved++;  shots++; break;
      case 'miss':   missed++; shots++; break;
      case 'post':   posts++;  shots++; break;
      case 'assist':      assists++;    break;
      case 'turnover':    turnovers++;  break;
      case 'exclusion':   exclusions++; break;
      case 'yellow_card': yellows++;    break;
      case 'blue_card':   blues++;      break;
      case 'red_card':    reds++;       break;
    }
  }
  const efficiency = shots > 0 ? goals / shots : null;
  return { goals, shots, efficiency, saved, missed, posts, assists, turnovers, exclusions, yellows, blues, reds };
};

const isShotType = (t: PersonalEventType): boolean =>
  t === 'goal' || t === 'saved' || t === 'miss' || t === 'post';

const formatEventDetails = (e: PersonalEvent): string => {
  const parts: string[] = [];
  if (e.zone && ZONE_LABELS[e.zone])                 parts.push(ZONE_LABELS[e.zone]);
  else if (e.zone)                                    parts.push(e.zone);
  if (e.goal_section && GOAL_SECTION_LABELS[e.goal_section]) parts.push(GOAL_SECTION_LABELS[e.goal_section]);
  else if (e.goal_section)                            parts.push(e.goal_section);
  if (e.situation && TURNOVER_REASON_LABELS[e.situation])    parts.push(TURNOVER_REASON_LABELS[e.situation]);
  else if (e.situation)                               parts.push(e.situation);
  if (e.quick_mode && parts.length === 0)             parts.push('rápido');
  return parts.join(' · ');
};

const fmtPct = (x: number | null): string =>
  x == null ? '—' : `${Math.round(x * 100)}%`;

// ─── Subcomponents ────────────────────────────────────────────────────────

const StatCard = ({
  label, value, accent,
}: {
  label: string;
  value: number | string;
  accent?: 'goal' | 'danger' | 'primary';
}) => {
  const color =
    accent === 'primary' ? 'text-primary' :
    accent === 'goal'    ? 'text-goal'    :
    accent === 'danger'  ? 'text-danger'  : 'text-fg';
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="text-[9px] uppercase tracking-widest text-muted-fg">{label}</div>
      <div className={`mt-1 text-xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
};

const ResultBadge = ({ result }: { result: 'W' | 'D' | 'L' | '-' }) => {
  const cls =
    result === 'W' ? 'bg-goal/15 text-goal border-goal/40' :
    result === 'L' ? 'bg-danger/15 text-danger border-danger/40' :
    result === 'D' ? 'bg-amber-500/15 text-amber-500 border-amber-500/40' :
                     'bg-surface-2 text-muted-fg border-border';
  const label = result === 'W' ? 'GANADO' : result === 'L' ? 'PERDIDO' : result === 'D' ? 'EMPATE' : '—';
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest border rounded px-2 py-1 ${cls}`}>
      {label}
    </span>
  );
};

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
    <span className="text-muted-fg">{label}</span>
  </span>
);

const EventTypeBadge = ({ type }: { type: PersonalEventType }) => {
  const map: Record<PersonalEventType, { label: string; cls: string }> = {
    goal:            { label: 'Gol',        cls: 'bg-goal/15 text-goal border-goal/40' },
    miss:            { label: 'Errado',     cls: 'bg-surface-2 text-muted-fg border-border' },
    saved:           { label: 'Atajado',    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
    post:            { label: 'Palo',       cls: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
    save:            { label: 'Atajada',    cls: 'bg-primary/15 text-primary border-primary/40' },
    goal_conceded:   { label: 'Gol c/',     cls: 'bg-danger/15 text-danger border-danger/40' },
    assist:          { label: 'Asist.',     cls: 'bg-primary/15 text-primary border-primary/40' },
    turnover:        { label: 'Pérd.',      cls: 'bg-orange-500/15 text-orange-400 border-orange-500/40' },
    exclusion:       { label: '2\'',        cls: 'bg-red-500/15 text-red-400 border-red-500/40' },
    yellow_card:     { label: 'TA',         cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40' },
    blue_card:       { label: 'TAz',        cls: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
    red_card:        { label: 'TR',         cls: 'bg-danger/15 text-danger border-danger/40' },
    foul_committed:  { label: 'Falta',      cls: 'bg-surface-2 text-muted-fg border-border' },
  };
  const m = map[type];
  return (
    <span className={cn('text-[10px] font-bold border rounded px-1.5 py-0.5 shrink-0', m.cls)}>
      {m.label}
    </span>
  );
};
