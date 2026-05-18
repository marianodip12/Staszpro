/**
 * @sportiq/analytics — Season pipeline tests.
 */

import { describe, it, expect } from 'vitest';
import {
  computeSeasonAggregates,
  type MatchRecord,
  type MatchResult,
} from '../pipeline/season';
import type { HandballEvent, MatchSummary } from '@sportiq/core/handball';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mkEvent = (o: Partial<HandballEvent> & { id: string }): HandballEvent => ({
  min: 1, team: 'home', type: 'goal',
  zone: null, goalZone: null, situation: null, throwType: null,
  shooter: null, goalkeeper: null, sanctioned: null,
  hScore: 0, aScore: 0, quickMode: false, completed: true, ...o,
});

const mkSummary = (
  hs: number, as: number,
  home = 'Tigres', away = 'Leones',
  date = '2024-09-01',
): MatchSummary => ({
  id: crypto.randomUUID(), home, away, hs, as,
  date, competition: null, homeColor: '#3B82F6', awayColor: '#EF4444', events: [],
});

const MY_TEAM = 'Tigres';

const WIN_RECORD: MatchRecord = {
  summary: mkSummary(30, 24, MY_TEAM),
  events: [
    mkEvent({ id: 'w1', team: 'home', type: 'goal', zone: 'extreme_left',  shooter: { name: 'Ana', number: 7  }, min: 5  }),
    mkEvent({ id: 'w2', team: 'home', type: 'goal', zone: 'center_above',  shooter: { name: 'Ana', number: 7  }, min: 15 }),
    mkEvent({ id: 'w3', team: 'home', type: 'miss', zone: 'extreme_left',                                        min: 20 }),
    mkEvent({ id: 'w4', team: 'away', type: 'goal', zone: 'lateral_right', shooter: { name: 'Beto', number: 3 }, min: 25 }),
  ],
};

const LOSS_RECORD: MatchRecord = {
  summary: mkSummary(20, 28, MY_TEAM),
  events: [
    mkEvent({ id: 'l1', team: 'home', type: 'goal', zone: 'extreme_left', shooter: { name: 'Ana', number: 7 }, min: 10 }),
    mkEvent({ id: 'l2', team: 'away', type: 'goal', zone: 'lateral_left', shooter: { name: 'Rui', number: 5 }, min: 18 }),
    mkEvent({ id: 'l3', team: 'away', type: 'goal', zone: 'near_center',  shooter: { name: 'Rui', number: 5 }, min: 30 }),
  ],
};

const DRAW_RECORD: MatchRecord = {
  summary: mkSummary(25, 25, MY_TEAM),
  events: [
    mkEvent({ id: 'd1', team: 'home', type: 'goal', zone: 'extreme_left',  shooter: { name: 'Leo', number: 11 }, min: 8  }),
    mkEvent({ id: 'd2', team: 'away', type: 'goal', zone: 'extreme_right', shooter: { name: 'Carl', number: 9 }, min: 12 }),
  ],
};

const ALL_RECORDS = [WIN_RECORD, LOSS_RECORD, DRAW_RECORD];

// ─── computeSeasonAggregates ──────────────────────────────────────────────────

