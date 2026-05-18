/**
 * Route: /[orgSlug]/stats
 * Server Component — estadísticas acumuladas de la temporada activa.
 *
 * Carga todos los partidos cerrados + sus eventos y los pasa al
 * SeasonStatsClient para render interactivo.
 */

import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { SeasonStatsClient } from '@/features/season-stats/season-stats-client';
import { rowToHandballEvent } from '@sportiq/core/handball';
import type { MatchEvent } from '@sportiq/core';

interface StatsPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function StatsPage({ params }: StatsPageProps) {
  const { orgSlug } = await params;
  const supabase    = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', orgSlug)
    .single();
  if (!org) redirect('/dashboard');

  // Active season
  const { data: season } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('org_id', org.id)
    .eq('is_active', true)
    .maybeSingle();

  // Closed matches (with events pre-loaded)
  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, home_score, away_score, match_date, competition, home_team_color, away_team_color, home_team_id')
    .eq('org_id', org.id)
    .eq('status', 'closed')
    .order('match_date', { ascending: true });

  // Fetch all events for these matches in one query
  const matchIds = (matches ?? []).map((m) => m.id);
  const { data: eventRows } = matchIds.length
    ? await supabase
        .from('match_events')
        .select('*')
        .in('match_id', matchIds)
        .order('minute', { ascending: true })
    : { data: [] };

  // Group events by match_id
  const eventsByMatch: Record<string, ReturnType<typeof rowToHandballEvent>[]> = {};
  for (const row of (eventRows ?? [])) {
    const ev = rowToHandballEvent(row as MatchEvent);
    if (!eventsByMatch[row.match_id]) eventsByMatch[row.match_id] = [];
    eventsByMatch[row.match_id]!.push(ev);
  }

  // Fetch teams for my-team picker
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, color')
    .eq('org_id', org.id)
    .order('name');

  const records = (matches ?? []).map((m) => ({
    summary: {
      id:          m.id,
      home:        m.home_team_name,
      away:        m.away_team_name,
      hs:          m.home_score,
      as:          m.away_score,
      date:        m.match_date,
      competition: m.competition ?? null,
      homeColor:   m.home_team_color,
      awayColor:   m.away_team_color,
      events:      [],
    },
    events: eventsByMatch[m.id] ?? [],
  }));

  return (
    <SeasonStatsClient
      orgSlug={orgSlug}
      orgName={org.name}
      seasonName={season?.name ?? null}
      records={records}
      teams={(teams ?? []).map((t) => ({ id: t.id, name: t.name, color: t.color }))}
    />
  );
}

export async function generateMetadata({ params }: StatsPageProps) {
  return { title: `Estadísticas — ${(await params).orgSlug}` };
}
