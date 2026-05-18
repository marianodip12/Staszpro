'use client';

/**
 * useMatchActions — acciones post-partido:
 *   - closeMatch(): PATCH status='closed' + trigger sync-analytics
 *   - shareMatch(): generar share_token
 *   - revokeShare(): eliminar share_token
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';

interface UseMatchActionsOptions {
  matchId:  string;
  orgId:    string;
  orgSlug:  string;
}

export function useMatchActions({ matchId, orgId, orgSlug }: UseMatchActionsOptions) {
  const supabase = useSupabase();
  const router   = useRouter();

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [shareUrl,  setShareUrl]  = useState<string | null>(null);

  // ── Close match ────────────────────────────────────────────────────────────
  const closeMatch = useCallback(async () => {
    setLoading(true); setError(null);

    const { error: patchErr } = await supabase
      .from('matches')
      .update({ status: 'closed' })
      .eq('id', matchId);

    if (patchErr) {
      setError(patchErr.message);
      setLoading(false);
      return;
    }

    // Trigger analytics computation (fire-and-forget, doesn't block navigation)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      fetch('/api/render/trigger', {
        // reuse the proxy pattern — could also be /api/analytics/sync
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body:    JSON.stringify({ match_id: matchId, type: 'analytics' }),
      }).catch(() => null);
    }

    setLoading(false);
    // Navigate to analysis page
    router.push(`/${orgSlug}/matches/${matchId}`);
  }, [matchId, orgSlug, supabase, router]);

  // ── Share ──────────────────────────────────────────────────────────────────
  const generateShare = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: rpcErr } = await supabase
      .rpc('generate_share_token', { p_match_id: matchId });
    setLoading(false);
    if (rpcErr) { setError(rpcErr.message); return; }
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/share/${data}`;
    setShareUrl(url);
    await navigator.clipboard.writeText(url).catch(() => null);
    return url;
  }, [matchId, supabase]);

  const revokeShare = useCallback(async () => {
    setLoading(true); setError(null);
    const { error: rpcErr } = await supabase
      .rpc('revoke_share_token', { p_match_id: matchId });
    setLoading(false);
    if (rpcErr) { setError(rpcErr.message); return; }
    setShareUrl(null);
  }, [matchId, supabase]);

  return { closeMatch, generateShare, revokeShare, shareUrl, loading, error };
}
