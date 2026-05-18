/**
 * @sportiq/analytics — Season analytics pipeline.
 *
 * Pure functions over MatchSummary[] + HandballEvent[][].
 * No DB access, no UI imports, no side effects.
 *
 * Designed to run both:
 *   - Client-side (dashboard filters, instant feedback)
 *   - Edge Function (background compute after match closes)
 */

import {
  computeMatchStats,
  buildScorers,
  buildHeatCounts,
} from '@sportiq/core/handball';
import {
  scoreTimeline,
  seasonTotals,
  seasonTimeline,
} from '@sportiq/core/handball';
import type { HandballEvent, MatchSummary, SeasonTotals } from '@sportiq/core/handball';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchRecord {
  summary: MatchSummary;
  events:  HandballEvent[];
}

export interface SeasonAggregates {
  totals:        SeasonTotals;
  form:          MatchResult[];          // last 5 results
  avgGoalsFor:   number;
  avgGoalsAgainst: number;
  topScorers:    TopScorer[];
  shotsByZone:   Partial<Record<string, number>>;
  goalsByZone:   Partial<Record<string, number>>;
  conceded:      ConcededProfile;
  streaks:       StreakInfo;
  perMatch:      PerMatchStat[];
}

export type MatchResult = 'W' | 'D' | 'L';

export interface TopScorer {
  name:   string;
  number: number;
  goals:  number;
  shots:  number;
  pct:    number;
  team:   'home' | 'away';
  matchCount: number;
}

export interface ConcededProfile {
  total:      number;
  perMatch:   number;
  byZone:     Partial<Record<string, number>>;
  byMinute:   MinuteBucket[];
}

export interface MinuteBucket {
  rangeLabel: string;   // '0–10', '11–20', …
  count:      number;
}

export interface StreakInfo {
  current:    { type: MatchResult; count: number };
  bestWin:    number;
  bestUnbeaten: number;
}

export interface PerMatchStat {
  matchId:   string;
  date:      string | null;
  opponent:  string;
  result:    MatchResult;
  goalsFor:  number;
  goalsAgainst: number;
  shots:     number;
  efficiency: number;
}

// ─── Main aggregator ──────────────────────────────────────────────────────────

