/**
 * SYNC - Sincronización Zustand → Supabase
 *
 * Estrategia:
 *   - Auth anónima automática al iniciar.
 *   - Cuando el store cambia, se hace upsert en Supabase con el `local_id`
 *     como índice único por usuario, así no se crean duplicados.
 *   - Al iniciar también se descargan los partidos del servidor (merge).
 *
 * No rompe el localStorage existente: la app sigue funcionando sin internet.
 */

import { ensureAnonSession, isSupabaseReady, supabase } from './supabase';
import { clearClubContextSilent, clubDataOwner, getClubContext, isClubReadOnly } from './club-context';
import { seedForUser } from './seed';
import { useMatchStore } from './store';
import type { HandballEvent, HandballTeam, MatchSummary, Player } from '@/domain/types';

// ============================================================================
// STATE
// ============================================================================
let initialized = false;
let userId: string | null = null;
// 👔 Contexto de club: user_id bajo el cual se LEEN/ESCRIBEN los datos.
// Si el usuario entró a un club como invitado, es el id del dueño;
// si no, es su propio auth uid.
let dataUid: string | null = null;
let unsubscribeStore: (() => void) | null = null;

// Cache de IDs ya sincronizados (local_id → supabase UUID) para evitar duplicar
const teamCache = new Map<string, string>();
const playerCache = new Map<string, string>();
const matchCache = new Map<string, string>();
const eventCache = new Set<string>();

// ============================================================================
// TEAMS
// ============================================================================
async function syncTeam(team: HandballTeam, uid: string): Promise<string | null> {
  if (teamCache.has(team.id)) return teamCache.get(team.id) ?? null;

  try {
    // ⚠️ Antes de subir, chequear si el server ya marcó este local_id como
    // eliminado. Si sí: NO re-subir; en su lugar, sacarlo del store local.
    // Esto es lo que rompe el loop infinito de duplicados.
    const { data: existingAny } = await supabase
      .from('teams').select('id, deleted_at')
      .eq('user_id', uid).eq('local_id', team.id).maybeSingle();

    if (existingAny?.deleted_at) {
      console.log(`[sync] team ${team.name} fue eliminado server-side, purgando local`);
      const local = useMatchStore.getState();
      useMatchStore.setState({
        teams: local.teams.filter((t) => t.id !== team.id),
      });
      return null;
    }

    let dbId: string;
    if (existingAny?.id) {
      dbId = existingAny.id;
      await supabase.from('teams').update({ name: team.name, color: team.color }).eq('id', dbId);
    } else {
      const { data, error } = await supabase
        .from('teams')
        .insert({ user_id: uid, name: team.name, color: team.color, local_id: team.id })
        .select('id').single();
      if (error || !data) { console.warn('[sync] team error:', error?.message); return null; }
      dbId = data.id;
    }

    teamCache.set(team.id, dbId);
    for (const player of team.players ?? []) {
      await syncPlayer(player, dbId, uid);
    }
    return dbId;
  } catch (e) { console.warn('[sync] team:', e); return null; }
}

async function syncPlayer(player: Player, teamDbId: string, uid: string): Promise<string | null> {
  if (playerCache.has(player.id)) return playerCache.get(player.id) ?? null;

  try {
    const { data: existing } = await supabase
      .from('players').select('id, deleted_at')
      .eq('user_id', uid).eq('local_id', player.id).maybeSingle();

    // Si el server ya marcó al player como deleted, no re-subir.
    if (existing?.deleted_at) return null;

    let dbId: string;
    if (existing?.id) {
      dbId = existing.id;
      await supabase.from('players').update({
        name: player.name, number: player.number, position: player.position, team_id: teamDbId,
      }).eq('id', dbId);
    } else {
      const { data, error } = await supabase
        .from('players')
        .insert({
          user_id: uid, team_id: teamDbId,
          name: player.name, number: player.number, position: player.position, local_id: player.id,
        }).select('id').single();
      if (error || !data) { console.warn('[sync] player error:', error?.message); return null; }
      dbId = data.id;
    }

    playerCache.set(player.id, dbId);
    return dbId;
  } catch (e) { console.warn('[sync] player:', e); return null; }
}

