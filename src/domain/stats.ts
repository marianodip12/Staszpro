import { GOAL_QUADRANT_ORDER, TURNOVER_REASON_ORDER } from './constants';
import { isShotEvent } from './types';
import type {
  CourtZoneId,
  GoalQuadrantId,
  HandballEvent,
  MatchSummary,
  Team,
  TurnoverReason,
} from './types';

// ─── Match stats (aggregates per-team) ──────────────────────────────────
export interface MatchStats {
  homeGoals: number;
  awayGoals: number;
  homeShots: number;              // all shot attempts (goal+miss+save+post)
  awayShots: number;
  homeOnTarget: number;           // shots that reached the goal (goal + saved)
  awayOnTarget: number;
  homeSaved: number;              // home shots that were saved by rival GK
  awaySaved: number;              // vice versa
  homeMiss: number;
  awayMiss: number;
  homePost: number;
  awayPost: number;
  homeExcl: number;
  awayExcl: number;
  homeTm: number;
  awayTm: number;
  homeTurnover: number;
  awayTurnover: number;
  // Shooting effectiveness: goals / total shots (conversion %).
  homePct: number;
  awayPct: number;
  // Goalkeeper performance
  // rivalGK* = rival GK facing home shots on target → their save rate
  rivalGKSaved: number;           // how many home shots they saved
  rivalGKTotal: number;           // home shots on target (goals + saves)
  rivalGKPct: number;             // saved / total
  // homeGK* = our GK facing away shots
  homeGKSaved: number;
  homeGKTotal: number;
  homeGKPct: number;
  // 7m
  homePenals: number;
  awayPenals: number;
}

const countBy = <K extends keyof HandballEvent>(
  events: HandballEvent[],
  key: K,
  value: HandballEvent[K],
  team?: Team,
): number =>
  events.reduce((acc, e) => {
    if (e[key] !== value) return acc;
    if (team && e.team !== team) return acc;
    return acc + 1;
  }, 0);

const pct = (num: number, den: number): number =>
  den === 0 ? 0 : Math.round((num / den) * 100);

export const computeMatchStats = (events: HandballEvent[]): MatchStats => {
  const homeGoals = countBy(events, 'type', 'goal', 'home');
  const awayGoals = countBy(events, 'type', 'goal', 'away');
  const homeMiss  = countBy(events, 'type', 'miss', 'home');
  const awayMiss  = countBy(events, 'type', 'miss', 'away');
  // `saved` column is stored on the TEAM whose shot was saved (i.e. the shooter's team).
  // The GK who made the save is the OPPOSING GK.
  const homeSaved = countBy(events, 'type', 'saved', 'home');
  const awaySaved = countBy(events, 'type', 'saved', 'away');
  const homePost  = countBy(events, 'type', 'post', 'home');
  const awayPost  = countBy(events, 'type', 'post', 'away');

  const homeShots = homeGoals + homeMiss + homeSaved + homePost;
  const awayShots = awayGoals + awayMiss + awaySaved + awayPost;

  const homeExcl  = countBy(events, 'type', 'exclusion', 'home');
  const awayExcl  = countBy(events, 'type', 'exclusion', 'away');
  const homeTm    = countBy(events, 'type', 'timeout', 'home');
  const awayTm    = countBy(events, 'type', 'timeout', 'away');
  const homeTurnover = countBy(events, 'type', 'turnover', 'home');
  const awayTurnover = countBy(events, 'type', 'turnover', 'away');

  // Penals = shots taken from 7m zone
  const homePenals = events.filter((e) => e.zone === '7m' && e.team === 'home').length;
  const awayPenals = events.filter((e) => e.zone === '7m' && e.team === 'away').length;

  // GK percentages
  // "rival GK" stops home shots on target. On-target = goal + saved (not miss, not post).
  const rivalGKSaved = homeSaved;
  const rivalGKTotal = homeSaved + homeGoals;
  const homeGKSaved = awaySaved;
  const homeGKTotal = awaySaved + awayGoals;

  return {
    homeGoals, awayGoals,
    homeShots, awayShots,
    homeOnTarget: homeGoals + homeSaved,
    awayOnTarget: awayGoals + awaySaved,
    homeSaved, awaySaved,
    homeMiss, awayMiss,
    homePost, awayPost,
    homeExcl, awayExcl,
    homeTm, awayTm,
    homeTurnover, awayTurnover,
    homePct: pct(homeGoals, homeShots),
    awayPct: pct(awayGoals, awayShots),
    rivalGKSaved,
    rivalGKTotal,
    rivalGKPct: pct(rivalGKSaved, rivalGKTotal),
    homeGKSaved,
    homeGKTotal,
    homeGKPct: pct(homeGKSaved, homeGKTotal),
    homePenals,
    awayPenals,
  };
};

