/**
 * Route: /[orgSlug]/settings
 *
 * Three tabs:
 *   - Perfil      → display_name, avatar (planned)
 *   - Organización → name, slug, sport_type, logo
 *   - Plan        → current plan + upgrade path
 *
 * RSC fetches the data, hands it to the client component which handles
 * editing and saving.
 */

import { notFound, redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { SettingsClient } from '@/features/settings/settings-client';
import type { Organization, OrgMemberRole, UserProfile } from '@sportiq/core';

interface SettingsPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { orgSlug } = await params;
  const supabase    = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch org + role + profile in parallel.
  const [orgRes, profileRes] = await Promise.all([
    supabase
      .from('organizations')
      .select(`
        id, name, slug, sport_type, plan, logo_url, created_at, updated_at,
        org_members!inner (role)
      `)
      .eq('slug', orgSlug)
      .eq('org_members.user_id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  if (orgRes.error || !orgRes.data) notFound();

  const role: OrgMemberRole = (orgRes.data as { org_members?: { role: OrgMemberRole }[] }).org_members?.[0]?.role ?? 'viewer';

  const org: Organization = {
    id:          orgRes.data.id,
    name:        orgRes.data.name,
    slug:        orgRes.data.slug,
    sport_type:  orgRes.data.sport_type,
    plan:        orgRes.data.plan,
    logo_url:    orgRes.data.logo_url,
    created_at:  orgRes.data.created_at,
    updated_at:  orgRes.data.updated_at,
  };

  const profile: UserProfile = profileRes.data ?? {
    id:           user.id,
    display_name: (user.user_metadata?.display_name as string | undefined) ?? null,
    avatar_url:   null,
    created_at:   user.created_at ?? new Date().toISOString(),
  };

  return (
    <SettingsClient
      org={org}
      role={role}
      profile={profile}
      userEmail={user.email ?? ''}
    />
  );
}
