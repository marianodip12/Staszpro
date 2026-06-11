// ⚠️ ORDEN CRÍTICO DE IMPORTS:
// `./lib/app-version` corre `runVersionCheck()` como side-effect en su evaluación
// inicial. Tiene que ser el PRIMER import que toque algo del proyecto, porque
// si zustand (`./lib/store`) se evalúa primero, persist re-hidrata desde
// localStorage antes del wipe y los datos "sucios" sobreviven.
import './lib/app-version';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import { useMatchStore } from './lib/store';
import { seedDefaultTeams } from './lib/seed';
import { simulateMatch } from './lib/simulate';
import { initSync } from './lib/sync';
import './styles/globals.css';


// Seed: ahora corre POR USUARIO dentro de initSync, después de la descarga
// inicial (así una cuenta nueva recibe el demo aunque este navegador ya haya
// sembrado para otra). El seed global solo queda como fallback sin Supabase.
import { isSupabaseReady } from './lib/supabase';
if (!isSupabaseReady()) {
  seedDefaultTeams(useMatchStore.getState());
}

// Optional: ?demo=sim → inject a fully simulated 60' match once.
if (new URLSearchParams(location.search).get('demo') === 'sim') {
  const store = useMatchStore.getState();
  const already = store.completed.some((m) => m.id === 'demo-sim-60m');
  if (!already && store.teams.length >= 2) {
    const match = simulateMatch({
      home: store.teams[0],
      away: store.teams[1],
      date: '19/04',
      competition: 'Liga',
      seed: 42,
    });
    match.id = 'demo-sim-60m';
    // Add to completed without touching live state
    useMatchStore.setState({ completed: [match, ...store.completed] });
  }
}

// Initialize Supabase sync (anonymous auth + auto-sync of all matches/events)
// Skip on /share/ pages - those don't need user auth.
if (!location.pathname.startsWith('/share/')) {
  initSync().catch((e) => console.warn('[main] sync init error:', e));
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
