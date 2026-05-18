/**
 * apps/web — useClipSignature hook.
 *
 * Orchestrates the full clip-to-export pipeline:
 *  1. Given (videoAssetId, start, end, overlays) → compute sig_hash
 *  2. Check if a RenderAsset already exists for this sig_hash (cache hit)
 *  3. If not → upsert ClipSignature → create RenderJob → trigger-render Edge Fn
 *  4. Poll render job status → resolve signed URL when done
 *
 * This is the core of the "no duplicate renders" guarantee.
 */

import { useState, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import { buildClipSignature, validateClipBounds } from '@sportiq/media/clip';
import type { OverlaySpec, ClipSignature, RenderAsset } from '@sportiq/media';

export type ExportStatus =
  | 'idle'
  | 'computing'    // hashing the signature
  | 'cache_hit'    // found existing render, fetching URL
  | 'creating_job' // no cache, creating render job
  | 'rendering'    // job is processing
  | 'done'
  | 'error';

interface UseClipSignatureOptions {
  orgId: string;
}

interface RequestExportParams {
  videoAssetId: string;
  startSec:     number;
  endSec:       number;
  overlays?:    OverlaySpec[];
  format?:      'mp4' | 'webm' | 'gif';
}

interface ExportResult {
  signedUrl:      string;
  expiresAt:      string;
  renderAssetId:  string;
  fromCache:      boolean;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TRIES   = 60;   // 2 min timeout

export function useClipSignature({ orgId }: UseClipSignatureOptions) {
  const supabase = useSupabase();

  const [status,       setStatus]       = useState<ExportStatus>('idle');
  const [error,        setError]        = useState<string | null>(null);
  const [clipSig,      setClipSig]      = useState<ClipSignature | null>(null);
  const [renderAsset,  setRenderAsset]  = useState<RenderAsset   | null>(null);

  const requestExport = useCallback(async (params: RequestExportParams): Promise<ExportResult | null> => {
    const { videoAssetId, startSec, endSec, overlays = [], format = 'mp4' } = params;

    setStatus('computing');
    setError(null);

    try {
      // ── Step 1: Validate clip bounds ───────────────────────────────────────
      const validation = validateClipBounds(startSec, endSec);
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      // ── Step 2: Compute sig_hash ───────────────────────────────────────────
      const crypto    = window.crypto;
      const localId   = crypto.randomUUID();
      const signature = await buildClipSignature({
        id: localId, videoAssetId, startSec, endSec, overlays,
      });

      // ── Step 3: Check cache (existing render for this exact clip) ──────────
      const { data: existingSig } = await supabase
        .from('clip_signatures')
        .select(`
          id, sig_hash, start_sec, end_sec, overlays, created_at,
          render_jobs (
            id, status,
            render_assets (id, asset_type, storage_path, created_at)
          )
        `)
        .eq('sig_hash', signature.sig_hash)
        .eq('video_asset_id', videoAssetId)
        .maybeSingle();

      if (existingSig) {
        // Check if there's a done render job with the right format
        const doneJob = (existingSig as any).render_jobs?.find(
          (j: any) => j.status === 'done' && j.render_assets?.length > 0
        );

        if (doneJob) {
          setStatus('cache_hit');
          const asset = doneJob.render_assets[0];

          // Get signed URL via Edge Function
          const { signedUrl, expiresAt } = await getSignedUrl(asset.id, 'render');

          const result: ExportResult = {
            signedUrl,
            expiresAt,
            renderAssetId: asset.id,
            fromCache:     true,
          };

          setClipSig(existingSig as unknown as ClipSignature);
          setRenderAsset(asset as RenderAsset);
          setStatus('done');
          return result;
        }

        // Sig exists but no completed render — fall through to create job
        setClipSig(existingSig as unknown as ClipSignature);

      } else {
        // ── Step 4: Upsert ClipSignature ──────────────────────────────────────
        const { data: newSig, error: sigError } = await supabase
          .from('clip_signatures')
          .upsert({
            id:             signature.id,
            video_asset_id: videoAssetId,
            sig_hash:       signature.sig_hash,
            start_sec:      signature.start_sec,
            end_sec:        signature.end_sec,
            overlays:       signature.overlays,
          }, { onConflict: 'sig_hash' })
          .select('*')
          .single();

        if (sigError) throw sigError;
        setClipSig(newSig as unknown as ClipSignature);
      }

      // ── Step 5: Create RenderJob ───────────────────────────────────────────
      setStatus('creating_job');

      const sigId = clipSig?.id ?? signature.id;
      const { data: job, error: jobError } = await supabase
        .from('render_jobs')
        .insert({
          clip_signature_id: sigId,
          org_id:            orgId,
          output_format:     format,
          status:            'pending',
        })
        .select('id')
        .single();

      if (jobError) throw jobError;

      // ── Step 6: Trigger render via Edge Function ───────────────────────────
      const session = await supabase.auth.getSession();
      const token   = session.data.session?.access_token;

      const triggerRes = await fetch('/api/render/trigger', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ render_job_id: job.id }),
      });

      if (!triggerRes.ok) throw new Error('Failed to trigger render');

      // ── Step 7: Poll for completion ────────────────────────────────────────
      setStatus('rendering');

      for (let i = 0; i < MAX_POLL_TRIES; i++) {
        await sleep(POLL_INTERVAL_MS);

        const { data: jobStatus } = await supabase
          .from('render_jobs')
          .select('status, render_assets(*)')
          .eq('id', job.id)
          .single();

        if (!jobStatus) continue;

        if (jobStatus.status === 'done') {
          const asset = (jobStatus as any).render_assets?.[0];
          if (!asset) throw new Error('Render completed but no asset found');

          const { signedUrl, expiresAt } = await getSignedUrl(asset.id, 'render');

          setRenderAsset(asset as RenderAsset);
          setStatus('done');

          return {
            signedUrl,
            expiresAt,
            renderAssetId: asset.id,
            fromCache:     false,
          };
        }

        if (jobStatus.status === 'error') {
          throw new Error('Render job failed');
        }
      }

      throw new Error('Render timed out after 2 minutes');

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setStatus('error');
      return null;
    }
  }, [orgId, supabase, clipSig]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setClipSig(null);
    setRenderAsset(null);
  }, []);

  return {
    requestExport,
    reset,
    status,
    error,
    clipSig,
    renderAsset,
    isLoading: ['computing', 'creating_job', 'rendering', 'cache_hit'].includes(status),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSignedUrl(
  assetId:   string,
  assetType: 'video' | 'render',
): Promise<{ signedUrl: string; expiresAt: string }> {
  const res = await fetch('/api/storage/signed-url', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ asset_type: assetType, asset_id: assetId }),
  });
  if (!res.ok) throw new Error('Failed to get signed URL');
  return res.json();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