// ============================================================================
// MATCHES + EVENTS
// ============================================================================
async function syncMatch(match: MatchSummary, uid: string): Promise<string | null> {
  if (matchCache.has(match.id)) {
    const dbId = matchCache.get(match.id);
    if (dbId) {
      // ⚠️ Aún con cache, verificar tombstone: otra pestaña/dispositivo pudo
      // haber borrado este match después de que esta pestaña lo cacheó.
      const { data: row } = await supabase
        .from('matches').select('deleted_at').eq('id', dbId).maybeSingle();
      if (row?.deleted_at) {
        matchCache.delete(match.id);
        const local = useMatchStore.getState();
        useMatchStore.setState({
          completed: local.completed.filter((m) => m.id !== match.id),
        });
        return null;
      }
      await syncEventsFor(match.events, dbId, uid);
      return dbId;
    }
  }

  try {
    const { data: existing } = await supabase
      .from('matches').select('id, deleted_at')
      .eq('user_id', uid).eq('local_id', match.id).maybeSingle();

    // ⚠️ Si el match fue marcado deleted server-side, purgarlo del store local
    // en vez de re-subirlo. Esto cierra el loop del bug original.
    if (existing?.deleted_at) {
      console.log(`[sync] match ${match.home} vs ${match.away} fue eliminado server-side, purgando local`);
      const local = useMatchStore.getState();
      useMatchStore.setState({
        completed: local.completed.filter((m) => m.id !== match.id),
      });
      return null;
    }

    let dbId: string;
    if (existing?.id) {
      dbId = existing.id;
      await supabase.from('matches').update({
        home_name: match.home, away_name: match.away,
        home_score: match.hs, away_score: match.as,
        home_color: match.homeColor, away_color: match.awayColor,
        match_date: match.date, competition: match.competition,
        status: 'finished',
      }).eq('id', dbId);
    } else {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          user_id: uid, local_id: match.id,
          home_name: match.home, away_name: match.away,
          home_score: match.hs, away_score: match.as,
          home_color: match.homeColor, away_color: match.awayColor,
          match_date: match.date, competition: match.competition,
          status: 'finished',
        }).select('id').single();
      if (error || !data) { console.warn('[sync] match error:', error?.message); return null; }
      dbId = data.id;
    }

    matchCache.set(match.id, dbId);
    await syncEventsFor(match.events, dbId, uid);
    return dbId;
  } catch (e) { console.warn('[sync] match:', e); return null; }
}

async function syncEventsFor(events: HandballEvent[], matchDbId: string, uid: string) {
  for (const ev of events) {
    if (eventCache.has(ev.id)) continue;

    try {
      const { data: existing } = await supabase
        .from('events').select('id, deleted_at')
        .eq('user_id', uid).eq('local_id', ev.id).maybeSingle();

      // ⚠️ Si el event ya existe Y fue marcado deleted server-side, no re-subir.
      // Marcamos en cache para no volver a chequearlo en este ciclo de sync.
      if (existing?.deleted_at) {
        eventCache.add(ev.id);
        continue;
      }
      if (existing?.id) { eventCache.add(ev.id); continue; }

      const { error } = await supabase.from('events').insert({
        user_id: uid, match_id: matchDbId, local_id: ev.id,
        minute: ev.min, team: ev.team, type: ev.type,
        zone: ev.zone ?? null, goal_section: ev.goalZone ?? null,
        situation: ev.situation ?? null, throw_type: ev.throwType ?? null,
        shooter_name: ev.shooter?.name ?? null, shooter_number: ev.shooter?.number ?? null,
        goalkeeper_name: ev.goalkeeper?.name ?? null, goalkeeper_number: ev.goalkeeper?.number ?? null,
        sanctioned_name: ev.sanctioned?.name ?? null, sanctioned_number: ev.sanctioned?.number ?? null,
        h_score: ev.hScore, a_score: ev.aScore,
        completed: ev.completed, quick_mode: ev.quickMode,
      });

      if (!error) eventCache.add(ev.id);
    } catch (e) { console.warn('[sync] event:', e); }
  }
}

// ============================================================================
// LIVE MATCH
// ============================================================================
async function syncLiveMatch(uid: string): Promise<void> {
  const state = useMatchStore.getState();
  if (state.status !== 'live') return;
  if (!state.liveMatch.id) return;
  if (!state.liveMatch.home || !state.liveMatch.away) return;

  const liveId: string = state.liveMatch.id;
  const homeName: string = state.liveMatch.home;
  const awayName: string = state.liveMatch.away;
  const homeColor: string = state.liveMatch.homeColor;
  const awayColor: string = state.liveMatch.awayColor;
  const matchDate: string | null = state.liveMatch.date;
  const competition: string = String(state.liveMatch.competition ?? '');

  try {
    const cached = matchCache.get(liveId);
    let dbId: string;

    if (cached) {
      dbId = cached;
    } else {
      const { data: existing } = await supabase
        .from('matches').select('id')
        .eq('user_id', uid).eq('local_id', liveId).maybeSingle();

      if (existing?.id) {
        dbId = existing.id;
      } else {
        const { data, error } = await supabase
          .from('matches')
          .insert({
            user_id: uid, local_id: liveId,
            home_name: homeName, away_name: awayName,
            home_score: 0, away_score: 0,
            home_color: homeColor, away_color: awayColor,
            match_date: matchDate, competition: competition,
            status: 'live',
          }).select('id').single();
        if (error || !data) { console.warn('[sync] live match error:', error?.message); return; }
        dbId = data.id;
      }
      matchCache.set(liveId, dbId);
    }

    const { h, a } = computeRunningScore(state.liveEvents);
    await supabase.from('matches')
      .update({ home_score: h, away_score: a, status: 'live' })
      .eq('id', dbId);

    await syncEventsFor(state.liveEvents, dbId, uid);
  } catch (e) { console.warn('[sync] live:', e); }
}

