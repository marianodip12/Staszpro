/**
 * @sportiq/core — Analysis domain tests.
 *
 * Ported verbatim from Handball-Pro-main/src/domain/__tests__/analysis.test.ts
 * with import paths updated to @sportiq/core.
 *
 * These tests form the regression baseline — if they pass,
 * the domain migration is considered complete.
 */

import { describe, it, expect } from 'vitest';
import {
  EMPTY_FILTER,
  applyFilter,
  summarize,
  perShooter,
  perGoalkeeper,
  perZone,
  perQuadrant,
  toggleTeam,
  toggleZone,
  toggleQuadrant,
  toggleShooter,
  setTypeOnly,
  shooterKeyOf,
  isEmptyFilter,
  activeChips,
  type MatchFilter,
  type FilterLabels,
} from '../sports/handball/analysis';
import type { HandballEvent } from '../sports/handball/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mkEvent = (
  overrides: Partial<HandballEvent> & { id: string },
): HandballEvent => ({
  min:       1,
  team:      'home',
  type:      'goal',
  zone:      null,
  goalZone:  null,
  situation: null,
  throwType: null,
  shooter:   null,
  goalkeeper:null,
  sanctioned:null,
  hScore:    0,
  aScore:    0,
  quickMode: false,
  completed: true,
  ...overrides,
});

const EVENTS: HandballEvent[] = [
  mkEvent({ id: 'e1', team: 'home', type: 'goal',    zone: 'extreme_left',  goalZone: 'tl', shooter: { name: 'Ana',  number: 7  }, min: 5  }),
  mkEvent({ id: 'e2', team: 'home', type: 'miss',    zone: 'center_above',  goalZone: 'mc', shooter: { name: 'Ana',  number: 7  }, min: 12 }),
  mkEvent({ id: 'e3', team: 'home', type: 'saved',   zone: 'lateral_left',  goalZone: 'bl', shooter: { name: 'Leo',  number: 11 }, min: 18 }),
  mkEvent({ id: 'e4', team: 'away', type: 'goal',    zone: 'extreme_right', goalZone: 'tr', shooter: { name: 'Beto', number: 3  }, min: 22 }),
  mkEvent({ id: 'e5', team: 'away', type: 'saved',   zone: 'near_center',   goalZone: 'mc', shooter: { name: 'Beto', number: 3  }, min: 28 }),
  mkEvent({ id: 'e6', team: 'home', type: 'exclusion',zone: null,            goalZone: null,  sanctioned: { name: 'Leo', number: 11 }, min: 35 }),
  mkEvent({ id: 'e7', team: 'home', type: 'goal',    zone: '7m',            goalZone: 'tc', shooter: { name: 'Ana',  number: 7  }, min: 40, hScore: 2, aScore: 1 }),
  mkEvent({ id: 'e8', team: 'away', type: 'turnover',zone: null,            goalZone: null,  min: 44 }),
];

// ─── applyFilter ──────────────────────────────────────────────────────────────

describe('applyFilter', () => {
  it('returns all events on empty filter', () => {
    expect(applyFilter(EVENTS, EMPTY_FILTER)).toHaveLength(EVENTS.length);
  });

  it('filters by team', () => {
    const f: MatchFilter = { ...EMPTY_FILTER, team: 'home' };
    const result = applyFilter(EVENTS, f);
    expect(result.every((e) => e.team === 'home')).toBe(true);
    expect(result).toHaveLength(5);
  });

  it('filters by zone', () => {
    const f: MatchFilter = { ...EMPTY_FILTER, zone: 'extreme_left' };
    expect(applyFilter(EVENTS, f)).toHaveLength(1);
    expect(applyFilter(EVENTS, f)[0]!.id).toBe('e1');
  });

  it('filters by goal quadrant', () => {
    const f: MatchFilter = { ...EMPTY_FILTER, quadrant: 'mc' };
    const result = applyFilter(EVENTS, f);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id).sort()).toEqual(['e2', 'e5']);
  });

  it('filters by shooter key', () => {
    const key = '7#Ana';
    const f: MatchFilter = { ...EMPTY_FILTER, shooterKey: key };
    expect(applyFilter(EVENTS, f)).toHaveLength(3);
  });

  it('filters by type', () => {
    const f: MatchFilter = { ...EMPTY_FILTER, types: ['goal'] };
    expect(applyFilter(EVENTS, f)).toHaveLength(3);
  });

  it('combines multiple filters (AND logic)', () => {
    const f: MatchFilter = { ...EMPTY_FILTER, team: 'home', types: ['goal'] };
    const result = applyFilter(EVENTS, f);
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.team === 'home' && e.type === 'goal')).toBe(true);
  });
});

// ─── summarize ────────────────────────────────────────────────────────────────

describe('summarize', () => {
  it('counts shots correctly', () => {
    const s = summarize(EVENTS);
    expect(s.shots).toBe(5);  // goal×3 + miss×1 + saved×2 - post×0
    expect(s.goals).toBe(3);
    expect(s.saved).toBe(2);
    expect(s.miss).toBe(1);
  });

  it('computes percentage', () => {
    const s = summarize(EVENTS);
    expect(s.pct).toBe(Math.round((3 / 5) * 100)); // 60
  });

  it('handles zero shots', () => {
    const s = summarize([mkEvent({ id: 'x1', type: 'exclusion' })]);
    expect(s.shots).toBe(0);
    expect(s.pct).toBe(0);
  });

  it('counts events correctly', () => {
    const s = summarize(EVENTS);
    expect(s.events).toBe(EVENTS.length);
  });
});

