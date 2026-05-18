/**
 * Route: /[orgSlug]/matches/[matchId]/live
 * Server Component wrapper — carga match y renderiza LiveMatchPage.
 */

import { notFound, redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { LiveMatchPage } from '@/features/live-match/live-match-page';
import type { Match } from '@sportiq/core';

interface LiveMatchRouteProps {
  params: Promise<{ orgSlug: string; matchId: string }>;
}

export default async function LiveMatchRoute({ params }: LiveMatchRouteProps) {
  const { orgSlug, matchId } = await params;
  const supabase             = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: match, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (error || !match) notFound();

  // Finished matches redirect to analysis
  if (match.status === 'closed') {
    redirect(`/${orgSlug}/matches/${matchId}`);
  }

  return <LiveMatchPage match={match as Match} orgSlug={orgSlug} />;
}

export async function generateMetadata({ params }: LiveMatchRouteProps) {
  const { matchId } = await params;
  const supabase    = await createSupabaseServer();
  const { data }    = await supabase
    .from('matches').select('home_team_name, away_team_name').eq('id', matchId).single();
  return {
    title: data ? `🔴 ${data.home_team_name} vs ${data.away_team_name}` : 'Partido en vivo',
  };
}