describe('computeSeasonAggregates', () => {
  it('returns null-safe result for empty records', () => {
    const agg = computeSeasonAggregates([], MY_TEAM);
    expect(agg.totals.played).toBe(0);
    expect(agg.topScorers).toEqual([]);
    expect(agg.form).toEqual([]);
    expect(agg.perMatch).toEqual([]);
  });

  describe('totals', () => {
    it('computes W/D/L from match summaries', () => {
      const { totals } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(totals.wins).toBe(1);
      expect(totals.losses).toBe(1);
      expect(totals.draws).toBe(1);
      expect(totals.played).toBe(3);
    });

    it('computes goals for/against', () => {
      const { totals } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(totals.goalsFor).toBe(30 + 20 + 25);
      expect(totals.goalsAgainst).toBe(24 + 28 + 25);
    });

    it('computes points (W=3, D=1, L=0)', () => {
      const { totals } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(totals.points).toBe(1 * 3 + 1 * 1);
    });
  });

  describe('form', () => {
    it('returns last 5 results (or fewer if less than 5 matches)', () => {
      const { form } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(form).toHaveLength(3);
    });

    it('form values are W, D, or L', () => {
      const { form } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      const valid: MatchResult[] = ['W', 'D', 'L'];
      expect(form.every((r) => valid.includes(r))).toBe(true);
    });

    it('reflects match results in order', () => {
      const { form } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(form[0]).toBe('W');
      expect(form[1]).toBe('L');
      expect(form[2]).toBe('D');
    });

    it('only returns last 5 when > 5 matches', () => {
      const sixRecords = [...ALL_RECORDS, WIN_RECORD, WIN_RECORD, WIN_RECORD];
      const { form } = computeSeasonAggregates(sixRecords, MY_TEAM);
      expect(form).toHaveLength(5);
    });
  });

  describe('topScorers', () => {
    it('aggregates goals across matches for the same player', () => {
      const { topScorers } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      const ana = topScorers.find((s) => s.name === 'Ana');
      expect(ana).toBeDefined();
      expect(ana!.goals).toBe(3); // 2 in WIN + 1 in LOSS
    });

    it('counts shots (goals + misses)', () => {
      const { topScorers } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      const ana = topScorers.find((s) => s.name === 'Ana');
      expect(ana!.shots).toBe(4); // 2 goals + 1 miss in WIN + 1 goal in LOSS
    });

    it('sorts by goals descending', () => {
      const { topScorers } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      for (let i = 1; i < topScorers.length; i++) {
        expect(topScorers[i - 1]!.goals).toBeGreaterThanOrEqual(topScorers[i]!.goals);
      }
    });

    it('excludes opponent shooters', () => {
      const { topScorers } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      // Beto and Rui play for 'away' team in these fixtures
      const beto = topScorers.find((s) => s.name === 'Beto');
      expect(beto).toBeUndefined();
    });

    it('counts match appearances per scorer', () => {
      const { topScorers } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      const ana = topScorers.find((s) => s.name === 'Ana');
      expect(ana!.matchCount).toBe(2); // appeared in WIN and LOSS
    });

    it('computes efficiency percentage', () => {
      const { topScorers } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      const ana = topScorers.find((s) => s.name === 'Ana');
      expect(ana!.pct).toBe(Math.round((3 / 4) * 100)); // 75
    });
  });

  describe('shotsByZone', () => {
    it('counts shots by zone (home team only)', () => {
      const { shotsByZone } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(shotsByZone['extreme_left']).toBeGreaterThan(0);
    });

    it('does not include opponent shots', () => {
      const { shotsByZone } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      // 'extreme_right' and 'lateral_right' are away zones in fixtures
      // Away shots should not appear in home shotsByZone
      expect(shotsByZone['extreme_right']).toBeUndefined();
    });
  });

  describe('conceded', () => {
    it('counts total goals conceded', () => {
      const { conceded } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      // Away goals: WIN=1 (Beto), LOSS=2 (Rui×2), DRAW=1 (Carl)
      expect(conceded.total).toBe(4);
    });

    it('returns per-match average', () => {
      const { conceded } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(conceded.perMatch).toBe(+(4 / 3).toFixed(1));
    });

    it('returns 6 minute buckets', () => {
      const { conceded } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(conceded.byMinute).toHaveLength(6);
    });

    it('sum of minute buckets equals total conceded', () => {
      const { conceded } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      const sum = conceded.byMinute.reduce((a, b) => a + b.count, 0);
      expect(sum).toBe(conceded.total);
    });
  });

  describe('streaks', () => {
    it('detects current streak', () => {
      const { streaks } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      // Last result is D, so current streak is 1 draw
      expect(streaks.current.type).toBe('D');
      expect(streaks.current.count).toBe(1);
    });

    it('computes best win streak', () => {
      const fiveWins: MatchRecord[] = Array(5).fill(WIN_RECORD);
      const { streaks } = computeSeasonAggregates(fiveWins, MY_TEAM);
      expect(streaks.bestWin).toBe(5);
    });

    it('best unbeaten includes draws', () => {
      const records: MatchRecord[] = [WIN_RECORD, DRAW_RECORD, DRAW_RECORD, LOSS_RECORD];
      const { streaks } = computeSeasonAggregates(records, MY_TEAM);
      expect(streaks.bestUnbeaten).toBe(3); // W+D+D
    });
  });

  describe('perMatch', () => {
    it('returns one entry per match', () => {
      const { perMatch } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(perMatch).toHaveLength(3);
    });

    it('includes correct result per match', () => {
      const { perMatch } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(perMatch[0]!.result).toBe('W');
      expect(perMatch[1]!.result).toBe('L');
      expect(perMatch[2]!.result).toBe('D');
    });

    it('includes opponent name', () => {
      const { perMatch } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(perMatch[0]!.opponent).toBe('Leones');
    });

    it('computes efficiency per match', () => {
      const { perMatch } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      // WIN match: home shots = 2 goals + 1 miss = 3 shots, 2 goals → 66%
      expect(perMatch[0]!.efficiency).toBe(Math.round((2 / 3) * 100));
    });
  });

  describe('avgGoals', () => {
    it('computes average goals for/against rounded to 1dp', () => {
      const { avgGoalsFor, avgGoalsAgainst } = computeSeasonAggregates(ALL_RECORDS, MY_TEAM);
      expect(avgGoalsFor).toBe(+(  (30 + 20 + 25) / 3).toFixed(1) * 1);
      expect(avgGoalsAgainst).toBe(+(24 + 28 + 25) / 3);
    });
  });
});