export function computeSeasonAggregates(
  records:    MatchRecord[],
  myTeamName: string,
): SeasonAggregates {
  const summaries = records.map((r) => r.summary);
  const allEvents = records.flatMap((r) => r.events);

  const totals     = seasonTotals(summaries, myTeamName);
  const form       = buildForm(summaries, myTeamName);
  const topScorers = buildTopScorers(records, myTeamName);
  const shotsByZone  = buildZoneMap(allEvents, 'home', false);
  const goalsByZone  = buildZoneMap(allEvents, 'home', true);
  const conceded     = buildConcededProfile(records, myTeamName);
  const streaks      = buildStreaks(summaries, myTeamName);
  const perMatch     = buildPerMatch(records, myTeamName);

  return {
    totals,
    form: form.slice(-5),
    avgGoalsFor:     safe(totals.goalsFor     / (totals.played || 1), 1),
    avgGoalsAgainst: safe(totals.goalsAgainst / (totals.played || 1), 1),
    topScorers,
    shotsByZone,
    goalsByZone,
    conceded,
    streaks,
    perMatch,
  };
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function buildForm(matches: MatchSummary[], team: string): MatchResult[] {
  return matches.map((m) => {
    const isHome = m.home === team;
    const mine   = isHome ? m.hs : m.as;
    const theirs = isHome ? m.as : m.hs;
    return mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
  });
}

// ─── Top scorers (cross-match) ────────────────────────────────────────────────

function buildTopScorers(records: MatchRecord[], myTeamName: string): TopScorer[] {
  const acc: Record<string, TopScorer & { matchIds: Set<string> }> = {};

  for (const { summary, events } of records) {
    const myTeam: 'home' | 'away' = summary.home === myTeamName ? 'home' : 'away';
    const myEvents = events.filter((e) => e.team === myTeam);

    for (const ev of myEvents) {
      if (!ev.shooter) continue;
      if (ev.type !== 'goal' && ev.type !== 'miss' && ev.type !== 'saved' && ev.type !== 'post') continue;
      const key = `${ev.shooter.number}#${ev.shooter.name}`;
      if (!acc[key]) {
        acc[key] = {
          name: ev.shooter.name, number: ev.shooter.number,
          goals: 0, shots: 0, pct: 0, team: myTeam, matchCount: 0,
          matchIds: new Set(),
        };
      }
      const s = acc[key]!;
      s.shots++;
      if (ev.type === 'goal') s.goals++;
      s.matchIds.add(summary.id);
    }
  }

  return Object.values(acc)
    .map(({ matchIds, ...s }) => ({
      ...s,
      matchCount: matchIds.size,
      pct: s.shots === 0 ? 0 : Math.round((s.goals / s.shots) * 100),
    }))
    .sort((a, b) => b.goals - a.goals || b.shots - a.shots);
}

// ─── Zone maps ────────────────────────────────────────────────────────────────

function buildZoneMap(
  events: HandballEvent[],
  team:   'home' | 'away',
  goalsOnly: boolean,
): Partial<Record<string, number>> {
  const result: Partial<Record<string, number>> = {};
  for (const ev of events) {
    if (ev.team !== team)  continue;
    if (goalsOnly && ev.type !== 'goal') continue;
    if (!ev.zone) continue;
    result[ev.zone] = (result[ev.zone] ?? 0) + 1;
  }
  return result;
}

// ─── Conceded profile ─────────────────────────────────────────────────────────

const MINUTE_BUCKETS = [
  [0, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60],
] as const;

function buildConcededProfile(records: MatchRecord[], myTeamName: string): ConcededProfile {
  const buckets: number[] = Array(MINUTE_BUCKETS.length).fill(0);
  const byZone: Partial<Record<string, number>> = {};
  let total = 0;

  for (const { summary, events } of records) {
    const opponentTeam: 'home' | 'away' = summary.home === myTeamName ? 'away' : 'home';
    for (const ev of events) {
      if (ev.team !== opponentTeam || ev.type !== 'goal') continue;
      total++;
      if (ev.zone) byZone[ev.zone] = (byZone[ev.zone] ?? 0) + 1;
      for (let i = 0; i < MINUTE_BUCKETS.length; i++) {
        const [lo, hi] = MINUTE_BUCKETS[i]!;
        if (ev.min >= lo && ev.min <= hi) { buckets[i]!++; break; }
      }
    }
  }

  const played = records.length || 1;
  return {
    total,
    perMatch: safe(total / played, 1),
    byZone,
    byMinute: MINUTE_BUCKETS.map(([lo, hi], i) => ({
      rangeLabel: `${lo}–${hi}`,
      count:      buckets[i] ?? 0,
    })),
  };
}

// ─── Streaks ──────────────────────────────────────────────────────────────────

function buildStreaks(matches: MatchSummary[], team: string): StreakInfo {
  const form = buildForm(matches, team);

  let bestWin = 0, bestUnbeaten = 0;
  let curWin  = 0, curUnbeaten  = 0;

  for (const r of form) {
    if (r === 'W') { curWin++; curUnbeaten++; }
    else if (r === 'D') { curWin = 0; curUnbeaten++; }
    else { curWin = 0; curUnbeaten = 0; }
    if (curWin      > bestWin)      bestWin      = curWin;
    if (curUnbeaten > bestUnbeaten) bestUnbeaten = curUnbeaten;
  }

  // Current streak from end
  let currentType: MatchResult = form[form.length - 1] ?? 'D';
  let currentCount = 0;
  for (let i = form.length - 1; i >= 0; i--) {
    if (form[i] === currentType) currentCount++;
    else break;
  }

  return {
    current:      { type: currentType, count: currentCount },
    bestWin,
    bestUnbeaten,
  };
}

// ─── Per-match stats ──────────────────────────────────────────────────────────

function buildPerMatch(records: MatchRecord[], myTeamName: string): PerMatchStat[] {
  return records.map(({ summary, events }) => {
    const isHome   = summary.home === myTeamName;
    const myTeam: 'home' | 'away' = isHome ? 'home' : 'away';
    const mine     = isHome ? summary.hs : summary.as;
    const theirs   = isHome ? summary.as : summary.hs;
    const myEvents = events.filter((e) => e.team === myTeam);
    const stats    = computeMatchStats(myEvents);
    const result: MatchResult = mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
    const shots    = isHome ? stats.homeShots : stats.awayShots;
    const goals    = isHome ? stats.homeGoals : stats.awayGoals;

    return {
      matchId:      summary.id,
      date:         summary.date,
      opponent:     isHome ? summary.away : summary.home,
      result,
      goalsFor:     mine,
      goalsAgainst: theirs,
      shots,
      efficiency:   shots === 0 ? 0 : Math.round((goals / shots) * 100),
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safe(n: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

export type { SeasonStats };