// ─── Goalkeeper map (per-GK, by quadrant) ───────────────────────────────
export interface GKQuadrantBucket {
  saved: number;
  goals: number;
  miss: number;
  total: number;
}

export interface NamedGKStats {
  name: string;
  number: number;
  saved: number;
  goals: number;
  miss: number;
  total: number;
  byQuadrant: Record<GoalQuadrantId, GKQuadrantBucket>;
}

export interface GoalkeeperMap {
  named: NamedGKStats[];
  quick: GKQuadrantBucket | null;
}

const emptyBucket = (): GKQuadrantBucket => ({ saved: 0, goals: 0, miss: 0, total: 0 });
const emptyByQuadrant = (): Record<GoalQuadrantId, GKQuadrantBucket> =>
  GOAL_QUADRANT_ORDER.reduce(
    (acc, q) => {
      acc[q] = emptyBucket();
      return acc;
    },
    {} as Record<GoalQuadrantId, GKQuadrantBucket>,
  );

/**
 * Builds a goalkeeper performance map for a given team's *shots*.
 *
 * Important: we pass the TEAM OF THE SHOOTER. The GKs surfaced here are
 * the opposing team's GKs (they are who makes/breaks saves against this team).
 */
export const buildGoalkeeperMap = (
  events: HandballEvent[],
  shootingTeam: Team,
): GoalkeeperMap => {
  const namedAcc: Record<string, NamedGKStats> = {};
  const quick: GKQuadrantBucket = emptyBucket();
  let hasQuick = false;

  for (const e of events) {
    if (e.team !== shootingTeam) continue;
    if (!isShotEvent(e.type) || e.type === 'post') continue;

    const bucketKey =
      e.type === 'goal' ? 'goals' :
      e.type === 'saved' ? 'saved' : 'miss';

    if (e.quickMode || !e.goalkeeper) {
      hasQuick = true;
      quick.total++;
      quick[bucketKey]++;
      continue;
    }

    const key = e.goalkeeper.name;
    if (!namedAcc[key]) {
      namedAcc[key] = {
        name: e.goalkeeper.name,
        number: e.goalkeeper.number,
        saved: 0, goals: 0, miss: 0, total: 0,
        byQuadrant: emptyByQuadrant(),
      };
    }
    const gk = namedAcc[key];
    gk.total++;
    gk[bucketKey]++;

    // goalZone may be a quadrant or a meta-region (post/out).
    // Only aggregate into the 3x3 grid if it's an actual quadrant.
    if (e.goalZone && GOAL_QUADRANT_ORDER.includes(e.goalZone as GoalQuadrantId)) {
      const q = e.goalZone as GoalQuadrantId;
      gk.byQuadrant[q].total++;
      gk.byQuadrant[q][bucketKey]++;
    }
  }

  return {
    named: Object.values(namedAcc).sort((a, b) => b.total - a.total),
    quick: hasQuick ? quick : null,
  };
};

// ─── Heatmap counts by court zone ───────────────────────────────────────
export type HeatCounts = Partial<Record<CourtZoneId, number>>;

export const buildHeatCounts = (events: HandballEvent[]): HeatCounts => {
  const c: HeatCounts = {};
  for (const e of events) {
    if (!e.zone) continue;
    c[e.zone] = (c[e.zone] ?? 0) + 1;
  }
  return c;
};

export const buildHeatCountsByTeam = (
  events: HandballEvent[],
  team: Team,
): HeatCounts => buildHeatCounts(events.filter((e) => e.team === team));

// ─── Top scorers ────────────────────────────────────────────────────────
export interface ScorerStat {
  name: string;
  number: number;
  goals: number;
  team: Team;
}

export const buildScorers = (events: HandballEvent[]): ScorerStat[] => {
  const m: Record<string, ScorerStat> = {};
  for (const e of events) {
    if (e.type !== 'goal' || !e.shooter) continue;
    const key = `${e.team}:${e.shooter.name}`;
    if (!m[key]) {
      m[key] = {
        name: e.shooter.name,
        number: e.shooter.number,
        goals: 0,
        team: e.team,
      };
    }
    m[key].goals++;
  }
  return Object.values(m).sort((a, b) => b.goals - a.goals);
};

// ─── Pérdidas por motivo ──────────────────────────────────────────────
export type TurnoverReasonKey = TurnoverReason | 'unknown';

const EMPTY_REASONS = (): Record<TurnoverReasonKey, number> => ({
  steal: 0, bad_pass: 0, bad_reception: 0, steps: 0, offensive_foul: 0, unknown: 0,
});

