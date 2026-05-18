/**
 * Edge Function: generate-signed-url
 *
 * Generates a short-lived signed URL for a video_asset or render_asset.
 * Verifies org membership before issuing the URL.
 * The client NEVER gets direct access to storage paths — always via this function.
 *
 * Request:  POST /functions/v1/generate-signed-url
 * Body:     { asset_type: 'video' | 'render'; asset_id: string; expires_in?: number }
 * Response: { signed_url: string; expires_at: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const DEFAULT_EXPIRY  = 900;   // 15 minutes for playback
const DOWNLOAD_EXPIRY = 3600;  // 1 hour for downloads

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (authError || !user) return new Response('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => null);
  const { asset_type, asset_id, expires_in, download } = body ?? {};

  if (!asset_type || !asset_id) {
    return Response.json({ error: 'asset_type and asset_id are required' }, { status: 400 });
  }

  let storagePath: string;
  let bucket: string;

  if (asset_type === 'video') {
    const { data: asset, error } = await supabase
      .from('video_assets')
      .select('storage_path, bucket, org_id')
      .eq('id', asset_id)
      .single();

    if (error || !asset) return Response.json({ error: 'Asset not found' }, { status: 404 });

    // Verify membership
    const { data: member } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', asset.org_id)
      .eq('user_id', user.id)
      .single();

    if (!member) return Response.json({ error: 'Access denied' }, { status: 403 });

    storagePath = asset.storage_path;
    bucket      = asset.bucket;

  } else if (asset_type === 'render') {
    const { data: asset, error } = await supabase
      .from('render_assets')
      .select(`
        storage_path, provider,
        render_jobs!inner (org_id)
      `)
      .eq('id', asset_id)
      .single();

    if (error || !asset) return Response.json({ error: 'Asset not found' }, { status: 404 });

    const orgId = (asset as any).render_jobs?.org_id;

    const { data: member } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (!member) return Response.json({ error: 'Access denied' }, { status: 403 });

    storagePath = asset.storage_path;
    bucket      = 'renders';

  } else {
    return Response.json({ error: 'Invalid asset_type' }, { status: 400 });
  }

  const expiresIn = expires_in ?? (download ? DOWNLOAD_EXPIRY : DEFAULT_EXPIRY);

  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn, { download: download ?? false });

  if (signedError || !signedData?.signedUrl) {
    return Response.json({ error: 'Failed to generate URL' }, { status: 500 });
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  return Response.json({
    signed_url: signedData.signedUrl,
    expires_at: expiresAt,
  });
});
