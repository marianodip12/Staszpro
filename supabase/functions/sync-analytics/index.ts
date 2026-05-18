/**
 * Edge Function: sync-analytics
 *
 * Triggered after a match closes (webhook desde DB trigger o llamada directa).
 * Computa MatchAnalytics y la persiste en la tabla match_analytics.
 *
 * Diseño:
 *  - Idempotente: usa UPSERT, puede llamarse múltiples veces sin duplicados
 *  - Corre en background: el cliente no espera su resultado
 *  - Usa service_role key: puede leer/escribir sin pasar por RLS
 *
 * Trigger: llamar después de PATCH /matches/:id { status: 'closed' }
 * POST /functions/v1/sync-analytics { match_id: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json().catch(() => ({}));
  const { match_id } = body;

  if (!match_id) {
    return Response.json({ error: 'match_id is required' }, { status: 400 });
  }

  // Fetch match
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('id, org_id, home_team_name, away_team_name, status')
    .eq('id', match_id)
    .single();

  if (matchErr || !match) {
    return Response.json({ error: 'Match not found' }, { status: 404 });
  }

  // Fetch all events
  const { data: eventRows } = await supabase
    .from('match_events')
    .select('*')
    .eq('match_id', match_id)
    .order('minute', { ascending: true });

  const events = eventRows ?? [];

  // ── Compute aggregates ────────────────────────────────────────────────────

  // Shot map (goals and shots by zone)
  const shotMap: Record<string, number>  = {};
  const goalGrid: Record<string, number> = {};
  const scorerAcc: Record<string, { name: string; number: number; goals: number }> = {};

  let homeScore = 0, awayScore = 0;
  const timelinePoints: Array<{ min: number; h: number; a: number }> = [{ min: 0, h: 0, a: 0 }];

  for (const ev of events) {
    if (ev.zone) shotMap[ev.zone] = (shotMap[ev.zone] ?? 0) + 1;
    if (ev.goal_zone) goalGrid[ev.goal_zone] = (goalGrid[ev.goal_zone] ?? 0) + 1;

    if (ev.type === 'goal') {
      if (ev.team === 'home') homeScore++;
      else                    awayScore++;
      timelinePoints.push({ min: ev.minute, h: homeScore, a: awayScore });

      if (ev.shooter_name && ev.shooter_number != null) {
        const key = `${ev.team}:${ev.shooter_name}`;
        if (!scorerAcc[key]) {
          scorerAcc[key] = { name: ev.shooter_name, number: ev.shooter_number, goals: 0 };
        }
        scorerAcc[key]!.goals++;
      }
    }
  }

  const scorerList = Object.values(scorerAcc).sort((a, b) => b.goals - a.goals);

  // Goalkeeper saves map
  const gkAcc: Record<string, { name: string; number: number; saved: number; faced: number }> = {};
  for (const ev of events) {
    if ((ev.type === 'goal' || ev.type === 'saved') && ev.goalkeeper_name && ev.goalkeeper_number != null) {
      const key = ev.goalkeeper_name;
      if (!gkAcc[key]) gkAcc[key] = { name: ev.goalkeeper_name, number: ev.goalkeeper_number, saved: 0, faced: 0 };
      gkAcc[key]!.faced++;
      if (ev.type === 'saved') gkAcc[key]!.saved++;
    }
  }

  const analytics = {
    match_id,
    org_id:       match.org_id,
    computed_at:  new Date().toISOString(),
    shot_map:     shotMap,
    goal_grid:    goalGrid,
    scorer_list:  scorerList,
    gk_map:       Object.values(gkAcc),
    timeline:     timelinePoints,
    season_totals: null,   // computed separately by season pipeline
  };

  // ── Upsert ────────────────────────────────────────────────────────────────
  const { error: upsertErr } = await supabase
    .from('match_analytics')
    .upsert(analytics, { onConflict: 'match_id' });

  if (upsertErr) {
    return Response.json({ error: upsertErr.message }, { status: 500 });
  }

  return Response.json({
    success:    true,
    match_id,
    events:     events.length,
    computed_at: analytics.computed_at,
  });
});
