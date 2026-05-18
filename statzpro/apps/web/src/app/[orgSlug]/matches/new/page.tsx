/**
 * Route: /[orgSlug]/matches/new
 * Server Component wrapper — carga equipos y renderiza MatchForm.
 */

import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { MatchForm } from '@/features/match-form/match-form';
import type { Team } from '@sportiq/core';

interface NewMatchPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function NewMatchPage({ params }: NewMatchPageProps) {
  const { orgSlug } = await params;
  const supabase    = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations').select('id').eq('slug', orgSlug).single();
  if (!org) redirect('/dashboard');

  const { data: teams } = await supabase
    .from('teams').select('*').eq('org_id', org.id).order('name');

  return (
    <MatchForm
      orgId={org.id}
      orgSlug={orgSlug}
      teams={(teams ?? []) as Team[]}
    />
  );
}
