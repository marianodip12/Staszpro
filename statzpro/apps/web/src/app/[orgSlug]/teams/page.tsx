/**
 * Route: /[orgSlug]/teams
 * Server Component: lista equipos + jugadores.
 */

import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { TeamsClient } from '@/features/teams/teams-client';
import type { Team, Player } from '@sportiq/core';

interface TeamsPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function TeamsPage({ params }: TeamsPageProps) {
  const { orgSlug } = await params;
  const supabase    = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single();
  if (!org) redirect('/dashboard');

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('org_id', org.id)
    .order('name');

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('org_id', org.id)
    .eq('is_active', true)
    .order('number');

  return (
    <TeamsClient
      orgId={org.id}
      orgSlug={orgSlug}
      teams={(teams ?? []) as Team[]}
      players={(players ?? []) as Player[]}
    />
  );
}

export async function generateMetadata({ params }: TeamsPageProps) {
  return { title: `Equipos — ${(await params).orgSlug}` };
}
