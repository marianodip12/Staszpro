import type { HandballEvent, LineupSnapshot } from './types';

/**
 * 📊 Análisis por formación — v2 (ataque + defensa + eficacia + balance).
 *
 * Cada evento de mi equipo (team='home') puede llevar un `lineup` con quién
 * estaba en cancha. Agregamos esos eventos por combinación de jugadores para
 * responder: "¿qué tan bien juega el equipo con cada alineación?".
 *
 * Modos:
 *   - 'field'    → solo los 6/7 de campo (ignora arquero)
 *   - 'fieldGk'  → los 6/7 de campo + el arquero
 *
 * Los eventos del rival (team='away') NO traen mi lineup. Para imputarles la
 * formación defensiva que YO tenía en ese instante, reconstruimos la
 * "formación vigente" recorriendo los eventos en orden cronológico: la
 * última formación vista en un evento home es la que estaba activa.
 */

export type LineupMode = 'field' | 'fieldGk';

export interface FormationStat {
  /** Clave estable de la formación (números ordenados). */
  key: string;
  /** Números de los jugadores de campo. */
  field: number[];
  /** Arquero (solo en modo 'fieldGk'). */
  goalkeeper: number | null;

  // ─── Ofensiva (yo con esta formación) ───────────────────────────
  /** Goles convertidos por mi equipo. */
  goalsFor: number;
  /** Tiros errados por mi equipo. */
  missedShots: number;
  /** Tiros míos atajados por el GK rival. */
  savedShots: number;
  /** Palos que pegué. */
  postedShots: number;
  /** Tiros totales de mi equipo (goles + errados + atajados + palos). */
  shots: number;
  /** Pérdidas de mi equipo (turnover). */
  turnovers: number;

  // ─── Defensiva (rival contra esta formación) ────────────────────
  /** Goles recibidos. */
  goalsAgainst: number;
  /** Atajadas de mi arquero. */
  saves: number;
  /** Errados del rival. */
  opponentMisses: number;
  /** Palos del rival. */
  opponentPosts: number;
  /** Tiros totales del rival contra esta formación. */
  opponentShots: number;

  // ─── Balance ────────────────────────────────────────────────────
  /** Diferencia de gol (GF − GC). */
  goalDiff: number;
  /** Eventos totales atribuibles (uso de la formación). */
  totalEvents: number;

  // ─── Eficacias (0..1, o null si no hubo tiros suficientes) ──────
  /** Eficacia ofensiva = goles / tiros. `null` si `shots === 0`. */
  attackEfficiency: number | null;
  /** Eficacia defensiva = 1 − (goles en contra / tiros del rival). `null` si `opponentShots === 0`. */
  defenseEfficiency: number | null;
}

const MY_SHOT_TYPES = new Set(['goal', 'miss', 'saved', 'post']);
const OPP_SHOT_TYPES = new Set(['goal', 'miss', 'saved', 'post']);

/** Clave canónica de una formación según el modo. */
const lineupKey = (lu: LineupSnapshot, mode: LineupMode): string => {
  const field = [...lu.field].sort((a, b) => a - b).join('-');
  if (mode === 'field') return field;
  return `${field}|gk:${lu.goalkeeper ?? 'vacia'}`;
};

/**
 * Agrega estadísticas por formación.
 * Solo considera eventos que tengan `lineup` (los viejos sin formación se ignoran).
 * Los eventos del rival se imputan a la última formación vigente.
 */
export const perFormation = (
  events: HandballEvent[],
  mode: LineupMode,
): FormationStat[] => {
  const map = new Map<string, FormationStat>();
  let current: LineupSnapshot | null = null;

  const ordered = [...events].sort((a, b) => a.min - b.min);

  for (const e of ordered) {
    // Actualizar formación vigente con cada evento mío que la traiga
    if (e.team === 'home' && e.lineup && e.lineup.field.length > 0) {
      current = e.lineup;
    }

    if (e.team === 'home') {
      // ── Evento de mi equipo ──────────────────────────────────────
      const lu = e.lineup && e.lineup.field.length > 0 ? e.lineup : current;
      if (!lu) continue;
      const key = lineupKey(lu, mode);
      const stat = map.get(key) ?? blank(key, lu, mode);
      stat.totalEvents++;
      if (MY_SHOT_TYPES.has(e.type)) stat.shots++;
      if (e.type === 'goal') stat.goalsFor++;
      else if (e.type === 'miss') stat.missedShots++;
      else if (e.type === 'saved') stat.savedShots++;
      else if (e.type === 'post') stat.postedShots++;
      else if (e.type === 'turnover') stat.turnovers++;
      map.set(key, stat);
    } else if (e.team === 'away') {
      // ── Evento del rival: se imputa a mi formación vigente ───────
      if (!current) continue;
      // Solo trackeamos tiros del rival + saved (nuestras atajadas).
      // Turnovers/tarjetas/timeouts del rival no aportan a mi análisis.
      if (!OPP_SHOT_TYPES.has(e.type)) continue;
      const key = lineupKey(current, mode);
      const stat = map.get(key) ?? blank(key, current, mode);
      stat.totalEvents++;
      stat.opponentShots++;
      if (e.type === 'goal') stat.goalsAgainst++;
      else if (e.type === 'saved') stat.saves++; // rival tiró y mi GK atajó
      else if (e.type === 'miss') stat.opponentMisses++;
      else if (e.type === 'post') stat.opponentPosts++;
      map.set(key, stat);
    }
  }

  // Post-proceso: calcular derivados (goalDiff + eficacias)
  const stats = Array.from(map.values()).map((s) => ({
    ...s,
    goalDiff: s.goalsFor - s.goalsAgainst,
    attackEfficiency: s.shots > 0 ? s.goalsFor / s.shots : null,
    defenseEfficiency: s.opponentShots > 0 ? 1 - s.goalsAgainst / s.opponentShots : null,
  }));

  // Orden: por uso (totalEvents) desc; desempate por diferencia de gol
  return stats.sort(
    (a, b) => b.totalEvents - a.totalEvents || b.goalDiff - a.goalDiff,
  );
};

