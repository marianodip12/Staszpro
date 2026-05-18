/**
 * @sportiq/media — Storage provider abstraction.
 *
 * Decouples the app from Supabase Storage. Can switch to R2/S3/etc
 * by changing the provider implementation, not the code that uses it.
 */

'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { SupabaseStorageProvider } from '@sportiq/media';

// ─── Context setup ────────────────────────────────────────────────────────────

const StorageContext = createContext<ReturnType<typeof SupabaseStorageProvider> | null>(null);

export function StorageProviderRoot({ children }: { children: ReactNode }) {
  const provider = useMemo(() => SupabaseStorageProvider(), []);

  return (
    <StorageContext.Provider value={provider}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorageProvider() {
  const provider = useContext(StorageContext);
  if (!provider) {
    throw new Error('[SportIQ] useStorageProvider must be used inside <StorageProviderRoot>');
  }
  return provider;
}
