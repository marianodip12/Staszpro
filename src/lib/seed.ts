import type { HandballEvent, HandballTeam, MatchSummary, Team } from '@/domain/types';
import type { useMatchStore } from './store';

type StoreState = ReturnType<typeof useMatchStore.getState>;

// Flag persistente (sobrevive el wipe del version-check) que recuerda si
// alguna vez se sembró. Esto evita que cada upgrade de versión re-cree
// los equipos demo en Supabase, lo cual venía generando duplicados.
const SEED_DONE_KEY = 'hp_seed_done_v1';

/**
 * Seeds the store con dos equipos de ejemplo SOLO en la primera carga absoluta
 * de la app (anónimo o usuario sin teams). Una vez sembrado, marcamos un flag
 * en localStorage que persiste a través de los wipes de version-check, así no
 * se re-crean los demos cuando subimos versión.
 *
 * Reglas:
 *  - Si ya hay teams en el store → no hacer nada (caso normal).
 *  - Si el flag SEED_DONE_KEY ya existe → no sembrar nunca más, aunque el
 *    store esté vacío (eso es lo que rompía: wipe + reseed + sync subía dups).
 *  - Si no hay teams Y nunca se sembró → seed + marcar flag.
 */
/**
 * Seed POR USUARIO: corre después de la descarga inicial del server.
 * Si el usuario no tiene nada (ni equipos ni partidos en el server),
 * le sembramos los equipos demo + el partido demo del tutorial.
 * Flag por uid → cada cuenta nueva recibe su demo aunque el navegador
 * ya haya sembrado para otra cuenta.
 */
export const seedForUser = (uid: string, store: StoreState): void => {
  if (store.teams.length > 0 || store.completed.length > 0) return;

  const key = `hp_seed_done_${uid}`;
  try {
    if (localStorage.getItem(key) === '1') return;
  } catch { return; }

  store.setTeams(buildDemoTeams());
  store.addCompleted(buildDemoMatch());
  try { localStorage.setItem(key, '1'); } catch { /* noop */ }
};

export const seedDefaultTeams = (store: StoreState): void => {
  if (store.teams.length > 0) return;

  try {
    if (localStorage.getItem(SEED_DONE_KEY) === '1') return;
  } catch {
    // localStorage bloqueado — preferimos no sembrar antes que arriesgar dups.
    return;
  }

  const teams: HandballTeam[] = buildDemoTeams();

  store.setTeams(teams);
  store.addCompleted(buildDemoMatch());
  try { localStorage.setItem(SEED_DONE_KEY, '1'); } catch { /* noop */ }
};

function buildDemoTeams(): HandballTeam[] {
  return [
    {
      id: 'team-demo-1',
      name: 'Mi Equipo',
      color: '#3B82F6',
      players: [
        { id: 'p-1-1', name: 'Arq Titular', number: 1,  position: 'Arquero' },
        { id: 'p-1-2', name: 'Arq Suplente', number: 12, position: 'Arquero' },
        { id: 'p-1-3', name: 'Ext. Izq',    number: 5,  position: 'Extremo Izq.' },
        { id: 'p-1-4', name: 'Lat. Izq',    number: 7,  position: 'Lateral Izq.' },
        { id: 'p-1-5', name: 'Armador',     number: 10, position: 'Armador' },
        { id: 'p-1-6', name: 'Lat. Der',    number: 8,  position: 'Lateral Der.' },
        { id: 'p-1-7', name: 'Ext. Der',    number: 11, position: 'Extremo Der.' },
        { id: 'p-1-8', name: 'Pivote',      number: 9,  position: 'Pivote' },
      ],
    },
    { id: 'team-demo-2', name: 'Rival Ejemplo', color: '#EF4444', players: [] },
  ];
}

/** Id fijo del partido demo — el tutorial navega a su análisis. */
export const DEMO_MATCH_ID = 'match-demo-1';

