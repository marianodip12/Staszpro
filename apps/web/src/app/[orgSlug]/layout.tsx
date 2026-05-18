/**
 * apps/web — Org-scoped layout: /[orgSlug]/...
 *
 * This RSC layout:
 *  1. Reads orgSlug from the URL params
 *  2. Validates the current user is a member (server-side)
 *  3. Passes org + role into a client OrgContext
 *  4. Renders the app shell (sidebar, topbar, main area)
 *
 * All routes under /[orgSlug]/ are protected and org-aware.
 */

import { notFound, redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { OrgShell } from '@/components/org-shell';

interface OrgLayoutProps {
  children:  React.ReactNode;
  params:    Promise<{ orgSlug: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgSlug } = await params;
  const supabase    = await createSupabaseServer();

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch org and verify membership in a single query
  const { data: org, error } = await supabase
    .from('organizations')
    .select(`
      id, name, slug, sport_type, plan, logo_url,
      org_members!inner (role, joined_at)
    `)
    .eq('slug', orgSlug)
    .eq('org_members.user_id', user.id)
    .single();

  if (error || !org) notFound();

  const member = (org as any).org_members?.[0];
  if (!member) notFound();

  return (
    <OrgShell
      org={{
        id:         org.id,
        name:       org.name,
        slug:       org.slug,
        sport_type: org.sport_type,
        plan:       org.plan,
        logo_url:   org.logo_url,
        created_at: '',
        updated_at: '',
      }}
      role={member.role}
      userId={user.id}
    >
      {children}
    </OrgShell>
  );
}
