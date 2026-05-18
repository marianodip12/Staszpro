/**
 * Route: /share/[token]
 * Server Component — vista pública de un partido compartido.
 *
 * Accesible sin autenticación. La RLS policy permite SELECT
 * cuando share_token IS NOT NULL (ver migration 001).
 *
 * Muestra: marcador final + eventos + stats básicas.
 * NO muestra: video, editor de clips, opciones de edición.
 */

import { notFound } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { rowToHandballEvent } from '@sportiq/core/handball';
import { computeMatchStats } from '@sportiq/core/handball';
import { ShareView } from '@/features/share/share-view';
import type { MatchEvent } from '@sportiq/core';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const supabase  = await createSupabaseServer();

  // Fetch match by share_token (no auth needed — RLS allows this)
  const { data: match, error } = await supabase
    .from('matches')
    .select('*')
    .eq('share_token', token)
    .single();

  if (error || !match) notFound();

  // Fetch events
  const { data: eventRows } = await supabase
    .from('match_events')
    .select('*')
    .eq('match_id', match.id)
    .order('minute', { ascending: true });

  const events = (eventRows ?? []).map((row) => rowToHandballEvent(row as MatchEvent));
  const stats  = computeMatchStats(events);

  return (
    <ShareView
      match={match as any}
      events={events}
      stats={stats}
    />
  );
}

export async function generateMetadata({ params }: SharePageProps) {
  const { token } = await params;
  const supabase  = await createSupabaseServer();
  const { data }  = await supabase
    .from('matches')
    .select('home_team_name, away_team_name, home_score, away_score')
    .eq('share_token', token)
    .single();

  if (!data) return { title: 'Partido — SportIQ' };
  return {
    title: `${data.home_team_name} ${data.home_score}–${data.away_score} ${data.away_team_name} · SportIQ`,
    openGraph: {
      title:       `${data.home_team_name} vs ${data.away_team_name}`,
      description: `Resultado: ${data.home_score}–${data.away_score}`,
    },
  };
}
