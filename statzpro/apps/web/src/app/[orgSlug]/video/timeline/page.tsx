/**
 * Route: /[orgSlug]/video/timeline?match=<id>&asset=<id>&t=<sec>
 * Server Component — carga video assets y renderiza TimelineEditor.
 */

import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { TimelineEditorPageClient } from '@/features/timeline-editor/timeline-editor-page';

interface TimelinePageProps {
  params:       Promise<{ orgSlug: string }>;
  searchParams: Promise<{ match?: string; asset?: string; t?: string }>;
}

export default async function TimelineEditorPage({ params, searchParams }: TimelinePageProps) {
  const { orgSlug }              = await params;
  const { match: matchId, asset: assetId, t } = await searchParams;
  const supabase                 = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations').select('id').eq('slug', orgSlug).single();
  if (!org) redirect('/dashboard');

  // Fetch video assets for this match (or all org assets if no match)
  const query = supabase
    .from('video_assets')
    .select('id, match_id, original_name, duration, status')
    .eq('org_id', org.id)
    .eq('status', 'ready');

  if (matchId) query.eq('match_id', matchId);

  const { data: assets } = await query.order('created_at', { ascending: false }).limit(10);

  // If coming from a specific event timestamp, fetch the event clip bounds
  let initialClips: Array<{ id: string; video_asset_id: string; source_start: number; source_end: number; overlays: [] }> = [];

  if (assetId && t) {
    const startSec = Math.max(0, Number(t) - 5);
    const endSec   = Number(t) + 15;
    initialClips   = [{
      id:             crypto.randomUUID(),
      video_asset_id: assetId,
      source_start:   startSec,
      source_end:     endSec,
      overlays:       [],
    }];
  }

  return (
    <TimelineEditorPageClient
      orgId={org.id}
      orgSlug={orgSlug}
      matchId={matchId ?? null}
      assets={(assets ?? []) as any}
      initialClips={initialClips}
    />
  );
}

export async function generateMetadata() {
  return { title: 'Editor de timeline' };
}