function computeRunningScore(events: HandballEvent[]): { h: number; a: number } {
  let h = 0, a = 0;
  for (const e of events) {
    if (e.type === 'goal') {
      if (e.team === 'home') h++; else a++;
    }
  }
  return { h, a };
}

// ============================================================================
// SYNC ALL
// ============================================================================
async function syncAll() {
  if (!dataUid) return;
  // 👁️ Rol solo lectura en contexto de club: jamás subir nada.
  if (isClubReadOnly()) return;
  // ⚠️ PRIMERO purgar tombstones del server. Esto corre en CADA ciclo de sync,
  // no solo al inicio: así una pestaña vieja con un match borrado en otra
  // pestaña/dispositivo lo purga de su store antes de intentar re-subirlo.
  await purgeLocalDeletedTeams(dataUid);
  await purgeLocalDeletedMatches();

  const state = useMatchStore.getState();
  for (const team of state.teams) await syncTeam(team, dataUid);
  for (const match of state.completed) await syncMatch(match, dataUid);
  await syncLiveMatch(dataUid);
}

// ============================================================================
// DOWNLOAD TEAMS
// ============================================================================
async function downloadTeamsFromServer(uid: string): Promise<void> {
  try {
    const { data: serverTeams } = await supabase
      .from('teams').select('*, players(*)')
      .eq('user_id', uid)
      .is('deleted_at', null)            // ⚠️ Soft delete: ignorar lo eliminado
      .order('created_at', { ascending: true });

    if (!serverTeams?.length) {
      // Si el server no tiene NINGÚN team activo y el local sí, purgar local.
      // Esto cubre el caso "borré todo desde Supabase, no quiero que se re-suba".
      await purgeLocalDeletedTeams(uid);
      return;
    }

    // Recolectar todos los ids locales que el server SÍ trae activos.
    // Cualquier team local cuyo id no esté acá Y que tampoco esté en el server,
    // se considera eliminado server-side y se purga del store local.
    const serverActiveLocalIds = new Set<string>();
    const byLocalId = new Map<string, any>();
    for (const t of serverTeams) {
      const lid = t.local_id ?? t.id;
      serverActiveLocalIds.add(lid);
      if (!byLocalId.has(lid)) byLocalId.set(lid, t);
      teamCache.set(lid, t.id);
    }

    await purgeLocalDeletedTeams(uid, serverActiveLocalIds);

    const local = useMatchStore.getState();
    const localTeamIds = new Set(local.teams.map((t) => t.id));
    const newTeams: HandballTeam[] = [];
    // ⚠️ Reconciliación de planteles: si el equipo ya existe localmente,
    // antes se salteaba con continue y los jugadores que estuvieran en el
    // server (ej: restauraciones o ediciones desde otro dispositivo) nunca
    // bajaban. Ahora hacemos unión por número de camiseta: entran los del
    // server que faltan localmente y se conservan los locales sin subir.
    const rosterUpdates = new Map<string, Player[]>();

    for (const [localId, t] of byLocalId) {
      const serverPlayers: Player[] = (t.players ?? [])
        .filter((p: any) => p.deleted_at == null)  // ⚠️ ignorar players eliminados
        .map((p: any): Player => {
          if (p.local_id) playerCache.set(p.local_id, p.id);
          return {
            id: p.local_id ?? p.id,
            name: p.name,
            number: p.number ?? 0,
            position: p.position ?? null,
          };
        });

      if (localTeamIds.has(localId)) {
        const lt = local.teams.find((x) => x.id === localId);
        if (lt) {
          const localNumbers = new Set(lt.players.map((p) => p.number));
          const missing = serverPlayers.filter((p) => !localNumbers.has(p.number));
          if (missing.length > 0) {
            rosterUpdates.set(localId, [...lt.players, ...missing].sort((a, b) => a.number - b.number));
          }
        }
        continue;
      }

      newTeams.push({
        id: localId,
        name: t.name,
        color: t.color ?? '#3B82F6',
        players: serverPlayers,
      });
    }

    if (newTeams.length > 0 || rosterUpdates.size > 0) {
      if (newTeams.length > 0) console.log(`[sync] descargados ${newTeams.length} equipos del servidor`);
      if (rosterUpdates.size > 0) console.log(`[sync] planteles reconciliados: ${rosterUpdates.size} equipos`);
      const current = useMatchStore.getState();
      const patchedLocal = current.teams.map((tm) =>
        rosterUpdates.has(tm.id) ? { ...tm, players: rosterUpdates.get(tm.id)! } : tm,
      );
      const merged = [...newTeams, ...patchedLocal];
      useMatchStore.setState({
        teams: merged,
        selectedTeamId: current.selectedTeamId ?? merged[0]?.id ?? null,
      });
    }
  } catch (e) { console.warn('[sync] downloadTeams:', e); }
}

