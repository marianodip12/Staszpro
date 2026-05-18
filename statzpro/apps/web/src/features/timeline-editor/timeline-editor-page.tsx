'use client';

/**
 * TimelineEditorPageClient — resuelve signed URLs en cliente y monta el TimelineEditor.
 *
 * No podemos resolver signed URLs en el RSC porque expiran en 15 min
 * y necesitamos refresh client-side. Este componente:
 *  1. Recibe los asset records del servidor (sin URLs)
 *  2. Fetcha signed URLs via /api/storage/signed-url en el cliente
 *  3. Monta TimelineEditor con VideoSource[] completo
 */

import { useEffect, useState } from 'react';
import { TimelineEditor } from './timeline-editor';

interface AssetRecord {
  id:            string;
  match_id:      string | null;
  original_name: string | null;
  duration:      number | null;
  status:        string;
}

interface TimelineEditorPageProps {
  orgId:        string;
  orgSlug:      string;
  matchId:      string | null;
  assets:       AssetRecord[];
  initialClips: Array<{ id: string; video_asset_id: string; source_start: number; source_end: number; overlays: [] }>;
}

export function TimelineEditorPageClient({
  orgId, orgSlug, matchId, assets, initialClips,
}: TimelineEditorPageProps) {
  const [videoSources, setVideoSources] = useState<
    Array<{ assetId: string; signedUrl: string; duration: number; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (assets.length === 0) { setLoading(false); return; }

    Promise.all(
      assets.map(async (asset) => {
        const res = await fetch('/api/storage/signed-url', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ asset_type: 'video', asset_id: asset.id, expires_in: 3600 }),
        });
        if (!res.ok) throw new Error(`Failed URL for ${asset.id}`);
        const { signed_url } = await res.json();
        return {
          assetId:    asset.id,
          signedUrl:  signed_url,
          duration:   asset.duration ?? 0,
          name:       asset.original_name ?? `Video ${asset.id.slice(0, 8)}`,
        };
      }),
    )
      .then((sources) => { setVideoSources(sources); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [assets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm animate-pulse" style={{ color: 'var(--text-muted)' }}>
          Preparando editor de timeline…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--red-400)' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <TimelineEditor
      orgId={orgId}
      matchId={matchId ?? ''}
      videoSources={videoSources}
      initialClips={initialClips}
      onSave={(clips) => {
        console.log('[TimelineEditor] Timeline saved:', clips.length, 'clips');
        // Phase 4: persist to timelines table
      }}
    />
  );
}
