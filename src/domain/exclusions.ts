import type { HandballEvent, Team } from './types';
import type { ClockState } from './live';

/**
 * 🟨 Exclusiones — derivadas desde `liveEvents` + `liveClock`.
 *
 * Filosofía: no agrego estado persistido para "quién está excluido ahora".
 * El array de eventos ya es la fuente de verdad. Cada render, el slidebar
 * pregunta "quiénes están sancionados en este instante del clock" y renderiza.
 *
 * Consecuencias:
 *   • Auto-vuelta al expirar 2min es gratis: al avanzar el clock, la exclusión
 *     deja de estar en la lista y el jugador reaparece en el banco.
 *   • Al pausar el clock (tiempo muerto, medio tiempo), el timer también
 *     se congela — sin lógica extra.
 *   • Reload de la app reconstruye todo desde los eventos persistidos.
 *
 * Precisión: los eventos guardan `min` como entero (1..60). Aproximo el
 * inicio de la exclusión como `(min - 1) * 60` segundos absolutos.
 * Error máximo ~59s (el evento pudo haber ocurrido al final del minuto).
 * Para precisión al segundo habría que agregar `clockSeconds` al evento.
 */

export const EXCLUSION_DURATION_SEC = 120; // 2 minutos

export type ExclusionType = 'exclusion' | 'red_card';

export interface ActiveExclusion {
  playerNum: number;
  playerName: string;
  team: Team;
  type: ExclusionType;
  /** Segundos absolutos desde inicio del partido en que arrancó (aprox). */
  startAbsSec: number;
  /** Cuándo expira. `null` para roja (nunca expira dentro del partido). */
  expiresAbsSec: number | null;
  /** Cuánto le queda al clock actual. `null` para roja. */
  remainingSec: number | null;
}

/** Segundos absolutos totales del clock, sumando halves. */
export const clockToAbsSec = (clock: ClockState): number =>
  (clock.half === 2 ? 1800 : 0) + clock.seconds;

/** Instante aproximado (inicio del minuto) en que ocurrió un evento. */
export const eventStartAbsSec = (event: HandballEvent): number =>
  Math.max(0, (event.min - 1) * 60);

/**
 * Devuelve las exclusiones activas del equipo en el clock actual.
 * Un jugador aparece máximo una vez (se prioriza el evento más reciente).
 */
export function getActiveExclusions(
  events: readonly HandballEvent[],
  team: Team,
  clock: ClockState,
): ActiveExclusion[] {
  const currentAbsSec = clockToAbsSec(clock);
  const active: ActiveExclusion[] = [];
  const seen = new Set<number>();

  // De más reciente a más antiguo: el evento más nuevo gana para cada jugador
  const sortedEvents = [...events].sort((a, b) => b.min - a.min);

  for (const e of sortedEvents) {
    if (e.team !== team) continue;
    if (e.type !== 'exclusion' && e.type !== 'red_card') continue;
    if (!e.sanctioned) continue;
    const num = e.sanctioned.number;
    if (seen.has(num)) continue;
    seen.add(num);

    const startAbsSec = eventStartAbsSec(e);

    if (e.type === 'red_card') {
      active.push({
        playerNum: num,
        playerName: e.sanctioned.name,
        team,
        type: 'red_card',
        startAbsSec,
        expiresAbsSec: null,
        remainingSec: null,
      });
      continue;
    }

    // 'exclusion' — 2 minutos
    const expiresAbsSec = startAbsSec + EXCLUSION_DURATION_SEC;
    if (currentAbsSec >= expiresAbsSec) continue; // ya expiró — jugador disponible

    active.push({
      playerNum: num,
      playerName: e.sanctioned.name,
      team,
      type: 'exclusion',
      startAbsSec,
      expiresAbsSec,
      remainingSec: expiresAbsSec - currentAbsSec,
    });
  }

  return active;
}

/** Índice O(1) por número, útil en render del slidebar. */
export function indexByNumber(active: readonly ActiveExclusion[]): Map<number, ActiveExclusion> {
  const m = new Map<number, ActiveExclusion>();
  for (const ex of active) m.set(ex.playerNum, ex);
  return m;
}

/** Formatea segundos restantes como "m:ss" (p.ej. 1:23, 0:45). */
export function formatRemaining(remainingSec: number): string {
  const s = Math.max(0, Math.ceil(remainingSec));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
