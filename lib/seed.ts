import type { HandballTeam } from '@/domain/types';
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
export const seedDefaultTeams = (store: StoreState): void => {
  if (store.teams.length > 0) return;

  try {
    if (localStorage.getItem(SEED_DONE_KEY) === '1') return;
  } catch {
    // localStorage bloqueado — preferimos no sembrar antes que arriesgar dups.
    return;
  }

  const teams: HandballTeam[] = [
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
    {
      id: 'team-demo-2',
      name: 'Rival Ejemplo',
      color: '#EF4444',
      players: [],
    },
  ];

  store.setTeams(teams);
  try { localStorage.setItem(SEED_DONE_KEY, '1'); } catch { /* noop */ }
};