const blank = (key: string, lu: LineupSnapshot, mode: LineupMode): FormationStat => ({
  key,
  field: [...lu.field].sort((a, b) => a - b),
  goalkeeper: mode === 'fieldGk' ? lu.goalkeeper : null,
  goalsFor: 0,
  missedShots: 0,
  savedShots: 0,
  postedShots: 0,
  shots: 0,
  turnovers: 0,
  goalsAgainst: 0,
  saves: 0,
  opponentMisses: 0,
  opponentPosts: 0,
  opponentShots: 0,
  goalDiff: 0,
  totalEvents: 0,
  attackEfficiency: null,
  defenseEfficiency: null,
});

/** ¿Este partido tiene datos de formación cargados? */
export const hasFormationData = (events: HandballEvent[]): boolean =>
  events.some((e) => e.team === 'home' && e.lineup && e.lineup.field.length > 0);

// ═══════════════════════════════════════════════════════════════════
//   TIMELINE POR FORMACIÓN (para el detalle expandible)
// ═══════════════════════════════════════════════════════════════════

/** Un tramo temporal continuo en el que esta formación estuvo en cancha. */
export interface FormationSegment {
  from: number; // minuto de inicio (inclusive)
  to: number;   // minuto de fin (inclusive)
}

/** Un punto del marcador durante la vida de la formación. */
export interface ScorePoint {
  minute: number;
  home: number;
  away: number;
  /** Tipo del evento que ocurrió en ese minuto (para colorear puntos). */
  eventType: string;
  /** true si el evento es de mi equipo. */
  isHome: boolean;
}

export interface FormationTimeline {
  key: string;
  /** Rangos de minutos en que se usó esta formación. */
  segments: FormationSegment[];
  /** Puntos del marcador durante los tramos activos. */
  scorePoints: ScorePoint[];
  /** Score al empezar el primer tramo (para el gráfico). */
  startScore: { home: number; away: number };
  /** Score al terminar el último tramo. */
  endScore: { home: number; away: number };
}

/**
 * Devuelve, por cada formación, sus rangos temporales activos y la evolución
 * del marcador durante esos rangos. Usa la misma lógica de "formación vigente"
 * que `perFormation`.
 */
export const getFormationTimelines = (
  events: HandballEvent[],
  mode: LineupMode,
): Map<string, FormationTimeline> => {
  const map = new Map<string, FormationTimeline>();
  let currentKey: string | null = null;
  let currentSegStart: number | null = null;
  let home = 0;
  let away = 0;

  const ordered = [...events].sort((a, b) => a.min - b.min);

  const ensure = (key: string): FormationTimeline => {
    let t = map.get(key);
    if (!t) {
      t = {
        key,
        segments: [],
        scorePoints: [],
        startScore: { home, away },
        endScore: { home, away },
      };
      map.set(key, t);
    }
    return t;
  };

  const closeSegment = (endMin: number) => {
    if (currentKey && currentSegStart != null) {
      const t = ensure(currentKey);
      t.segments.push({ from: currentSegStart, to: endMin });
      t.endScore = { home, away };
      currentSegStart = null;
    }
  };

  for (const e of ordered) {
    // Detectar cambio de formación mirando el lineup del evento (solo home)
    if (e.team === 'home' && e.lineup && e.lineup.field.length > 0) {
      const newKey = lineupKey(e.lineup, mode);
      if (newKey !== currentKey) {
        closeSegment(e.min);
        currentKey = newKey;
        currentSegStart = e.min;
        // Registrar startScore si es la primera vez que aparece esta formación
        const t = ensure(currentKey);
        if (t.segments.length === 0 && t.scorePoints.length === 0) {
          t.startScore = { home, away };
        }
      }
    }

    // Actualizar score en base al evento
    let scored = false;
    if (e.type === 'goal') {
      if (e.team === 'home') { home++; scored = true; }
      else if (e.team === 'away') { away++; scored = true; }
    }

    // Si estamos dentro de un segmento, registrar el punto del score
    if (currentKey && (scored || e.team === 'home' || e.team === 'away')) {
      const t = ensure(currentKey);
      t.scorePoints.push({
        minute: e.min,
        home,
        away,
        eventType: e.type,
        isHome: e.team === 'home',
      });
      t.endScore = { home, away };
    }
  }

  // Cerrar el último segmento con el último minuto visto (o 60 si no hay eventos)
  const lastMin = ordered.length > 0 ? ordered[ordered.length - 1].min : 60;
  closeSegment(lastMin);

  return map;
};