/**
 * Partido demo realista: Mi Equipo 26 – 22 Rival Ejemplo.
 * ~50 eventos con zonas de tiro, sectores del arco, situaciones numéricas,
 * sanciones, pérdidas y timeout, para que Análisis, Stats y el Análisis IA
 * tengan data interesante desde el primer minuto de uso.
 */
function buildDemoMatch(): MatchSummary {
  // [min, team, type, zone, goalZone, shooterIdx, situation?]
  // shooterIdx referencia jugadores de "Mi Equipo" (ver roster del seed);
  // los del rival van como refs ad-hoc.
  const P = [
    { name: 'Arq Titular', number: 1 },
    { name: 'Ext. Izq', number: 5 },
    { name: 'Lat. Izq', number: 7 },
    { name: 'Armador', number: 10 },
    { name: 'Lat. Der', number: 8 },
    { name: 'Ext. Der', number: 11 },
    { name: 'Pivote', number: 9 },
  ];
  const R = (n: number) => ({ name: `Rival #${n}`, number: n });
  const GK_HOME = P[0];
  const GK_AWAY = R(16);

  let hs = 0;
  let as = 0;
  let seq = 0;

  const ev = (
    min: number,
    team: Team,
    type: HandballEvent['type'],
    extra: Partial<HandballEvent> = {},
  ): HandballEvent => {
    if (type === 'goal') { if (team === 'home') hs++; else as++; }
    return {
      id: `demo-ev-${++seq}`,
      min, team, type,
      zone: null, goalZone: null,
      situation: 'igualdad',
      throwType: null,
      shooter: null,
      goalkeeper: team === 'home' ? GK_AWAY : GK_HOME,
      sanctioned: null,
      hScore: hs, aScore: as,
      quickMode: false, completed: true,
      ...extra,
    };
  };

  const events: HandballEvent[] = [
    // ── Primer tiempo: arranque parejo, Mi Equipo fuerte por los extremos ──
    ev(2,  'home', 'goal',  { zone: 'extreme_left',  goalZone: 'br', shooter: P[1], throwType: 'salto' }),
    ev(3,  'away', 'goal',  { zone: 'center_above',  goalZone: 'tl', shooter: R(9) }),
    ev(5,  'home', 'saved', { zone: 'lateral_right', goalZone: 'mc', shooter: P[4] }),
    ev(6,  'away', 'miss',  { zone: 'extreme_right', goalZone: 'out', shooter: R(7) }),
    ev(7,  'home', 'goal',  { zone: 'near_center',   goalZone: 'bc', shooter: P[6], throwType: 'penetracion' }),
    ev(9,  'away', 'goal',  { zone: 'lateral_left',  goalZone: 'tr', shooter: R(9) }),
    ev(10, 'home', 'goal',  { zone: 'extreme_left',  goalZone: 'bl', shooter: P[1], throwType: 'salto' }),
    ev(12, 'home', 'turnover'),
    ev(13, 'away', 'saved', { zone: 'center_above',  goalZone: 'mr', shooter: R(11) }),
    ev(14, 'home', 'goal',  { zone: '7m',            goalZone: 'tl', shooter: P[3] }),
    ev(16, 'away', 'goal',  { zone: 'near_right',    goalZone: 'br', shooter: R(13) }),
    ev(17, 'home', 'post',  { zone: 'lateral_left',  goalZone: 'post', shooter: P[2] }),
    ev(19, 'away', 'exclusion', { sanctioned: R(4) }),
    ev(20, 'home', 'goal',  { zone: 'lateral_left',  goalZone: 'tr', shooter: P[2], situation: 'superioridad', throwType: 'salto' }),
    ev(21, 'home', 'goal',  { zone: 'extreme_right', goalZone: 'bc', shooter: P[5], situation: 'superioridad' }),
    ev(23, 'away', 'goal',  { zone: 'center_above',  goalZone: 'mc', shooter: R(9) }),
    ev(24, 'home', 'saved', { zone: 'near_center',   goalZone: 'bc', shooter: P[6] }),
    ev(26, 'away', 'goal',  { zone: '7m',            goalZone: 'br', shooter: R(9) }),
    ev(27, 'home', 'goal',  { zone: 'extreme_left',  goalZone: 'br', shooter: P[1], throwType: 'finta' }),
    ev(28, 'away', 'turnover'),
    ev(29, 'home', 'goal',  { zone: 'lateral_right', goalZone: 'tl', shooter: P[4], throwType: 'salto' }),
    ev(30, 'home', 'half_time'),
    // ── Segundo tiempo: el rival aprieta, Mi Equipo cae en eficacia y lo
    //    sostiene el arquero + una racha final del armador ──
    ev(32, 'away', 'goal',  { zone: 'lateral_left',  goalZone: 'bl', shooter: R(11) }),
    ev(33, 'home', 'miss',  { zone: 'long_range',    goalZone: 'out', shooter: P[3] }),
    ev(35, 'away', 'goal',  { zone: 'near_left',     goalZone: 'bc', shooter: R(13) }),
    ev(36, 'home', 'goal',  { zone: 'near_center',   goalZone: 'br', shooter: P[6], throwType: 'penetracion' }),
    ev(38, 'home', 'exclusion', { sanctioned: P[6] }),
    ev(39, 'away', 'goal',  { zone: 'center_above',  goalZone: 'tc', shooter: R(9), situation: 'superioridad' }),
    ev(40, 'away', 'goal',  { zone: 'extreme_right', goalZone: 'bl', shooter: R(7), situation: 'superioridad' }),
    ev(41, 'home', 'goal',  { zone: 'extreme_left',  goalZone: 'bc', shooter: P[1], situation: 'inferioridad', throwType: 'salto' }),
    ev(43, 'away', 'saved', { zone: 'lateral_right', goalZone: 'ml', shooter: R(11) }),
    ev(44, 'home', 'timeout'),
    ev(45, 'home', 'goal',  { zone: 'lateral_left',  goalZone: 'tl', shooter: P[2], throwType: 'salto' }),
    ev(47, 'away', 'goal',  { zone: '7m',            goalZone: 'bl', shooter: R(9) }),
    ev(48, 'home', 'saved', { zone: 'extreme_right', goalZone: 'mc', shooter: P[5] }),
    ev(50, 'away', 'miss',  { zone: 'long_range',    goalZone: 'out', shooter: R(4) }),
    ev(51, 'home', 'goal',  { zone: 'center_above',  goalZone: 'tr', shooter: P[3], throwType: 'salto' }),
    ev(52, 'away', 'goal',  { zone: 'near_right',    goalZone: 'br', shooter: R(13) }),
    ev(53, 'home', 'goal',  { zone: 'lateral_right', goalZone: 'bl', shooter: P[4] }),
    ev(55, 'away', 'saved', { zone: 'center_above',  goalZone: 'bc', shooter: R(9) }),
    ev(56, 'home', 'goal',  { zone: '7m',            goalZone: 'br', shooter: P[3] }),
    ev(57, 'away', 'goal',  { zone: 'lateral_left',  goalZone: 'mr', shooter: R(11) }),
    ev(58, 'home', 'goal',  { zone: 'extreme_left',  goalZone: 'tl', shooter: P[1], throwType: 'salto' }),
    ev(59, 'away', 'post',  { zone: 'center_above',  goalZone: 'post', shooter: R(9) }),
    ev(60, 'home', 'goal',  { zone: 'near_center',   goalZone: 'bc', shooter: P[6], throwType: 'penetracion' }),
  ];

  return {
    id: DEMO_MATCH_ID,
    home: 'Mi Equipo',
    away: 'Rival Ejemplo',
    hs,
    as,
    date: 'Demo',
    competition: 'Amistoso',
    homeColor: '#3B82F6',
    awayColor: '#EF4444',
    events,
  };
}
