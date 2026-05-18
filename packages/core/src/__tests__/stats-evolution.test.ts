/**
 * @sportiq/core — Stats, evolution and mapper tests.
 */

import { describe, it, expect } from 'vitest';
import { computeMatchStats, buildScorers, buildHeatCounts } from '../sports/handball/stats';
import { scoreTimeline, longestRun, keyMoments, seasonTotals } from '../sports/handball/evolution';
import { stampScores, rowToHandballEvent, handballEventToRow } from '../sports/handball/mappers';
import type { HandballEvent, MatchSummary } from '../sports/handball/types';
import type { MatchEvent } from '../types/entities';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mkEvent = (overrides: Partial<HandballEvent> & { id: string }): HandballEvent => ({
  min: 1, team: 'home', type: 'goal',
  zone: null, goalZone: null, situation: null, throwType: null,
  shooter: null, goalkeeper: null, sanctioned: null,
  hScore: 0, aScore: 0, quickMode: false, completed: true,
  ...overrides,
});

const mkMatch = (hs: number, as: number, home = 'Tigres', away = 'Leones'): MatchSummary => ({
  id: crypto.randomUUID(), home, away, hs, as,
  date: '2024-09-01', competition: 'Liga A', homeColor: '#3B82F6', awayColor: '#EF4444', events: [],
});

// ─── computeMatchStats ────────────────────────────────────────────────────────

describe('computeMatchStats', () => {
  const events: HandballEvent[] = [
    mkEvent({ id: '1', team: 'home', type: 'goal'      }),
    mkEvent({ id: '2', team: 'home', type: 'goal'      }),
    mkEvent({ id: '3', team: 'home', type: 'miss'      }),
    mkEvent({ id: '4', team: 'home', type: 'saved'     }),
    mkEvent({ id: '5', team: 'away', type: 'goal'      }),
    mkEvent({ id: '6', team: 'away', type: 'saved'     }),
    mkEvent({ id: '7', team: 'home', type: 'exclusion' }),
    mkEvent({ id: '8', team: 'home', type: 'timeout'   }),
    mkEvent({ id: '9', team: 'home', type: 'turnover'  }),
  ];

  it('computes goals correctly', () => {
    const s = computeMatchStats(events);
    expect(s.homeGoals).toBe(2);
    expect(s.awayGoals).toBe(1);
  });

  it('computes shots correctly', () => {
    const s = computeMatchStats(events);
    expect(s.homeShots).toBe(4); // 2 goals + 1 miss + 1 saved
    expect(s.awayShots).toBe(2); // 1 goal + 1 saved
  });

  it('computes efficiency percentage', () => {
    const s = computeMatchStats(events);
    expect(s.homePct).toBe(50); // 2/4
    expect(s.awayPct).toBe(50); // 1/2
  });

  it('computes goalkeeper stats', () => {
    const s = computeMatchStats(events);
    // rival GK stopped home shots
    expect(s.rivalGKSaved).toBe(1);
    expect(s.rivalGKTotal).toBe(3); // home goals + home saved
  });

  it('computes exclusions and timeouts', () => {
    const s = computeMatchStats(events);
    expect(s.homeExcl).toBe(1);
    expect(s.homeTm).toBe(1);
  });
});

// ─── buildScorers ─────────────────────────────────────────────────────────────

describe('buildScorers', () => {
  const events: HandballEvent[] = [
    mkEvent({ id: '1', team: 'home', type: 'goal', shooter: { name: 'Ana',  number: 7  } }),
    mkEvent({ id: '2', team: 'home', type: 'goal', shooter: { name: 'Ana',  number: 7  } }),
    mkEvent({ id: '3', team: 'away', type: 'goal', shooter: { name: 'Beto', number: 3  } }),
    mkEvent({ id: '4', team: 'home', type: 'miss', shooter: { name: 'Ana',  number: 7  } }),
  ];

  it('counts only goals (not misses)', () => {
    const scorers = buildScorers(events);
    const ana = scorers.find((s) => s.name === 'Ana');
    expect(ana!.goals).toBe(2);
  });

  it('sorts by goals descending', () => {
    const scorers = buildScorers(events);
    expect(scorers[0]!.name).toBe('Ana');
  });

  it('ignores events without shooter', () => {
    const all = buildScorers([mkEvent({ id: 'x', type: 'goal' }), ...events]);
    expect(all.every((s) => s.name !== '')).toBe(true);
  });
});

