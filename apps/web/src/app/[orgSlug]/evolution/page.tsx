/**
 * Route: /[orgSlug]/evolution
 * Server Component — evolución de rendimiento a lo largo de la temporada.
 * Muestra progreso partido a partido, rachas, y tendencias.
 */

import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { EvolutionClient } from '@/features/season-stats/evolution-client';
import { rowToHandballEvent } from '@sportiq/core/handball';
import type { MatchEvent } from '@sportiq/core';

interface EvolutionPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function EvolutionPage({ params }: EvolutionPageProps) {
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

  const { data: season } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('org_id', org.id)
    .eq('is_active', true)
    .maybeSingle();

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, home_score, away_score, match_date, competition, home_team_color, away_team_color')
    .eq('org_id', org.id)
    .eq('status', 'closed')
    .order('match_date', { ascending: true });

  const matchIds = (matches ?? []).map((m) => m.id);

  const { data: eventRows } = matchIds.length
    ? await supabase
        .from('match_events')
        .select('*')
        .in('match_id', matchIds)
        .order('minute', { ascending: true })
    : { data: [] };

  const eventsByMatch: Record<string, ReturnType<typeof rowToHandballEvent>[]> = {};
  for (const row of (eventRows ?? [])) {
    if (!eventsByMatch[row.match_id]) eventsByMatch[row.match_id] = [];
    eventsByMatch[row.match_id]!.push(rowToHandballEvent(row as MatchEvent));
  }

  const { data: teams } = await supabase
    .from('teams').select('id, name, color').eq('org_id', org.id).order('name');

  const records = (matches ?? []).map((m) => ({
    summary: {
      id: m.id, home: m.home_team_name, away: m.away_team_name,
      hs: m.home_score, as: m.away_score, date: m.match_date,
      competition: m.competition ?? null,
      homeColor: m.home_team_color, awayColor: m.away_team_color, events: [],
    },
    events: eventsByMatch[m.id] ?? [],
  }));

  return (
    <EvolutionClient
      orgSlug={orgSlug}
      seasonName={season?.name ?? null}
      records={records}
      teams={(teams ?? []).map((t) => ({ id: t.id, name: t.name, color: t.color }))}
    />
  );
}

export async function generateMetadata({ params }: EvolutionPageProps) {
  return { title: `Evolución — ${(await params).orgSlug}` };
}