/**
 * Pregunta al servidor por los local_id de teams que tienen deleted_at != null.
 * Cualquiera que aparezca, se borra del zustand local — así no se re-sube.
 * Si recibimos `serverActiveLocalIds`, también purgamos cualquier local team
 * cuyo id no esté ahí (caso "team borrado físicamente o nunca existió en server").
 *
 * Esta es la pieza clave del fix de loop de sincronización. Sin esto, el cliente
 * tenía el team en zustand, el server lo borraba/marcaba como deleted, y al
 * próximo cambio del store el sync lo re-subía.
 */
async function purgeLocalDeletedTeams(
  uid: string,
  serverActiveLocalIds?: Set<string>,
): Promise<void> {
  try {
    const { data: tombstones } = await supabase.rpc('get_deleted_team_local_ids', {
      p_owner: getClubContext()?.ownerId ?? null,
    });
    const deletedLocalIds = new Set<string>(
      (tombstones ?? []).map((row: any) => row.local_id).filter(Boolean),
    );

    if (deletedLocalIds.size === 0 && !serverActiveLocalIds) return;

    const local = useMatchStore.getState();
    const beforeCount = local.teams.length;
    const filteredTeams = local.teams.filter((t) => {
      if (deletedLocalIds.has(t.id)) return false; // tombstone explícito
      // Si tenemos lista de "activos en server" y este team no está, también lo sacamos.
      if (serverActiveLocalIds && !serverActiveLocalIds.has(t.id)) {
        // Sólo purgar si el team ya estaba sincronizado alguna vez (tiene entry en cache).
        // Si nunca se subió todavía, dejarlo para que se suba.
        if (teamCache.has(t.id)) return false;
      }
      return true;
    });

    if (filteredTeams.length !== beforeCount) {
      console.log(`[sync] purgando ${beforeCount - filteredTeams.length} equipos eliminados server-side`);
      const wipedIds = local.teams
        .filter((t) => !filteredTeams.includes(t))
        .map((t) => t.id);
      for (const id of wipedIds) teamCache.delete(id);

      useMatchStore.setState({
        teams: filteredTeams,
        selectedTeamId: filteredTeams.some((t) => t.id === local.selectedTeamId)
          ? local.selectedTeamId
          : filteredTeams[0]?.id ?? null,
      });
    }
    void uid; // no necesitamos uid acá pero lo dejamos como hint del scope
  } catch (e) {
    console.warn('[sync] purgeLocalDeletedTeams:', e);
  }
}

// ============================================================================
// DOWNLOAD LIVE MATCH
// ============================================================================
async function downloadLiveFromServer(uid: string): Promise<void> {
  try {
    const local = useMatchStore.getState();
    if (local.status === 'live') return;

    const { data: liveMaches } = await supabase
      .from('matches').select('*, events(*)')
      .eq('user_id', uid).eq('status', 'live')
      .is('deleted_at', null)            // ⚠️ ignorar matches eliminados
      .order('created_at', { ascending: false }).limit(1);

    if (!liveMaches?.length) return;

    const m = liveMaches[0];
    const localId: string = m.local_id ?? m.id;

    const events: HandballEvent[] = (m.events ?? [])
      .filter((e: any) => e.deleted_at == null)
      .map((e: any): HandballEvent => ({
      id: e.local_id ?? e.id,
      min: e.minute ?? 0,
      team: e.team,
      type: e.type,
      zone: e.zone ?? null,
      goalZone: e.goal_section ?? null,
      situation: e.situation ?? null,
      throwType: e.throw_type ?? null,
      shooter: e.shooter_name ? { name: e.shooter_name, number: e.shooter_number ?? 0 } : null,
      goalkeeper: e.goalkeeper_name ? { name: e.goalkeeper_name, number: e.goalkeeper_number ?? 0 } : null,
      sanctioned: e.sanctioned_name ? { name: e.sanctioned_name, number: e.sanctioned_number ?? 0 } : null,
      hScore: e.h_score ?? 0,
      aScore: e.a_score ?? 0,
      quickMode: e.quick_mode ?? false,
      completed: e.completed ?? true,
    }));

    matchCache.set(localId, m.id);
    for (const ev of m.events ?? []) {
      if (ev.local_id) eventCache.add(ev.local_id);
    }

    console.log(`[sync] partido en vivo recuperado del servidor: ${m.home_name} vs ${m.away_name}`);

    useMatchStore.setState({
      status: 'live',
      liveMatch: {
        id: localId,
        home: m.home_name,
        away: m.away_name,
        homeColor: m.home_color ?? '#3B82F6',
        awayColor: m.away_color ?? '#64748B',
        competition: m.competition ?? 'Liga',
        round: null,
        date: m.match_date ?? null,
      },
      liveEvents: events,
    });
  } catch (e) { console.warn('[sync] downloadLive:', e); }
}