// ─── scoreTimeline ────────────────────────────────────────────────────────────

describe('scoreTimeline', () => {
  const events: HandballEvent[] = [
    mkEvent({ id: '1', team: 'home', type: 'goal', min: 5  }),
    mkEvent({ id: '2', team: 'away', type: 'goal', min: 10 }),
    mkEvent({ id: '3', team: 'home', type: 'goal', min: 15 }),
    mkEvent({ id: '4', team: 'home', type: 'miss', min: 20 }),
  ];

  it('starts at 0-0', () => {
    const tl = scoreTimeline(events);
    expect(tl[0]).toEqual({ minute: 0, home: 0, away: 0, diff: 0 });
  });

  it('increments score at correct minute', () => {
    const tl = scoreTimeline(events);
    const at5  = tl.find((p) => p.minute === 5);
    const at10 = tl.find((p) => p.minute === 10);
    const at15 = tl.find((p) => p.minute === 15);
    expect(at5!.home).toBe(1);
    expect(at10!.away).toBe(1);
    expect(at15!.home).toBe(2);
  });

  it('does not increment on non-goal events', () => {
    const tl = scoreTimeline(events);
    const at20 = tl.find((p) => p.minute === 20);
    const at21 = tl.find((p) => p.minute === 21);
    expect(at20!.home).toBe(at21!.home);
  });

  it('covers at least 60 minutes', () => {
    const tl = scoreTimeline([]);
    expect(tl[tl.length - 1]!.minute).toBeGreaterThanOrEqual(60);
  });
});

// ─── longestRun ───────────────────────────────────────────────────────────────

describe('longestRun', () => {
  it('finds home run of 3', () => {
    const events: HandballEvent[] = [
      mkEvent({ id: '1', team: 'home', type: 'goal', min: 1 }),
      mkEvent({ id: '2', team: 'home', type: 'goal', min: 3 }),
      mkEvent({ id: '3', team: 'home', type: 'goal', min: 5 }),
      mkEvent({ id: '4', team: 'away', type: 'goal', min: 8 }),
      mkEvent({ id: '5', team: 'away', type: 'goal', min: 10 }),
    ];
    const run = longestRun(events);
    expect(run).not.toBeNull();
    expect(run!.team).toBe('home');
    expect(run!.count).toBe(3);
  });

  it('returns null for empty events', () => {
    expect(longestRun([])).toBeNull();
  });

  it('handles single goal', () => {
    const run = longestRun([mkEvent({ id: '1', type: 'goal', min: 1 })]);
    expect(run!.count).toBe(1);
  });
});

// ─── keyMoments ───────────────────────────────────────────────────────────────

describe('keyMoments', () => {
  it('returns 4 moments (15, 30, 45, 60)', () => {
    const moments = keyMoments([]);
    expect(moments).toHaveLength(4);
    expect(moments.map((m) => m.minute)).toEqual([15, 30, 45, 60]);
  });

  it('labels correctly', () => {
    const moments = keyMoments([]);
    expect(moments[1]!.label).toBe('Descanso');
    expect(moments[3]!.label).toBe('Final');
  });
});

// ─── seasonTotals ─────────────────────────────────────────────────────────────

describe('seasonTotals', () => {
  const matches: MatchSummary[] = [
    mkMatch(30, 25, 'Tigres'), // win
    mkMatch(20, 30, 'Tigres'), // loss
    mkMatch(28, 28, 'Tigres'), // draw
    mkMatch(35, 20, 'Tigres'), // win
  ];

  it('counts W/D/L correctly', () => {
    const t = seasonTotals(matches, 'Tigres');
    expect(t.wins).toBe(2);
    expect(t.losses).toBe(1);
    expect(t.draws).toBe(1);
    expect(t.played).toBe(4);
  });

  it('computes goals for/against', () => {
    const t = seasonTotals(matches, 'Tigres');
    expect(t.goalsFor).toBe(30 + 20 + 28 + 35);
    expect(t.goalsAgainst).toBe(25 + 30 + 28 + 20);
  });

  it('computes points (W=3, D=1)', () => {
    const t = seasonTotals(matches, 'Tigres');
    expect(t.points).toBe(2 * 3 + 1); // 7
  });
});

// ─── stampScores ──────────────────────────────────────────────────────────────

