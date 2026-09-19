import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { useMatchStore } from '@/lib/store';
import { NewVideoProjectDialog, type NewVideoProjectValues } from '@/features/video-analysis/new-video-project-dialog';

/**
 * 🎥 Análisis con video — admin-only.
 *
 * Función principal: arrancar un análisis de video SIN cargar/trackear un
 * partido (sin reloj, sin planilla, sin "Finalizar") — se ponen los dos
 * equipos y se entra directo al editor de clips.
 *
 * Debajo, como acceso secundario, queda el listado de partidos que SÍ se
 * están trackeando en vivo ahora mismo (de cualquier usuario), por si se
 * quiere ver su análisis de estadísticas antes de que el dueño lo finalice.
 * Reutiliza admin_get_all_matches (mismo RPC que Admin → Partidos) filtrando
 * status='live' del lado del cliente — no hace falta backend nuevo.
 */
interface AdminMatch {
  match_id: string;
  local_id: string | null;
  user_email: string;
  home_name: string;
  away_name: string;
  home_score: number;
  away_score: number;
  status: string;
  match_date: string;
  competition: string;
  created_at: string;
  events_count: number;
}

export const AdminVideoAnalysisPage = () => {
  const navigate = useNavigate();
  const addCompleted = useMatchStore((s) => s.addCompleted);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewVideo, setShowNewVideo] = useState(false);

  // Crea un partido "vacío" (sin eventos, sin trackear en vivo) solo para
  // colgar el análisis de video. No pasa por live-match-page ni "Finalizar".
  const handleCreateVideoProject = (v: NewVideoProjectValues) => {
    const id = crypto.randomUUID();
    addCompleted({
      id,
      home: v.home,
      away: v.away,
      hs: 0,
      as: 0,
      date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
      competition: v.competition || null,
      homeColor: '#3B82F6',
      awayColor: '#64748B',
      events: [],
    });
    setShowNewVideo(false);
    navigate(`/app/video/${id}`);
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('is_current_user_admin');
      setIsAdmin(!error && !!data);
    })();
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_get_all_matches');
    if (error) console.error('[admin-video] loadMatches error:', error.message);
    const all = (data as AdminMatch[]) ?? [];
    setMatches(all.filter((m) => m.status === 'live'));
    setLoading(false);
  }, []);

  // Carga inicial + auto-refresco cada 20s mientras la pantalla está abierta.
  useEffect(() => {
    if (isAdmin !== true) return;
    void load();
    const iv = window.setInterval(() => { void load(); }, 20000);
    return () => window.clearInterval(iv);
  }, [isAdmin, load]);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-fg text-sm">
        Verificando permisos…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold">Acceso denegado</h1>
        <p className="text-sm text-muted-fg">No tenés permisos de administrador.</p>
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="text-sm text-primary hover:underline"
        >
          ← Volver a la app
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          🎥 Análisis con video
        </h1>
        <p className="text-xs text-muted-fg mt-1">
          Analizá un partido a partir del video, sin cargar estadísticas en vivo.
        </p>
      </header>

      {/* Acción principal: arrancar un análisis de video */}
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-6 text-center space-y-3">
        <div className="text-3xl">🎥</div>
        <div>
          <div className="text-base font-semibold">Nuevo análisis de video</div>
          <p className="text-xs text-muted-fg mt-1 max-w-md mx-auto">
            Sin reloj, sin planilla, sin "Finalizar". Poné los dos equipos y entrás
            directo al editor: subís el video (o pegás un link de YouTube) y marcás
            jugadas, jugadores y clips.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewVideo(true)}
          className="h-10 px-5 rounded-md border border-primary/40 bg-primary/15 text-primary text-sm font-semibold hover:bg-primary/25 transition-colors"
        >
          + Nuevo análisis de video
        </button>
      </div>

      <NewVideoProjectDialog
        open={showNewVideo}
        onClose={() => setShowNewVideo(false)}
        onCreate={handleCreateVideoProject}
      />

      {/* Secundario: partidos que se están trackeando en vivo (estadísticas) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-muted-fg uppercase tracking-wide">
            Partidos en vivo (estadísticas)
          </h2>
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase',
            matches.length > 0 ? 'text-danger border-danger/40 bg-danger/10' : 'text-muted-fg border-border',
          )}>
            {matches.length} en vivo
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-fg">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin mr-2" />
            Cargando…
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-fg">
            No hay ningún partido trackeándose en vivo en este momento.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {matches.map((m) => (
              <div
                key={m.match_id}
                className="rounded-xl border border-danger/30 bg-surface p-4 space-y-2"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-danger animate-pulse-live" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-danger">En vivo</span>
                </div>
                <div className="font-medium truncate">
                  {m.home_name} <span className="text-muted-fg font-mono">{m.home_score}-{m.away_score}</span> {m.away_name}
                </div>
                <div className="text-xs text-muted-fg truncate" title={m.user_email}>
                  {m.user_email}
                </div>
                <div className="text-[10px] text-muted-fg">
                  {m.events_count} eventos · {m.competition || 'Sin competición'}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/app/analysis/${m.match_id}`)}
                  className="w-full mt-1 h-9 rounded-md border border-border bg-surface-2 text-fg text-xs font-semibold hover:bg-surface-2/70 transition-colors"
                >
                  Ver análisis (sin finalizar)
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
