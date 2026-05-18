/**
 * Edge Function: migrate-user
 *
 * Migra datos existentes de Handball Pro (single-tenant user_id)
 * al nuevo schema multi-tenant (org_id).
 *
 * Proceso:
 *  1. Verifica que el usuario no haya sido migrado antes (idempotente)
 *  2. Encuentra o crea una Organization para este user
 *  3. Migra teams → players → matches → match_events
 *  4. Marca al usuario como migrado
 *
 * Puede llamarse múltiples veces sin efecto duplicado (idempotencia).
 *
 * POST /functions/v1/migrate-user
 * Body: { dry_run?: boolean }  (dry_run=true simula sin escribir)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MigrationResult {
  user_id:        string;
  org_id:         string;
  dry_run:        boolean;
  already_done:   boolean;
  migrated: {
    teams:    number;
    players:  number;
    matches:  number;
    events:   number;
  };
  errors: string[];
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (authError || !user) return new Response('Unauthorized', { status: 401 });

  const body    = await req.json().catch(() => ({}));
  const dryRun  = body.dry_run === true;

  const result: MigrationResult = {
    user_id:      user.id,
    org_id:       '',
    dry_run:      dryRun,
    already_done: false,
    migrated:     { teams: 0, players: 0, matches: 0, events: 0 },
    errors:       [],
  };

  // ── Check if already migrated ─────────────────────────────────────────────
  const { data: existingMembership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  if (existingMembership) {
    result.already_done = true;
    result.org_id       = existingMembership.org_id;
    return Response.json(result);
  }

  // ── Step 1: Create organization for this user ─────────────────────────────
  const profile = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const orgName = profile.data?.display_name ?? user.email?.split('@')[0] ?? 'Mi equipo';
  const slug    = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30)
    + '-' + user.id.slice(0, 6);

  let orgId: string;

  if (!dryRun) {
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: orgName, slug, sport_type: 'handball', plan: 'free' })
      .select('id')
      .single();

    if (orgErr) {
      result.errors.push(`Failed to create org: ${orgErr.message}`);
      return Response.json(result, { status: 500 });
    }

    orgId = org.id;
    result.org_id = orgId;

    // Add as owner
    await supabase.from('org_members').insert({
      org_id: orgId, user_id: user.id, role: 'owner',
    });
  } else {
    orgId = 'dry-run-org-id';
    result.org_id = orgId;
  }

  // ── Step 2: Migrate legacy tables ─────────────────────────────────────────
  // Note: legacy Handball Pro used user_id directly on all tables.
  // We read from those tables and write to the new schema.

  // Migrate teams
  const { data: legacyTeams } = await supabase
    .from('teams')
    .select('*')
    .eq('user_id', user.id)
    .is('org_id', null);   // only unmigrated rows

  if (legacyTeams && legacyTeams.length > 0) {
    if (!dryRun) {
      const { error: teamErr } = await supabase
        .from('teams')
        .update({ org_id: orgId })
        .eq('user_id', user.id)
        .is('org_id', null);
      if (teamErr) result.errors.push(`Teams migration: ${teamErr.message}`);
    }
    result.migrated.teams = legacyTeams.length;
  }

  // Migrate players
  const { data: legacyPlayers } = await supabase
    .from('players')
    .select('id, team_id')
    .eq('user_id', user.id)
    .is('org_id', null);

  if (legacyPlayers && legacyPlayers.length > 0) {
    if (!dryRun) {
      const { error: playErr } = await supabase
        .from('players')
        .update({ org_id: orgId })
        .eq('user_id', user.id)
        .is('org_id', null);
      if (playErr) result.errors.push(`Players migration: ${playErr.message}`);
    }
    result.migrated.players = legacyPlayers.length;
  }

  // Migrate matches
  const { data: legacyMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('user_id', user.id)
    .is('org_id', null);

  if (legacyMatches && legacyMatches.length > 0) {
    if (!dryRun) {
      const { error: matchErr } = await supabase
        .from('matches')
        .update({ org_id: orgId })
        .eq('user_id', user.id)
        .is('org_id', null);
      if (matchErr) result.errors.push(`Matches migration: ${matchErr.message}`);

      // ── Step 3: Normalize JSONB events → match_events rows ──────────────
      // Legacy Handball Pro stored events as JSONB in matches.events
      const { data: matchesWithEvents } = await supabase
        .from('matches')
        .select('id, events, home_team_name, away_team_name')
        .eq('org_id', orgId)
        .not('events', 'is', null);

      let evCount = 0;
      for (const m of matchesWithEvents ?? []) {
        const legacyEvents = (m.events as any[]) ?? [];
        if (legacyEvents.length === 0) continue;

        const rows = legacyEvents.map((ev: any) => ({
          id:                ev.id ?? crypto.randomUUID(),
          match_id:          m.id,
          org_id:            orgId,
          minute:            ev.min ?? ev.minute ?? 0,
          second:            null,
          team:              ev.team ?? 'home',
          type:              ev.type ?? 'goal',
          subtype:           ev.subtype ?? null,
          detail:            ev.detail ?? null,
          qualifier:         ev.qualifier ?? null,
          zone:              ev.zone ?? null,
          goal_zone:         ev.goalZone ?? ev.goal_zone ?? null,
          situation:         ev.situation ?? null,
          throw_type:        ev.throwType ?? ev.throw_type ?? null,
          shooter_name:      ev.shooter?.name ?? null,
          shooter_number:    ev.shooter?.number ?? null,
          goalkeeper_name:   ev.goalkeeper?.name ?? null,
          goalkeeper_number: ev.goalkeeper?.number ?? null,
          sanctioned_name:   ev.sanctioned?.name ?? null,
          sanctioned_number: ev.sanctioned?.number ?? null,
          home_score:        ev.hScore ?? ev.home_score ?? 0,
          away_score:        ev.aScore ?? ev.away_score ?? 0,
          quick_mode:        ev.quickMode ?? ev.quick_mode ?? false,
          completed:         ev.completed ?? true,
          video_asset_id:    null,
          clip_start:        ev.clipStart ?? null,
          clip_end:          ev.clipEnd ?? null,
        }));

        const { error: evErr } = await supabase
          .from('match_events')
          .upsert(rows, { onConflict: 'id' });

        if (evErr) {
          result.errors.push(`Events for match ${m.id}: ${evErr.message}`);
        } else {
          evCount += rows.length;
        }
      }
      result.migrated.events = evCount;
    }
    result.migrated.matches = legacyMatches.length;
  }

  return Response.json(result);
});