describe('stampScores', () => {
  it('correctly stamps scores in chronological order', () => {
    const events: HandballEvent[] = [
      mkEvent({ id: '3', team: 'home', type: 'goal', min: 15 }),
      mkEvent({ id: '1', team: 'home', type: 'goal', min: 5  }),   // intentionally out of order
      mkEvent({ id: '2', team: 'away', type: 'goal', min: 10 }),
    ];
    const stamped = stampScores(events);
    const sorted  = [...stamped].sort((a, b) => a.min - b.min);
    expect(sorted[0]!.hScore).toBe(1); // after min 5 goal
    expect(sorted[0]!.aScore).toBe(0);
    expect(sorted[1]!.hScore).toBe(1);
    expect(sorted[1]!.aScore).toBe(1); // after away goal min 10
    expect(sorted[2]!.hScore).toBe(2); // after home goal min 15
  });
});

// ─── rowToHandballEvent / handballEventToRow ──────────────────────────────────

describe('mappers', () => {
  const dbRow: MatchEvent = {
    id:                'row-id',
    match_id:          'match-id',
    org_id:            'org-id',
    minute:            25,
    second:            30,
    team:              'home',
    type:              'goal',
    subtype:           'Ataque',
    detail:            'Finalización',
    qualifier:         null,
    zone:              'extreme_left',
    goal_zone:         'tl',
    situation:         'igualdad',
    throw_type:        'salto',
    shooter_name:      'Ana López',
    shooter_number:    7,
    goalkeeper_name:   'Marcos Ruiz',
    goalkeeper_number: 1,
    sanctioned_name:   null,
    sanctioned_number: null,
    home_score:        5,
    away_score:        3,
    quick_mode:        false,
    completed:         true,
    video_asset_id:    'asset-id',
    clip_start:        45.5,
    clip_end:          62.3,
    created_at:        '2024-09-01T12:00:00Z',
  };

  it('maps DB row to domain event correctly', () => {
    const ev = rowToHandballEvent(dbRow);
    expect(ev.id).toBe('row-id');
    expect(ev.min).toBe(25);
    expect(ev.type).toBe('goal');
    expect(ev.zone).toBe('extreme_left');
    expect(ev.goalZone).toBe('tl');
    expect(ev.shooter).toEqual({ name: 'Ana López', number: 7 });
    expect(ev.goalkeeper).toEqual({ name: 'Marcos Ruiz', number: 1 });
    expect(ev.sanctioned).toBeNull();
    expect(ev.hScore).toBe(5);
    expect(ev.aScore).toBe(3);
    expect(ev.videoAssetId).toBe('asset-id');
    expect(ev.clipStart).toBe(45.5);
  });

  it('maps domain event to DB insert row', () => {
    const ev = rowToHandballEvent(dbRow);
    const row = handballEventToRow(ev, 'match-id', 'org-id');
    expect(row.match_id).toBe('match-id');
    expect(row.org_id).toBe('org-id');
    expect(row.minute).toBe(25);
    expect(row.shooter_name).toBe('Ana López');
    expect(row.shooter_number).toBe(7);
    expect(row.goalkeeper_name).toBe('Marcos Ruiz');
    expect(row.video_asset_id).toBe('asset-id');
  });

  it('handles null optional fields gracefully', () => {
    const minimal: MatchEvent = {
      ...dbRow,
      id: 'min-id',
      zone: null, goal_zone: null, situation: null, throw_type: null,
      shooter_name: null, shooter_number: null,
      goalkeeper_name: null, goalkeeper_number: null,
      sanctioned_name: null, sanctioned_number: null,
      video_asset_id: null, clip_start: null, clip_end: null,
      subtype: null, detail: null, qualifier: null, second: null,
    };
    const ev = rowToHandballEvent(minimal);
    expect(ev.zone).toBeNull();
    expect(ev.shooter).toBeNull();
    expect(ev.goalkeeper).toBeNull();
    expect(ev.videoAssetId).toBeNull();
  });

  it('round-trips without data loss', () => {
    const ev     = rowToHandballEvent(dbRow);
    const insert = handballEventToRow(ev, dbRow.match_id, dbRow.org_id);
    expect(insert.minute).toBe(dbRow.minute);
    expect(insert.type).toBe(dbRow.type);
    expect(insert.zone).toBe(dbRow.zone);
    expect(insert.clip_start).toBe(dbRow.clip_start);
    expect(insert.clip_end).toBe(dbRow.clip_end);
  });
});
