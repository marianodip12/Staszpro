import { FullPageSpinner } from '@sportiq/ui';

export default function RootLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy-950)' }}>
      <FullPageSpinner label="Cargando SportIQ…" />
    </div>
  );
}
