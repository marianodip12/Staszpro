/**
 * apps/web — Match Analysis page.
 *
 * Route: /[orgSlug]/matches/[matchId]
 *
 * Server Component: fetches match data + events server-side.
 * Passes hydrated data to client components for interactivity.
 *
 * This is the primary integration point between:
 *  - @sportiq/core (domain logic, stats)
 *  - @sportiq/media (video player, clip editor)
 */

import { notFound } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { rowToHandballEvent } from '@sportiq/core/handball';
import { MatchAnalysisClient } from '@/features/match-analysis/match-analysis-client';
import type { Match, MatchEvent } from '@sportiq/core';

interface MatchPageProps {
  params: Promise<{ orgSlug: string; matchId: string }>;
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { orgSlug, matchId } = await params;
  const supabase             = await createSupabaseServer();

  // Fetch match with org validation (RLS enforces membership)
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (matchError || !match) notFound();

  // Fetch normalized events
  const { data: eventRows } = await supabase
    .from('match_events')
    .select('*')
    .eq('match_id', matchId)
    .order('minute', { ascending: true })
    .order('created_at', { ascending: true });

  // Fetch associated video assets
  const { data: videoAssets } = await supabase
    .from('video_assets')
    .select('id, status, duration, original_name, created_at')
    .eq('match_id', matchId)
    .eq('status', 'ready');

  // Fetch cached analytics (computed by Edge Function when match closed)
  const { data: analytics } = await supabase
    .from('match_analytics')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle();

  // Map DB rows to domain objects (server-side, no client overhead)
  const events = (eventRows ?? []).map((row) =>
    rowToHandballEvent(row as MatchEvent)
  );

  return (
    <MatchAnalysisClient
      match={match as Match}
      events={events}
      videoAssets={videoAssets ?? []}
      cachedAnalytics={analytics}
      orgSlug={orgSlug}
    />
  );
}

export async function generateMetadata({ params }: MatchPageProps) {
  const { matchId } = await params;
  const supabase    = await createSupabaseServer();

  const { data: match } = await supabase
    .from('matches')
    .select('home_team_name, away_team_name, match_date')
    .eq('id', matchId)
    .single();

  if (!match) return { title: 'Match' };

  return {
    title: `${match.home_team_name} vs ${match.away_team_name}`,
  };
}