// ============================================================================
// DOWNLOAD MATCHES
// ============================================================================
async function downloadFromServer(uid: string): Promise<void> {
  try {
    const { data: serverMatches } = await supabase
      .from('matches').select('*, events(*)')
      .eq('user_id', uid).eq('status', 'finished')
      .is('deleted_at', null)             // ⚠️ ignorar matches eliminados
      .order('created_at', { ascending: false });

    if (!serverMatches?.length) {
      await purgeLocalDeletedMatches();
      return;
    }

    const local = useMatchStore.getState();
    const localIds = new Set(local.completed.map((m) => m.id));
    const newOnes: MatchSummary[] = [];
    // ⚠️ Reconciliación: si el match ya existe localmente pero el server tiene
    // otro marcador/metadata (ej: corrección hecha en la base, o copia local
    // podrida por el viejo bug multi-tab), el server gana. Antes este caso se
    // salteaba con continue y las correcciones nunca llegaban al cliente.
    const updates = new Map<string, Partial<MatchSummary>>();

    for (const m of serverMatches) {
      const localId: string = m.local_id ?? m.id;
      if (localIds.has(localId)) {
        matchCache.set(localId, m.id);
        const activeEvents = (m.events ?? []).filter((e: any) => e.deleted_at == null);
        for (const ev of activeEvents) {
          if (ev.local_id) eventCache.add(ev.local_id);
        }
        const lm = local.completed.find((x) => x.id === localId);
        if (lm) {
          const patch: Partial<MatchSummary> = {};
          if (lm.hs !== (m.home_score ?? 0)) patch.hs = m.home_score ?? 0;
          if (lm.as !== (m.away_score ?? 0)) patch.as = m.away_score ?? 0;
          if (lm.home !== m.home_name) patch.home = m.home_name;
          if (lm.away !== m.away_name) patch.away = m.away_name;
          if ((lm.date ?? null) !== (m.match_date ?? null)) patch.date = m.match_date ?? null;
          if ((lm.competition ?? null) !== (m.competition ?? null)) patch.competition = m.competition ?? null;
          if (Object.keys(patch).length > 0) updates.set(localId, patch);
        }
        continue;
      }

      // Filtrar también eventos eliminados (ej: gol falso soft-deleted server-side).
      const events: HandballEvent[] = (m.events ?? [])
        .filter((e: any) => e.deleted_at == null)
        .map((e: any): HandballEvent => ({
        id: e.local_id ?? e.id,
        min: e.minute ?? 0,
        team: e.team,
        type: e.type,
        zone: e.zone ?? null,
        goalZone: e.goal_section ?? null,
        situation: e.situation ?? null,
        throwType: e.throw_type ?? null,
        shooter: e.shooter_name ? { name: e.shooter_name, number: e.shooter_number ?? 0 } : null,
        goalkeeper: e.goalkeeper_name ? { name: e.goalkeeper_name, number: e.goalkeeper_number ?? 0 } : null,
        sanctioned: e.sanctioned_name ? { name: e.sanctioned_name, number: e.sanctioned_number ?? 0 } : null,
        hScore: e.h_score ?? 0,
        aScore: e.a_score ?? 0,
        quickMode: e.quick_mode ?? false,
        completed: e.completed ?? true,
      }));

      newOnes.push({
        id: localId,
        home: m.home_name,
        away: m.away_name,
        hs: m.home_score ?? 0,
        as: m.away_score ?? 0,
        date: m.match_date ?? null,
        competition: m.competition ?? null,
        homeColor: m.home_color ?? '#3B82F6',
        awayColor: m.away_color ?? '#64748B',
        events,
      });

      matchCache.set(localId, m.id);
      for (const ev of m.events ?? []) {
        if (ev.local_id) eventCache.add(ev.local_id);
      }
    }

    if (newOnes.length > 0 || updates.size > 0) {
      if (newOnes.length > 0) console.log(`[sync] descargados ${newOnes.length} partidos del servidor`);
      if (updates.size > 0) console.log(`[sync] reconciliados ${updates.size} partidos con datos del servidor`);
      const current = useMatchStore.getState().completed;
      const patched = current.map((cm) => updates.has(cm.id) ? { ...cm, ...updates.get(cm.id)! } : cm);
      useMatchStore.setState({ completed: [...newOnes, ...patched] });
    }

    // Después de mergear, purgar todo lo que el server marcó como deleted.
    await purgeLocalDeletedMatches();
  } catch (e) { console.warn('[sync] download:', e); }
}

/**
 * Purga del store local los matches cuyo local_id fue marcado deleted_at en el server.
 * También limpia events deleted dentro de matches que sobreviven (caso "saqué un
 * gol falso del partido pero el partido sigue existiendo").
 *
 * Este chequeo es la otra mitad del fix del loop de sync: sin esto, el cliente
 * tenía un evento en memoria, el server lo marcaba deleted, y el próximo upsert
 * lo re-creaba.
 */
