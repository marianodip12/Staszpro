/**
 * @sportiq/core — Handball stats aggregates.
 * Migrated from: Handball-Pro-main/src/domain/stats.ts
 */

import { GOAL_QUADRANT_ORDER, isShotEvent } from './types';
import type { CourtZoneId, GoalQuadrantId, HandballEvent, MatchSummary } from './types';

export interface MatchStats {
  homeGoals: number; awayGoals: number;
  homeShots: number; awayShots: number;
  homeOnTarget: number; awayOnTarget: number;
  homeSaved: number; awaySaved: number;
  homeMiss: number; awayMiss: number;
  homePost: number; awayPost: number;
  homeExcl: number; awayExcl: number;
  homeTm: number; awayTm: number;
  homeTurnover: number; awayTurnover: number;
  homePct: number; awayPct: number;
  rivalGKSaved: number; rivalGKTotal: number; rivalGKPct: number;
  homeGKSaved: number; homeGKTotal: number; homeGKPct: number;
  homePenals: number; awayPenals: number;
}

const countBy = <K extends keyof HandballEvent>(
  events: HandballEvent[], key: K, value: HandballEvent[K], team?: 'home' | 'away',
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
  const homePenals = events.filter((e) => e.zone === '7m' && e.team === 'home').length;
  const awayPenals = events.filter((e) => e.zone === '7m' && e.team === 'away').length;
  const rivalGKSaved = homeSaved;
  const rivalGKTotal = homeSaved + homeGoals;
  const homeGKSaved  = awaySaved;
  const homeGKTotal  = awaySaved + awayGoals;
  return {
    homeGoals, awayGoals, homeShots, awayShots,
    homeOnTarget: homeGoals + homeSaved, awayOnTarget: awayGoals + awaySaved,
    homeSaved, awaySaved, homeMiss, awayMiss, homePost, awayPost,
    homeExcl, awayExcl, homeTm, awayTm, homeTurnover, awayTurnover,
    homePct: pct(homeGoals, homeShots), awayPct: pct(awayGoals, awayShots),
    rivalGKSaved, rivalGKTotal, rivalGKPct: pct(rivalGKSaved, rivalGKTotal),
    homeGKSaved, homeGKTotal, homeGKPct: pct(homeGKSaved, homeGKTotal),
    homePenals, awayPenals,
  };
};

// ─── Goalkeeper map ───────────────────────────────────────────────────────────

export interface GKQuadrantBucket { saved: number; goals: number; miss: number; total: number; }
export interface NamedGKStats {
  name: string; number: number;
  saved: number; goals: number; miss: number; total: number;
  byQuadrant: Record<GoalQuadrantId, GKQuadrantBucket>;
}
export interface GoalkeeperMap { named: NamedGKStats[]; quick: GKQuadrantBucket | null; }

const emptyBucket = (): GKQuadrantBucket => ({ saved: 0, goals: 0, miss: 0, total: 0 });
const emptyByQuadrant = (): Record<GoalQuadrantId, GKQuadrantBucket> =>
  GOAL_QUADRANT_ORDER.reduce((acc, q) => { acc[q] = emptyBucket(); return acc; }, {} as Record<GoalQuadrantId, GKQuadrantBucket>);

export const buildGoalkeeperMap = (events: HandballEvent[], shootingTeam: 'home' | 'away'): GoalkeeperMap => {
  const namedAcc: Record<string, NamedGKStats> = {};
  const quick: GKQuadrantBucket = emptyBucket();
  let hasQuick = false;
  for (const e of events) {
    if (e.team !== shootingTeam) continue;
    if (!isShotEvent(e.type) || e.type === 'post') continue;
    const bucketKey = e.type === 'goal' ? 'goals' : e.type === 'saved' ? 'saved' : 'miss';
    if (e.quickMode || !e.goalkeeper) { hasQuick = true; quick.total++; quick[bucketKey]++; continue; }
    const key = e.goalkeeper.name;
    if (!namedAcc[key]) {
      namedAcc[key] = { name: e.goalkeeper.name, number: e.goalkeeper.number,
                        saved: 0, goals: 0, miss: 0, total: 0, byQuadrant: emptyByQuadrant() };
    }
    const gk = namedAcc[key]!;
    gk.total++; gk[bucketKey]++;
    if (e.goalZone && GOAL_QUADRANT_ORDER.includes(e.goalZone as GoalQuadrantId)) {
      const q = e.goalZone as GoalQuadrantId;
      gk.byQuadrant[q]!.total++; gk.byQuadrant[q]![bucketKey]++;
    }
  }
  return { named: Object.values(namedAcc).sort((a, b) => b.total - a.total), quick: hasQuick ? quick : null };
};

// ─── Heatmap ──────────────────────────────────────────────────────────────────

export type HeatCounts = Partial<Record<CourtZoneId, number>>;

export const buildHeatCounts = (events: HandballEvent[]): HeatCounts => {
  const c: HeatCounts = {};
  for (const e of events) { if (!e.zone) continue; c[e.zone] = (c[e.zone] ?? 0) + 1; }
  return c;
};

export const buildHeatCountsByTeam = (events: HandballEvent[], team: 'home' | 'away'): HeatCounts =>
  buildHeatCounts(events.filter((e) => e.team === team));

// ─── Scorers ──────────────────────────────────────────────────────────────────

export interface ScorerStat { name: string; number: number; goals: number; team: 'home' | 'away'; }

export const buildScorers = (events: HandballEvent[]): ScorerStat[] => {
  const m: Record<string, ScorerStat> = {};
  for (const e of events) {
    if (e.type !== 'goal' || !e.shooter) continue;
    const key = `${e.team}:${e.shooter.name}`;
    if (!m[key]) m[key] = { name: e.shooter.name, number: e.shooter.number, goals: 0, team: e.team };
    m[key]!.goals++;
  }
  return Object.values(m).sort((a, b) => b.goals - a.goals);
};

// ─── Season stats ─────────────────────────────────────────────────────────────

export interface SeasonStats { w: number; d: number; l: number; gf: number; ga: number; pts: number; total: number; }

export const buildSeasonStats = (completedMatches: MatchSummary[], myTeamName: string): SeasonStats => {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const m of completedMatches) {
    const isHome = m.home === myTeamName;
    if (!isHome && m.away !== myTeamName) continue;
    const myG = isHome ? m.hs : m.as;
    const oppG = isHome ? m.as : m.hs;
    gf += myG; ga += oppG;
    if (myG > oppG) w++; else if (myG === oppG) d++; else l++;
  }
  return { w, d, l, gf, ga, pts: w * 2 + d, total: w + d + l };
};
