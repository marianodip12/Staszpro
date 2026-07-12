import { describe, it, expect } from 'vitest';
import { perFormation, hasFormationData } from '../formations';
import type { HandballEvent } from '../types';

const ev = (over: Partial<HandballEvent>): HandballEvent => ({
  id: Math.random().toString(36).slice(2),
  min: 0,
  team: 'home',
  type: 'goal',
  hScore: 0,
  aScore: 0,
  quickMode: false,
  completed: true,
  ...over,
});

const F = (field: number[], gk: number | null = 1) => ({ field, goalkeeper: gk });

describe('hasFormationData', () => {
  it('false cuando ningún evento tiene lineup', () => {
    expect(hasFormationData([ev({ type: 'goal' })])).toBe(false);
  });
  it('true cuando hay al menos un evento home con field cargado', () => {
    expect(hasFormationData([ev({ lineup: F([3, 4, 6]) })])).toBe(true);
  });
  it('false si el lineup tiene field vacío', () => {
    expect(hasFormationData([ev({ lineup: F([]) })])).toBe(false);
  });
});

describe('perFormation — goles a favor', () => {
  it('agrupa goles por formación (modo field)', () => {
    const events = [
      ev({ min: 1, type: 'goal', lineup: F([3, 4, 6, 7, 9, 11]) }),
      ev({ min: 2, type: 'goal', lineup: F([3, 4, 6, 7, 9, 11]) }),
      ev({ min: 3, type: 'goal', lineup: F([3, 4, 6, 7, 9, 15]) }),
    ];
    const stats = perFormation(events, 'field');
    expect(stats).toHaveLength(2);
    const first = stats.find((s) => s.key === '3-4-6-7-9-11');
    expect(first?.goalsFor).toBe(2);
  });

  it('en modo field ignora el arquero al agrupar', () => {
    const events = [
      ev({ min: 1, type: 'goal', lineup: F([3, 4, 6, 7, 9, 11], 1) }),
      ev({ min: 2, type: 'goal', lineup: F([3, 4, 6, 7, 9, 11], 12) }),
    ];
    const stats = perFormation(events, 'field');
    expect(stats).toHaveLength(1);
    expect(stats[0].goalsFor).toBe(2);
  });

  it('en modo fieldGk separa por arquero distinto', () => {
    const events = [
      ev({ min: 1, type: 'goal', lineup: F([3, 4, 6, 7, 9, 11], 1) }),
      ev({ min: 2, type: 'goal', lineup: F([3, 4, 6, 7, 9, 11], 12) }),
    ];
    const stats = perFormation(events, 'fieldGk');
    expect(stats).toHaveLength(2);
  });
});

describe('perFormation — goles recibidos', () => {
  it('imputa el gol del rival a la formación vigente de mi equipo', () => {
    const events = [
      ev({ min: 1, type: 'goal', team: 'home', lineup: F([3, 4, 6, 7, 9, 11]) }),
      ev({ min: 2, type: 'goal', team: 'away' }), // rival convierte
    ];
    const stats = perFormation(events, 'field');
    expect(stats).toHaveLength(1);
    expect(stats[0].goalsFor).toBe(1);
    expect(stats[0].goalsAgainst).toBe(1);
  });

  it('el gol recibido va a la formación más reciente, no a una vieja', () => {
    const events = [
      ev({ min: 1, type: 'goal', team: 'home', lineup: F([3, 4, 6, 7, 9, 11]) }),
      ev({ min: 5, type: 'saved', team: 'home', lineup: F([3, 4, 6, 7, 9, 15]) }), // cambio
      ev({ min: 6, type: 'goal', team: 'away' }), // rival convierte tras el cambio
    ];
    const stats = perFormation(events, 'field');
    const conTreceCinco = stats.find((s) => s.key === '3-4-6-7-9-15');
    const conOnce = stats.find((s) => s.key === '3-4-6-7-9-11');
    expect(conTreceCinco?.goalsAgainst).toBe(1);
    expect(conOnce?.goalsAgainst).toBe(0);
  });

  it('ignora goles del rival si todavía no hubo formación cargada', () => {
    const events = [
      ev({ min: 1, type: 'goal', team: 'away' }), // rival convierte sin formación previa
    ];
    expect(perFormation(events, 'field')).toHaveLength(0);
  });
});

describe('perFormation — tiros y eficacia', () => {
  it('cuenta tiros (goal/miss/saved/post) pero no turnovers', () => {
    const events = [
      ev({ min: 1, type: 'goal', lineup: F([3, 4, 6]) }),
      ev({ min: 2, type: 'miss', lineup: F([3, 4, 6]) }),
      ev({ min: 3, type: 'saved', lineup: F([3, 4, 6]) }),
      ev({ min: 4, type: 'turnover', lineup: F([3, 4, 6]) }),
    ];
    const stats = perFormation(events, 'field');
    expect(stats[0].shots).toBe(3); // goal + miss + saved
    expect(stats[0].goalsFor).toBe(1);
  });
});