async function purgeLocalDeletedMatches(): Promise<void> {
  try {
    const { data: tombstones } = await supabase.rpc('get_deleted_match_local_ids', {
      p_owner: getClubContext()?.ownerId ?? null,
    });
    const deletedMatchLocalIds = new Set<string>(
      (tombstones ?? []).map((row: any) => row.local_id).filter(Boolean),
    );

    const local = useMatchStore.getState();

    // 1) Sacar matches enteros que el server marcó deleted
    let completed = local.completed;
    if (deletedMatchLocalIds.size > 0) {
      const before = completed.length;
      completed = completed.filter((m) => !deletedMatchLocalIds.has(m.id));
      if (completed.length !== before) {
        console.log(`[sync] purgando ${before - completed.length} partidos eliminados server-side`);
        for (const m of local.completed) {
          if (deletedMatchLocalIds.has(m.id)) matchCache.delete(m.id);
        }
      }
    }

    // 2) Re-pedir eventos al server por match restante y purgar los que ahora
    //    figuran como deleted server-side. Solo lo hacemos para matches que ya
    //    tienen cache (= están sincronizados); los nuevos se manejan al insert.
    let anyEventsChanged = false;
    const updatedCompleted: MatchSummary[] = [];
    for (const m of completed) {
      const dbId = matchCache.get(m.id);
      if (!dbId) { updatedCompleted.push(m); continue; }
      const { data: serverEvents } = await supabase
        .from('events').select('local_id, id, deleted_at')
        .eq('match_id', dbId);
      if (!serverEvents) { updatedCompleted.push(m); continue; }
      const validLocalIds = new Set(
        serverEvents.filter((e: any) => e.deleted_at == null)
          .map((e: any) => e.local_id ?? e.id),
      );
      const filteredEvents = m.events.filter((e) => validLocalIds.has(e.id));
      if (filteredEvents.length !== m.events.length) {
        anyEventsChanged = true;
        const before = m.events.length;
        console.log(`[sync] purgando ${before - filteredEvents.length} eventos eliminados en ${m.home} vs ${m.away}`);
        // Recalcular score: gol home/away contados sobre filtrados
        const hs = filteredEvents.filter((e) => e.type === 'goal' && e.team === 'home').length;
        const as = filteredEvents.filter((e) => e.type === 'goal' && e.team === 'away').length;
        updatedCompleted.push({ ...m, events: filteredEvents, hs, as });
      } else {
        updatedCompleted.push(m);
      }
    }

    if (anyEventsChanged || updatedCompleted.length !== local.completed.length) {
      useMatchStore.setState({ completed: updatedCompleted });
    }
  } catch (e) {
    console.warn('[sync] purgeLocalDeletedMatches:', e);
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================
/**
 * Descarga inicial completa para un usuario + seed si la cuenta está vacía.
 * Se usa en el boot y cada vez que cambia la sesión (login/cambio de cuenta).
 */
async function bootstrapForUser(uid: string): Promise<void> {
  useMatchStore.getState().setSyncing(true);
  try {
    await downloadTeamsFromServer(uid);
    await downloadFromServer(uid);
    await downloadLiveFromServer(uid);
    // Cuenta vacía (usuario nuevo) → equipos demo + partido demo del tutorial.
    // El flag es POR USUARIO: cada cuenta nueva recibe su demo aunque este
    // navegador ya haya sembrado para otra.
    // 👔 NUNCA sembrar demos en la cuenta de un club ajeno.
    if (!getClubContext()) seedForUser(uid, useMatchStore.getState());
  } finally {
    useMatchStore.getState().setSyncing(false);
  }
  await syncAll();
}

export async function initSync(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (!isSupabaseReady()) {
    console.warn('[sync] supabase no configurado, sync deshabilitado');
    return;
  }

  console.log('[sync] inicializando...');

  const uid = await ensureAnonSession();
  if (!uid) {
    console.warn('[sync] no hay user, sync deshabilitado');
    return;
  }
  userId = uid;
  dataUid = clubDataOwner(uid);
  console.log('[sync] user:', uid, dataUid !== uid ? `(club ctx → ${dataUid})` : '');

  await bootstrapForUser(dataUid);

  // ⚠️ FIX "inicio sesión y no veo mis partidos hasta refrescar":
  // initSync corre UNA vez al boot. Si el usuario después se loguea
  // (anónimo → cuenta real, o cambia de cuenta), nadie volvía a bajar
  // los datos del usuario nuevo. Escuchamos los cambios de sesión y
  // re-bootstrapeamos con caches y store limpios.
  supabase.auth.onAuthStateChange((event, session) => {
    const newUid = session?.user?.id ?? null;
    if (event === 'SIGNED_IN' && newUid && newUid !== userId) {
      console.log('[sync] cambio de usuario, re-bootstrap:', newUid);
      userId = newUid;
      // El contexto de club pertenece a la cuenta anterior: lo limpiamos.
      clearClubContextSilent();
      dataUid = newUid;
      // Limpiar caches y datos locales del usuario anterior para no
      // contaminar la cuenta nueva con equipos/partidos ajenos.
      teamCache.clear(); playerCache.clear(); matchCache.clear(); eventCache.clear();
      useMatchStore.getState().closeLive();
      useMatchStore.setState({ teams: [], completed: [] });
      void bootstrapForUser(newUid);
    }
    if (event === 'SIGNED_OUT') {
      userId = null;
      dataUid = null;
      clearClubContextSilent();
    }
  });

  // Subscribirse a cambios del store con debounce
  let timer: ReturnType<typeof setTimeout> | null = null;
  unsubscribeStore = useMatchStore.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      syncAll().catch((e) => console.warn('[sync] err:', e));
    }, 1500);
  });

  // ⚠️ MULTI-TAB FIX: zustand/persist solo lee localStorage al hidratar.
  // Si otra pestaña escribe (ej: borra un partido), esta pestaña seguía con
  // su estado viejo en memoria y al próximo set lo RE-ESCRIBÍA al storage,
  // resucitando el partido. Escuchamos el evento `storage` (solo dispara en
  // las OTRAS pestañas) y rehidratamos con debounce.
  if (typeof window !== 'undefined') {
    let rehydrateTimer: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener('storage', (e) => {
      if (e.key !== 'handball-pro-v11') return;
      if (rehydrateTimer) clearTimeout(rehydrateTimer);
      rehydrateTimer = setTimeout(() => {
        console.log('[sync] cambio en otra pestaña, rehidratando store');
        void useMatchStore.persist.rehydrate();
      }, 300);
    });
  }

  console.log('[sync] activado ✓');
}

