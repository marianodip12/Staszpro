/**
 * apps/web — Supabase client provider (client-side only).
 *
 * React context for browser-based Supabase client.
 * Use this in Client Components.
 */

'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Browser client singleton ─────────────────────────────────────────────────

let _browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _browserClient;
}

// ─── React context ────────────────────────────────────────────────────────────

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getSupabaseBrowser(), []);
  return (
    <SupabaseContext.Provider value={client}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase(): SupabaseClient {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error('[SportIQ] useSupabase must be used inside <SupabaseProvider>');
  }
  return client;
}