export interface TurnoverPlayerRow {
  name: string;
  number: number;
  team: Team;
  total: number;
  byReason: Record<TurnoverReasonKey, number>;
}

export interface TurnoverBreakdown {
  home: Record<TurnoverReasonKey, number>;
  away: Record<TurnoverReasonKey, number>;
  homeTotal: number;
  awayTotal: number;
  /** Pérdidas por jugador (ambos equipos si tienen shooter). Ordenado desc. */
  byPlayer: TurnoverPlayerRow[];
  /** Orden canónico de los motivos, para renderizar. */
  order: readonly TurnoverReasonKey[];
}

export const buildTurnoverBreakdown = (events: HandballEvent[]): TurnoverBreakdown => {
  const home = EMPTY_REASONS();
  const away = EMPTY_REASONS();
  const players: Record<string, TurnoverPlayerRow> = {};

  for (const e of events) {
    if (e.type !== 'turnover') continue;
    const key: TurnoverReasonKey = e.turnoverReason ?? 'unknown';
    (e.team === 'home' ? home : away)[key]++;

    if (e.shooter) {
      const pk = `${e.team}:${e.shooter.name}:${e.shooter.number}`;
      if (!players[pk]) {
        players[pk] = { name: e.shooter.name, number: e.shooter.number, team: e.team, total: 0, byReason: EMPTY_REASONS() };
      }
      players[pk].total++;
      players[pk].byReason[key]++;
    }
  }

  const sum = (r: Record<TurnoverReasonKey, number>) =>
    Object.values(r).reduce((a, b) => a + b, 0);

  return {
    home, away,
    homeTotal: sum(home),
    awayTotal: sum(away),
    byPlayer: Object.values(players).sort((a, b) => b.total - a.total),
    order: [...TURNOVER_REASON_ORDER, 'unknown'],
  };
};

// ─── Minutos jugados por jugador (Modo Super Completo) ────────────────
// Solo para el equipo local ('home'): en Super Completo cada evento de
// 'home' guarda un snapshot de la formación en cancha (lineup). Entre dos
// snapshots consecutivos, los jugadores del snapshot anterior estuvieron
// en cancha ese intervalo de minutos. El tiempo previo al primer snapshot
// no se cuenta (no sabemos quién estaba). Si no hay snapshots → [] (el
// partido no se cargó en Super Completo) y la UI oculta la sección.
export interface MinutesRow {
  number: number;
  minutes: number;
}

export const buildMinutesPlayed = (
  events: HandballEvent[],
  endMinute?: number,
): MinutesRow[] => {
  const withLineup = events
    .filter(
      (e) =>
        e.team === 'home' &&
        e.lineup != null &&
        (e.lineup.field.length > 0 || e.lineup.goalkeeper != null),
    )
    .sort((a, b) => a.min - b.min);
  if (withLineup.length === 0) return [];

  const lastMin = endMinute ?? events.reduce((m, e) => Math.max(m, e.min), 0);
  const acc: Record<number, number> = {};

  for (let i = 0; i < withLineup.length; i++) {
    const cur = withLineup[i];
    const nextMin = i + 1 < withLineup.length ? withLineup[i + 1].min : lastMin;
    const delta = Math.max(0, nextMin - cur.min);
    if (delta === 0) continue;
    const nums = new Set<number>(cur.lineup!.field);
    if (cur.lineup!.goalkeeper != null) nums.add(cur.lineup!.goalkeeper);
    for (const n of nums) acc[n] = (acc[n] ?? 0) + delta;
  }

  return Object.entries(acc)
    .map(([number, minutes]) => ({ number: Number(number), minutes }))
    .sort((a, b) => b.minutes - a.minutes || a.number - b.number);
};

// ─── Season stats (across completed matches) ────────────────────────────
export interface SeasonStats {
  w: number;                 // wins
  d: number;                 // draws
  l: number;                 // losses
  gf: number;                // goals for
  ga: number;                // goals against
  pts: number;               // Sistema liga: W=3, E=2, P=1
  total: number;             // total matches
}

export const buildSeasonStats = (
  completedMatches: MatchSummary[],
  myTeamName: string,
): SeasonStats => {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const m of completedMatches) {
    const isHome = m.home === myTeamName;
    const isAway = m.away === myTeamName;
    if (!isHome && !isAway) continue;
    const myG  = isHome ? m.hs : m.as;
    const oppG = isHome ? m.as : m.hs;
    gf += myG;
    ga += oppG;
    if (myG > oppG) w++;
    else if (myG === oppG) d++;
    else l++;
  }
  return { w, d, l, gf, ga, pts: w * 3 + d * 2 + l, total: w + d + l };
};
