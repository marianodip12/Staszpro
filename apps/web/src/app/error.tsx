'use client';

/**
 * Root error boundary. Catches errors in the root layout subtree.
 * Next.js wraps this automatically — no provider needed.
 */

import { useEffect } from 'react';
import { ErrorFallback } from '@sportiq/ui';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console; replace with Sentry/PostHog when wired
    console.error('[SportIQ] root error:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy-950)' }}>
      <ErrorFallback error={error} reset={reset} />
    </div>
  );
}
