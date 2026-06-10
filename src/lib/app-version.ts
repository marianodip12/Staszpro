/**
 * APP VERSION CHECK + CACHE RESET
 *
 * Problema que resuelve:
 *   La app guarda equipos/eventos en localStorage y los sube a Supabase.
 *   Cuando se limpia algo desde Supabase (duplicados, datos falsos), el
 *   cliente no se entera y los vuelve a subir en el próximo sync. Loop infinito.
 *
 * Solución:
 *   Al iniciar la app, comparamos APP_VERSION actual contra la guardada
 *   en localStorage. Si difieren (o no hay guardada), limpiamos toda la
 *   cache local de sync (zustand store, ad-hoc queues, último user id)
 *   y forzamos fetch fresco desde Supabase.
 *
 * Para forzar un reset masivo: cambiar APP_VERSION abajo.
 *
 * ⚠️ IMPORTANTE: este módulo corre `runVersionCheck()` como side-effect
 * en su evaluación inicial. Eso es a propósito — necesita correr ANTES
 * de que zustand re-hidrate el store desde localStorage. Por eso debe
 * ser el PRIMER import en main.tsx.
 */

export const APP_VERSION = 'v11.3-beta' as const;

const VERSION_KEY = 'hp_app_version';

// Todas las claves de localStorage que podrían tener datos "sucios" del cliente.
// Si agregás más persistencia, sumalas acá.
//
// ⚠️ NO incluir 'hp_seed_done_v1' ni 'hp_tutorial_completed' acá — deben
// persistir entre versiones: el seed no debe re-correr, y el tutorial solo
// se muestra automáticamente la PRIMERA vez (después es opcional desde el menú).
const CACHE_KEYS_TO_WIPE = [
  'handball-pro-v11',   // zustand store principal (teams, events, completed)
  'hp_last_user_id',    // último user id — al limpiar forzamos re-fetch
  'hp_beta_banner_dismissed', // ver banner una vez más en cada versión nueva
  'hp_sync_queue',      // legacy queue, por si en algún momento existió
  'hp_pending_events',
  'hp_pending_teams',
  'hp_pending_players',
  'hp_deleted_since',   // marker de última sync de tombstones — refetch full
] as const;

export interface VersionCheckResult {
  /** Versión que estaba guardada (null = primera vez) */
  previous: string | null;
  /** Versión actual */
  current: typeof APP_VERSION;
  /** True si hicimos wipe de cache */
  wiped: boolean;
}

/**
 * Compara la versión almacenada vs la actual. Si difieren, limpia todo lo
 * marcado en CACHE_KEYS_TO_WIPE y deja registrada la nueva versión.
 *
 * Se ejecuta una sola vez al boot, en `main.tsx`, ANTES de cargar el store
 * (lo cual implica que zustand re-hidrata vacío en este boot).
 */
export function runVersionCheck(): VersionCheckResult {
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(VERSION_KEY);
  } catch {
    // localStorage bloqueado (ej. modo incógnito muy estricto). No podemos hacer
    // mucho más — el sync seguirá funcionando contra Supabase de igual modo.
    return { previous: null, current: APP_VERSION, wiped: false };
  }

  if (previous === APP_VERSION) {
    return { previous, current: APP_VERSION, wiped: false };
  }

  // Wipe — la versión cambió (o nunca corrió este código).
  for (const key of CACHE_KEYS_TO_WIPE) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* swallow */
    }
  }
  try {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  } catch {
    /* swallow */
  }

  if (previous) {
    console.info(`[version] upgrade ${previous} → ${APP_VERSION}, cache reseteada`);
  } else {
    console.info(`[version] primera carga (${APP_VERSION}), cache inicializada`);
  }

  return { previous, current: APP_VERSION, wiped: true };
}

// Side-effect: runea al primer import del módulo. Esto es lo que garantiza
// que el wipe sucede antes de que zustand persist re-hidrate el store,
// PERO sólo si este es el primer import de toda la app. Por eso en main.tsx
// importamos este módulo como PRIMERA línea ejecutable.
export const VERSION_CHECK_RESULT: VersionCheckResult = runVersionCheck();
