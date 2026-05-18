/**
 * apps/web — StorageProvider React context.
 *
 * The app never imports SupabaseStorageProvider directly in feature code.
 * It always calls useStorageProvider() and gets whatever is injected at the root.
 * Swapping to R2 = change one line in the provider tree.
 */

'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { SupabaseStorageProvider, type StorageProvider } from '@sportiq/media/storage';
import { getSupabaseBrowser } from '@/lib/supabase';

// ─── Context ──────────────────────────────────────────────────────────────────

const StorageContext = createContext<StorageProvider | null>(null);

interface StorageProviderProps {
  children: ReactNode;
  /**
   * Optional override — inject a custom provider (useful for tests or future R2 swap).
   * If not provided, defaults to SupabaseStorageProvider with the 'videos' bucket.
   */
  provider?: StorageProvider;
}

export function StorageProviderRoot({ children, provider }: StorageProviderProps) {
  const defaultProvider = useMemo(() => {
    if (provider) return provider;
    return new SupabaseStorageProvider(getSupabaseBrowser(), 'videos');
  }, [provider]);

  return (
    <StorageContext.Provider value={defaultProvider}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorageProvider(): StorageProvider {
  const provider = useContext(StorageContext);
  if (!provider) {
    throw new Error('[SportIQ] useStorageProvider must be used inside <StorageProviderRoot>');
  }
  return provider;
}

/**
 * Get a signed URL for any video asset — abstracts away which provider is active.
 * Always use this instead of constructing URLs manually.
 */
export async function getVideoSignedUrl(
  assetId:   string,
  expiresIn  = 900,
): Promise<string> {
  const res = await fetch('/api/storage/signed-url', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ asset_type: 'video', asset_id: assetId, expires_in: expiresIn }),
  });
  if (!res.ok) throw new Error('Failed to get video URL');
  const { signed_url } = await res.json();
  return signed_url;
}