export function stopSync(): void {
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
  initialized = false;
}

export function getServerMatchId(localId: string): string | null {
  return matchCache.get(localId) ?? null;
}

export function getCurrentUserId(): string | null {
  return userId;
}

/**
 * Soft-delete: marca el match como deleted_at = now() en el server vía RPC.
 * NO borra físicamente — queda guardado en BD pero el cliente lo ignora.
 * Esto es lo que el usuario pidió: "eliminar = ocultar, no perder".
 */
export async function deleteMatchFromServer(localId: string): Promise<void> {
  if (!dataUid || !isSupabaseReady()) return;
  if (isClubReadOnly()) return;

  try {
    let dbId = matchCache.get(localId);

    if (!dbId) {
      const { data } = await supabase
        .from('matches').select('id')
        .eq('user_id', dataUid).eq('local_id', localId).maybeSingle();
      if (data) dbId = data.id;
    }

    if (!dbId) {
      console.log('[sync] match not found on server, skip soft-delete:', localId);
      return;
    }

    const { error } = await supabase.rpc('soft_delete_match', { p_match_id: dbId });
    if (error) {
      console.warn('[sync] soft_delete_match RPC error:', error.message);
      return;
    }
    matchCache.delete(localId);

    console.log('[sync] soft-deleted match on server:', localId, '→', dbId);
  } catch (err) {
    console.error('[sync] soft-delete match failed:', err);
  }
}

/**
 * Soft-delete server-side de un team. Llamado por la UI cuando el usuario
 * elimina un equipo desde TeamsPage. Marca deleted_at en server + sus players.
 * El cliente ya quitó el team de zustand; esta función asegura que también
 * quede oculto server-side y NO se re-suba en el próximo sync.
 */
export async function softDeleteTeamRemote(localId: string): Promise<void> {
  if (!dataUid || !isSupabaseReady()) return;
  if (isClubReadOnly()) return;

  try {
    let dbId = teamCache.get(localId);
    if (!dbId) {
      const { data } = await supabase
        .from('teams').select('id')
        .eq('user_id', dataUid).eq('local_id', localId).maybeSingle();
      if (data) dbId = data.id;
    }
    if (!dbId) {
      console.log('[sync] team not found on server, skip soft-delete:', localId);
      return;
    }

    const { error } = await supabase.rpc('soft_delete_team', { p_team_id: dbId });
    if (error) {
      console.warn('[sync] soft_delete_team RPC error:', error.message);
      return;
    }
    teamCache.delete(localId);
    console.log('[sync] soft-deleted team on server:', localId, '→', dbId);
  } catch (err) {
    console.error('[sync] soft-delete team failed:', err);
  }
}

