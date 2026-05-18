/**
 * apps/web — Supabase client setup.
 *
 * Single source of truth for the Supabase client in the browser.
 * Server-side (RSC) uses createServerClient from @supabase/ssr.
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

// ─── Server client factory (for RSC and Route Handlers) ───────────────────────

export { createServerClient } from '@supabase/ssr';

/**
 * Create a Supabase client for use in Next.js Server Components.
 * Usage: const supabase = await createSupabaseServer()
 */
export async function createSupabaseServer() {
  const { createServerClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll:  () => {},   // RSC can't set cookies
      },
    },
  );
}
