import { describe, it, expect } from 'vitest';
import {
  perFormation,
  hasFormationData,
  compactifyStats,
  TRANSITIONAL_KEY,
} from '../formations';
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

// ═══════════════════════════════════════════════════════════════════
//   compactifyStats — garantía crítica de preservación de totales
// ═══════════════════════════════════════════════════════════════════

describe('compactifyStats', () => {
  const sumCol = <K extends string>(rows: Array<Record<K, number>>, k: K) =>
    rows.reduce((acc, r) => acc + r[k], 0);

  it('no altera la lista si hay 0 formaciones de paso', () => {
    // 3 formaciones, todas con 2+ eventos
    const events = [
      ev({ min: 1, type: 'goal', lineup: F([1, 2, 3]) }),
      ev({ min: 2, type: 'goal', lineup: F([1, 2, 3]) }),
      ev({ min: 3, type: 'goal', lineup: F([4, 5, 6]) }),
      ev({ min: 4, type: 'miss', lineup: F([4, 5, 6]) }),
    ];
    const stats = perFormation(events, 'field');
    const compact = compactifyStats(stats);
    expect(compact).toEqual(stats);
    expect(compact.find((s) => s.key === TRANSITIONAL_KEY)).toBeUndefined();
  });

  it('no crea fila sintética si solo hay 1 formación de paso', () => {
    const events = [
      ev({ min: 1, type: 'goal', lineup: F([1, 2, 3]) }),
      ev({ min: 2, type: 'goal', lineup: F([1, 2, 3]) }),
      ev({ min: 3, type: 'miss', lineup: F([7, 8, 9]) }), // única de 1 evento
    ];
    const stats = perFormation(events, 'field');
    const compact = compactifyStats(stats);
    expect(compact).toEqual(stats);
    expect(compact.find((s) => s.key === TRANSITIONAL_KEY)).toBeUndefined();
  });

  it('agrupa 2+ formaciones de paso en una fila sintética al final', () => {
    const events = [
      ev({ min: 1, type: 'goal', lineup: F([1, 2, 3]) }),
      ev({ min: 2, type: 'goal', lineup: F([1, 2, 3]) }),
      ev({ min: 3, type: 'miss', lineup: F([7, 8, 9]) }),   // 1 evento
      ev({ min: 4, type: 'saved', lineup: F([10, 11, 12]) }), // 1 evento
    ];
    const stats = perFormation(events, 'field');
    const compact = compactifyStats(stats);

    expect(compact).toHaveLength(2); // la real + la sintética
    const synth = compact[compact.length - 1];
    expect(synth.key).toBe(TRANSITIONAL_KEY);
    expect(synth.field).toEqual([]);
    expect(synth.totalEvents).toBe(2);
    expect(synth.missedShots).toBe(1);
    expect(synth.savedShots).toBe(1);
  });

  it('preserva EXACTAMENTE los totales de todas las columnas (garantía crítica)', () => {
    // Escenario denso: goles, atajadas, palos, turnovers, tiros del rival, etc.
    const events = [
      // Formación A: 3 eventos (queda)
      ev({ min: 1, type: 'goal', team: 'home', lineup: F([1, 2, 3, 4, 5, 6]) }),
      ev({ min: 2, type: 'miss', team: 'home', lineup: F([1, 2, 3, 4, 5, 6]) }),
      ev({ min: 3, type: 'goal', team: 'away' }),
      // Formación B: 2 eventos (queda)
      ev({ min: 4, type: 'saved', team: 'home', lineup: F([1, 2, 3, 4, 5, 7]) }),
      ev({ min: 5, type: 'goal', team: 'away' }),
      // Formaciones de paso (se agrupan):
      ev({ min: 6, type: 'goal', team: 'home', lineup: F([1, 2, 3, 4, 5, 8]) }),
      ev({ min: 7, type: 'turnover', team: 'home', lineup: F([1, 2, 3, 4, 5, 9]) }),
      ev({ min: 8, type: 'post', team: 'home', lineup: F([1, 2, 3, 4, 5, 10]) }),
      ev({ min: 9, type: 'saved', team: 'away' }), // atajada mía durante formación 10
      ev({ min: 10, type: 'miss', team: 'away' }), // errado del rival durante formación 10
    ];

    const stats = perFormation(events, 'field');
    const compact = compactifyStats(stats);

    // Verificar que al menos hubo compactación
    expect(compact.some((s) => s.key === TRANSITIONAL_KEY)).toBe(true);

    // Totales que DEBEN coincidir columna a columna
    const cols = [
      'goalsFor', 'missedShots', 'savedShots', 'postedShots', 'shots', 'turnovers',
      'goalsAgainst', 'saves', 'opponentMisses', 'opponentPosts', 'opponentShots',
      'totalEvents',
    ] as const;

    for (const col of cols) {
      expect(sumCol(compact, col)).toBe(sumCol(stats, col));
    }
  });

  it('la fila sintética recalcula %Ef ofensiva y defensiva correctamente', () => {
    // Construyo el escenario con lineups directos (sin depender de imputación de rival).
    // Formaciones "de paso" (1 evento total cada una) que tienen tanto tiro propio
    // como tiro del rival ya imputado — para eso hago que el evento del rival caiga
    // DESPUÉS del cambio a la siguiente formación de paso.
    const events = [
      // Formación real que queda: 2 goles propios
      ev({ min: 1, type: 'goal', team: 'home', lineup: F([1, 2, 3]) }),
      ev({ min: 2, type: 'goal', team: 'home', lineup: F([1, 2, 3]) }),
      // Formación de paso A: 1 tiro propio errado (1 evento total)
      ev({ min: 3, type: 'miss', team: 'home', lineup: F([4, 5, 6]) }),
      // Formación de paso B: 1 gol propio (1 evento home)
      // + luego el rival tira 2 veces mientras B seguía vigente → B pasa a 3 eventos.
      // Para forzar que B sea "de paso" (≤1 evento), NO le meto tiros del rival.
      ev({ min: 4, type: 'goal', team: 'home', lineup: F([7, 8, 9]) }),
      // Formación de paso C: 1 tiro atajado propio
      ev({ min: 5, type: 'saved', team: 'home', lineup: F([10, 11, 12]) }),
    ];
    const stats = perFormation(events, 'field');
    const compact = compactifyStats(stats);
    const synth = compact.find((s) => s.key === TRANSITIONAL_KEY);
    expect(synth).toBeDefined();
    // Sintético agrupa: 1 miss + 1 goal + 1 saved = 3 tiros, 1 gol
    expect(synth!.shots).toBe(3);
    expect(synth!.goalsFor).toBe(1);
    // %Ef ofensiva = 1/3
    expect(synth!.attackEfficiency).toBeCloseTo(1 / 3);
    // No hubo tiros del rival contra estas formaciones → defensiva es null
    expect(synth!.defenseEfficiency).toBeNull();
    expect(synth!.goalDiff).toBe(1);
  });
});
