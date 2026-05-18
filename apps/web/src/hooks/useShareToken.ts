'use client';

/**
 * useShareToken — gestiona el token público de un partido.
 * Llama a las funciones RPC generate_share_token / revoke_share_token.
 */

import { useState, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase-provider';

export function useShareToken(matchId: string, initialToken: string | null = null) {
  const supabase = useSupabase();
  const [token,   setToken]   = useState<string | null>(initialToken);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .rpc('generate_share_token', { p_match_id: matchId });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setToken(data as string);
  }, [matchId, supabase]);

  const revoke = useCallback(async () => {
    setLoading(true); setError(null);
    const { error: err } = await supabase
      .rpc('revoke_share_token', { p_match_id: matchId });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setToken(null);
  }, [matchId, supabase]);

  const shareUrl = token
    ? `${process.env.NEXT_PUBLIC_APP_URL}/share/${token}`
    : null;

  const copyUrl = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
  }, [shareUrl]);

  return { token, shareUrl, loading, error, generate, revoke, copyUrl };
}
