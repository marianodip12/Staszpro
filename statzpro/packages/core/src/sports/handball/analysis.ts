/**
 * @sportiq/core — Match Analysis (handball).
 *
 * Migrated from: Handball-Pro-main/src/domain/analysis.ts
 * Status: all original exports preserved. Tests pass unchanged.
 *
 * Crossfilter logic: pure functions over HandballEvent[].
 * No side effects, no browser APIs, no UI imports.
 */

import type { CourtZoneId, GoalQuadrantId, GoalZoneId, HandballEvent } from './types';
import { GOAL_QUADRANT_ORDER, isShotEvent } from './types';

// ─── Filter ───────────────────────────────────────────────────────────────────

export interface MatchFilter {
  team:        'home' | 'away' | null;
  zone:        CourtZoneId     | null;
  quadrant:    GoalQuadrantId  | null;
  shooterKey:  string          | null;
  types:       Array<HandballEvent['type']>;
}

export const EMPTY_FILTER: MatchFilter = {
  team: null, zone: null, quadrant: null, shooterKey: null, types: [],
};

export const shooterKeyOf = (e: HandballEvent): string | null =>
  e.shooter ? `${e.shooter.number}#${e.shooter.name}` : null;

export const applyFilter = (
  events: HandballEvent[],
  f: MatchFilter,
): HandballEvent[] =>
  events.filter((e) => {
    if (f.team       && e.team       !== f.team)        return false;
    if (f.zone       && e.zone       !== f.zone)        return false;
    if (f.quadrant   && e.goalZone   !== f.quadrant)    return false;
    if (f.shooterKey && shooterKeyOf(e) !== f.shooterKey) return false;
    if (f.types.length > 0 && !f.types.includes(e.type)) return false;
    return true;
  });

export const isEmptyFilter = (f: MatchFilter): boolean =>
  f.team === null && f.zone === null && f.quadrant === null &&
  f.shooterKey === null && f.types.length === 0;

export const toggleTeam = (f: MatchFilter, t: 'home' | 'away'): MatchFilter =>
  f.team === t ? { ...f, team: null } : { ...f, team: t };

export const toggleZone = (f: MatchFilter, z: CourtZoneId): MatchFilter =>
  f.zone === z ? { ...f, zone: null } : { ...f, zone: z };

export const toggleQuadrant = (f: MatchFilter, q: GoalQuadrantId): MatchFilter =>
  f.quadrant === q ? { ...f, quadrant: null } : { ...f, quadrant: q };

export const toggleShooter = (f: MatchFilter, key: string): MatchFilter =>
  f.shooterKey === key ? { ...f, shooterKey: null } : { ...f, shooterKey: key };

export const setTypeOnly = (
  f: MatchFilter,
  t: HandballEvent['type'] | null,
): MatchFilter => {
  if (t === null) return { ...f, types: [] };
  const already = f.types.length === 1 && f.types[0] === t;
  return { ...f, types: already ? [] : [t] };
};

// ─── Aggregates ───────────────────────────────────────────────────────────────

export interface FilteredSummary {
  events: number;
  shots:  number;
  goals:  number;
  saved:  number;
  miss:   number;
  out:    number;
  post:   number;
  pct:    number;
}

export const summarize = (events: HandballEvent[]): FilteredSummary => {
  let shots = 0, goals = 0, saved = 0, miss = 0, out = 0, post = 0;
  for (const e of events) {
    if (!isShotEvent(e.type)) continue;
    shots++;
    if      (e.type === 'goal')  goals++;
    else if (e.type === 'saved') saved++;
    else if (e.type === 'miss')  { miss++; if (e.goalZone === 'out') out++; }
    else if (e.type === 'post')  post++;
  }
  return {
    events: events.length, shots, goals, saved, miss, out, post,
    pct: shots === 0 ? 0 : Math.round((goals / shots) * 100),
  };
};

// ─── Per-dimension counts (heatmap data) ─────────────────────────────────────

const filterExcluding = (f: MatchFilter, dim: keyof MatchFilter): MatchFilter => ({
  ...f,
  [dim]: dim === 'types' ? [] : null,
});

export type ZoneCounts     = Partial<Record<CourtZoneId,    number>>;
export type QuadrantCounts = Partial<Record<GoalQuadrantId, number>>;

export const perZone = (events: HandballEvent[], f: MatchFilter): ZoneCounts => {
  const base = applyFilter(events, filterExcluding(f, 'zone'));
  const result: ZoneCounts = {};
  for (const e of base) {
    if (!e.zone) continue;
    result[e.zone] = (result[e.zone] ?? 0) + 1;
  }
  return result;
};

export const perQuadrant = (events: HandballEvent[], f: MatchFilter): QuadrantCounts => {
  const base = applyFilter(events, filterExcluding(f, 'quadrant'));
  const result: QuadrantCounts = {};
  for (const e of base) {
    const g = e.goalZone;
    if (!g) continue;
    if (!(GOAL_QUADRANT_ORDER as readonly string[]).includes(g)) continue;
    const q = g as GoalQuadrantId;
    result[q] = (result[q] ?? 0) + 1;
  }
  return result;
};