// ─── perShooter ───────────────────────────────────────────────────────────────

describe('perShooter', () => {
  it('aggregates per shooter correctly', () => {
    const shooters = perShooter(EVENTS, EMPTY_FILTER);
    const ana = shooters.find((s) => s.name === 'Ana');
    expect(ana).toBeDefined();
    expect(ana!.shots).toBe(3);
    expect(ana!.goals).toBe(2);
    expect(ana!.miss).toBe(1);
  });

  it('sorts by shots descending', () => {
    const shooters = perShooter(EVENTS, EMPTY_FILTER);
    for (let i = 1; i < shooters.length; i++) {
      expect(shooters[i - 1]!.shots).toBeGreaterThanOrEqual(shooters[i]!.shots);
    }
  });

  it('excludes events without shooter', () => {
    const shooters = perShooter(EVENTS, EMPTY_FILTER);
    expect(shooters.every((s) => s.name !== '')).toBe(true);
  });

  it('respects team filter exclusion', () => {
    const f: MatchFilter = { ...EMPTY_FILTER, team: 'away' };
    const shooters = perShooter(EVENTS, { ...EMPTY_FILTER, shooterKey: '7#Ana' });
    // shooterKey filter is excluded from perShooter's base, so all teams
    expect(shooters.find((s) => s.name === 'Ana')).toBeDefined();
  });
});

// ─── perZone / perQuadrant ────────────────────────────────────────────────────

describe('perZone', () => {
  it('counts events per zone', () => {
    const counts = perZone(EVENTS, EMPTY_FILTER);
    expect(counts['extreme_left']).toBe(1);
    expect(counts['center_above']).toBe(1);
    expect(counts['7m']).toBe(1);
  });

  it('ignores events without zone', () => {
    const counts = perZone(EVENTS, EMPTY_FILTER);
    const total = Object.values(counts).reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
    const withZone = EVENTS.filter((e) => e.zone != null).length;
    expect(total).toBe(withZone);
  });
});

describe('perQuadrant', () => {
  it('counts goal quadrants correctly', () => {
    const counts = perQuadrant(EVENTS, EMPTY_FILTER);
    expect(counts['mc']).toBe(2);
    expect(counts['tl']).toBe(1);
  });
});

// ─── Toggle helpers ───────────────────────────────────────────────────────────

describe('toggle helpers', () => {
  it('toggleTeam: selects team then clears on second click', () => {
    const f1 = toggleTeam(EMPTY_FILTER, 'home');
    expect(f1.team).toBe('home');
    const f2 = toggleTeam(f1, 'home');
    expect(f2.team).toBeNull();
  });

  it('toggleTeam: switches between teams', () => {
    const f = toggleTeam({ ...EMPTY_FILTER, team: 'home' }, 'away');
    expect(f.team).toBe('away');
  });

  it('toggleZone: sets and clears', () => {
    const f1 = toggleZone(EMPTY_FILTER, 'extreme_left');
    expect(f1.zone).toBe('extreme_left');
    expect(toggleZone(f1, 'extreme_left').zone).toBeNull();
  });

  it('toggleQuadrant: sets and clears', () => {
    const f1 = toggleQuadrant(EMPTY_FILTER, 'tl');
    expect(f1.quadrant).toBe('tl');
    expect(toggleQuadrant(f1, 'tl').quadrant).toBeNull();
  });

  it('setTypeOnly: sets and clears single type', () => {
    const f1 = setTypeOnly(EMPTY_FILTER, 'goal');
    expect(f1.types).toEqual(['goal']);
    const f2 = setTypeOnly(f1, 'goal');
    expect(f2.types).toEqual([]);
  });

  it('isEmptyFilter: detects empty', () => {
    expect(isEmptyFilter(EMPTY_FILTER)).toBe(true);
    expect(isEmptyFilter({ ...EMPTY_FILTER, team: 'home' })).toBe(false);
  });
});

// ─── shooterKeyOf ─────────────────────────────────────────────────────────────

describe('shooterKeyOf', () => {
  it('returns key from shooter', () => {
    const e = mkEvent({ id: 'x', shooter: { name: 'Test', number: 5 } });
    expect(shooterKeyOf(e)).toBe('5#Test');
  });

  it('returns null without shooter', () => {
    expect(shooterKeyOf(mkEvent({ id: 'x' }))).toBeNull();
  });
});

// ─── activeChips ──────────────────────────────────────────────────────────────

describe('activeChips', () => {
  const labels: FilterLabels = {
    zone:     (z) => `Zona:${z}`,
    quadrant: (q) => `Q:${q}`,
    team:     (t) => `Equipo:${t}`,
    shooter:  (k) => `Tirador:${k}`,
    type:     (t) => `Tipo:${t}`,
  };

  it('generates chips for active filters', () => {
    const f: MatchFilter = {
      team: 'home', zone: 'extreme_left', quadrant: null,
      shooterKey: null, types: ['goal'],
    };
    const chips = activeChips(f, labels);
    expect(chips).toHaveLength(3);
    expect(chips.map((c) => c.kind).sort()).toEqual(['team', 'type', 'zone']);
  });

  it('chip remove function clears that field', () => {
    const f: MatchFilter = { ...EMPTY_FILTER, team: 'home' };
    const chips = activeChips(f, labels);
    const updated = chips[0]!.remove(f);
    expect(updated.team).toBeNull();
  });

  it('generates no chips for empty filter', () => {
    expect(activeChips(EMPTY_FILTER, labels)).toHaveLength(0);
  });
});
