'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@sportiq/ui';

export default function OrgError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error('[SportIQ] org error:', error); }, [error]);

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="No pudimos cargar esta página"
      description="Hubo un problema al traer los datos de tu organización. Reintentá en unos segundos."
    />
  );
}