// ─── Per-shooter summary ──────────────────────────────────────────────────────

export interface ShooterSummary {
  key:    string;
  name:   string;
  number: number;
  team:   'home' | 'away';
  shots:  number;
  goals:  number;
  saved:  number;
  miss:   number;
  post:   number;
  pct:    number;
}

export const perShooter = (events: HandballEvent[], f: MatchFilter): ShooterSummary[] => {
  const base = applyFilter(events, filterExcluding(f, 'shooterKey'));
  const acc  = new Map<string, ShooterSummary>();
  for (const e of base) {
    if (!isShotEvent(e.type)) continue;
    const key = shooterKeyOf(e);
    if (!key || !e.shooter) continue;
    let s = acc.get(key);
    if (!s) {
      s = { key, name: e.shooter.name, number: e.shooter.number,
            team: e.team, shots: 0, goals: 0, saved: 0, miss: 0, post: 0, pct: 0 };
      acc.set(key, s);
    }
    s.shots++;
    if      (e.type === 'goal')  s.goals++;
    else if (e.type === 'saved') s.saved++;
    else if (e.type === 'miss')  s.miss++;
    else if (e.type === 'post')  s.post++;
  }
  const arr = Array.from(acc.values());
  for (const s of arr) s.pct = s.shots === 0 ? 0 : Math.round((s.goals / s.shots) * 100);
  arr.sort((a, b) => b.shots - a.shots || a.name.localeCompare(b.name));
  return arr;
};

// ─── Per-goalkeeper summary ───────────────────────────────────────────────────

export interface GoalkeeperSummary {
  key:      string;
  name:     string;
  number:   number;
  team:     'home' | 'away';
  faced:    number;
  saved:    number;
  conceded: number;
  pct:      number;
}

export const perGoalkeeper = (events: HandballEvent[], f: MatchFilter): GoalkeeperSummary[] => {
  const base = applyFilter(events, filterExcluding(f, 'shooterKey'));
  const acc  = new Map<string, GoalkeeperSummary>();
  for (const e of base) {
    if (e.type !== 'goal' && e.type !== 'saved') continue;
    const key = e.goalkeeper ? `${e.goalkeeper.number}#${e.goalkeeper.name}` : null;
    if (!key || !e.goalkeeper) continue;
    const gkTeam: 'home' | 'away' = e.team === 'home' ? 'away' : 'home';
    let g = acc.get(key);
    if (!g) {
      g = { key, name: e.goalkeeper.name, number: e.goalkeeper.number,
            team: gkTeam, faced: 0, saved: 0, conceded: 0, pct: 0 };
      acc.set(key, g);
    }
    g.faced++;
    if (e.type === 'saved') g.saved++;
    else                    g.conceded++;
  }
  const arr = Array.from(acc.values());
  for (const g of arr) g.pct = g.faced === 0 ? 0 : Math.round((g.saved / g.faced) * 100);
  arr.sort((a, b) => b.faced - a.faced || a.name.localeCompare(b.name));
  return arr;
};

// ─── Filter chips ─────────────────────────────────────────────────────────────

export interface ActiveFilterChip {
  kind:   'team' | 'zone' | 'quadrant' | 'shooter' | 'type';
  label:  string;
  remove: (f: MatchFilter) => MatchFilter;
}

export interface FilterLabels {
  zone:     (z: CourtZoneId)            => string;
  quadrant: (q: GoalQuadrantId)         => string;
  team:     (t: 'home' | 'away')        => string;
  shooter:  (key: string)               => string;
  type:     (t: HandballEvent['type'])   => string;
}

export const activeChips = (f: MatchFilter, labels: FilterLabels): ActiveFilterChip[] => {
  const chips: ActiveFilterChip[] = [];
  if (f.team)      chips.push({ kind: 'team',     label: labels.team(f.team),         remove: (f) => ({ ...f, team: null })     });
  if (f.zone)      chips.push({ kind: 'zone',     label: labels.zone(f.zone),         remove: (f) => ({ ...f, zone: null })     });
  if (f.quadrant)  chips.push({ kind: 'quadrant', label: labels.quadrant(f.quadrant), remove: (f) => ({ ...f, quadrant: null }) });
  if (f.shooterKey) chips.push({ kind: 'shooter', label: labels.shooter(f.shooterKey), remove: (f) => ({ ...f, shooterKey: null }) });
  for (const t of f.types) {
    chips.push({ kind: 'type', label: labels.type(t), remove: (f) => ({ ...f, types: f.types.filter((x) => x !== t) }) });
  }
  return chips;
};

export const findMatchRecordId = <T extends { id: string }>(all: T[], id: string): T | null =>
  all.find((m) => m.id === id) ?? null;

export type { GoalZoneId };