/** Soft-delete server-side de un evento individual (ej: borrar gol falso). */
export async function softDeleteEventRemote(eventLocalId: string): Promise<void> {
  if (!dataUid || !isSupabaseReady()) return;
  if (isClubReadOnly()) return;

  try {
    const { data } = await supabase
      .from('events').select('id')
      .eq('user_id', dataUid).eq('local_id', eventLocalId).maybeSingle();
    if (!data) return;

    const { error } = await supabase.rpc('soft_delete_event', { p_event_id: data.id });
    if (error) {
      console.warn('[sync] soft_delete_event RPC error:', error.message);
      return;
    }
    eventCache.add(eventLocalId); // marcamos en cache para que no se re-suba
    console.log('[sync] soft-deleted event on server:', eventLocalId);
  } catch (err) {
    console.error('[sync] soft-delete event failed:', err);
  }
}

/**
 * Descartar partido en vivo: soft-delete del match en el server.
 * Sin esto, closeLive() solo limpiaba el estado local y el server quedaba
 * con status='live' → downloadLiveFromServer lo resucitaba en cada carga.
 * ⚠️ Llamar ANTES de closeLive() (necesita el liveMatch.id del store).
 */
export async function discardLiveMatchRemote(): Promise<void> {
  if (!isSupabaseReady()) return;
  const state = useMatchStore.getState();
  const localId = state.liveMatch.id;
  if (!localId) return;

  try {
    if (!userId) userId = await ensureAnonSession();
    if (!userId) return;
    if (!dataUid) dataUid = clubDataOwner(userId);
    if (isClubReadOnly()) return;

    let dbId = matchCache.get(localId);
    if (!dbId) {
      const { data } = await supabase
        .from('matches').select('id')
        .eq('user_id', dataUid).eq('local_id', localId).maybeSingle();
      if (data) dbId = data.id;
    }
    if (!dbId) return; // nunca llegó a subirse, nada que borrar

    const { error } = await supabase.rpc('soft_delete_match', { p_match_id: dbId });
    if (error) { console.warn('[sync] discard live RPC error:', error.message); return; }

    matchCache.delete(localId);
    for (const ev of state.liveEvents) eventCache.add(ev.id);
    console.log('[sync] partido en vivo descartado server-side:', localId);
  } catch (err) {
    console.error('[sync] discard live failed:', err);
  }
}

/**
 * 👮 Admin: trae cualquier partido del servidor (de cualquier usuario) y lo
 * mapea a MatchSummary. Lo usa la página de análisis cuando el partido no
 * está en el store local — típicamente al tocar "Ver" en el panel admin.
 * Las policies RLS de admin (matches/events_admin_select) permiten el SELECT;
 * para usuarios no-admin esto devuelve null y no pasa nada.
 *
 * Acepta uuid del server o local_id. Prioriza uuid porque los local_id de
 * los partidos demo ("match-demo-1") se repiten entre usuarios.
 */
export async function fetchMatchAsAdmin(idParam: string): Promise<MatchSummary | null> {
  if (!isSupabaseReady()) return null;
  try {
    let row: any = null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idParam);
    if (isUuid) {
      const { data } = await supabase
        .from('matches').select('*, events(*)')
        .eq('id', idParam).is('deleted_at', null).limit(1);
      row = data?.[0] ?? null;
    }
    if (!row) {
      const { data } = await supabase
        .from('matches').select('*, events(*)')
        .eq('local_id', idParam).is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(1);
      row = data?.[0] ?? null;
    }
    if (!row) return null;

    const events: HandballEvent[] = (row.events ?? [])
      .filter((e: any) => e.deleted_at == null)
      .map((e: any): HandballEvent => ({
        id: e.local_id ?? e.id,
        min: e.minute ?? 0,
        team: e.team,
        type: e.type,
        zone: e.zone ?? null,
        goalZone: e.goal_section ?? null,
        situation: e.situation ?? null,
        throwType: e.throw_type ?? null,
        shooter: e.shooter_name ? { name: e.shooter_name, number: e.shooter_number ?? 0 } : null,
        goalkeeper: e.goalkeeper_name ? { name: e.goalkeeper_name, number: e.goalkeeper_number ?? 0 } : null,
        sanctioned: e.sanctioned_name ? { name: e.sanctioned_name, number: e.sanctioned_number ?? 0 } : null,
        hScore: e.h_score ?? 0,
        aScore: e.a_score ?? 0,
        quickMode: e.quick_mode ?? false,
        completed: e.completed ?? true,
      }));

    return {
      id: row.local_id ?? row.id,
      home: row.home_name ?? row.home_team_name ?? 'Local',
      away: row.away_name ?? row.away_team_name ?? 'Visitante',
      hs: row.home_score ?? 0,
      as: row.away_score ?? 0,
      date: row.match_date ?? null,
      competition: row.competition ?? null,
      homeColor: row.home_color ?? '#3B82F6',
      awayColor: row.away_color ?? '#64748B',
      events,
    };
  } catch (err) {
    console.warn('[sync] fetchMatchAsAdmin falló:', err);
    return null;
  }
}

export async function forceSyncNow(): Promise<void> {
  if (!userId) {
    userId = await ensureAnonSession();
  }
  if (!dataUid && userId) dataUid = clubDataOwner(userId);
  await syncAll();
}
