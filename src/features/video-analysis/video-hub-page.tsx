import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { useMatchStore } from '@/lib/store';
import { usePlan } from '@/lib/use-plan';
import { NewVideoProjectDialog, type NewVideoProjectValues } from './new-video-project-dialog';

/**
 * 🎥 Análisis con video — para TODOS los usuarios.
 *
 * Función principal: arrancar un análisis de video SIN cargar/trackear un
 * partido (sin reloj, sin planilla, sin "Finalizar") — se ponen los dos
 * equipos y se entra directo al editor de clips. Disponible para cualquier
 * usuario logueado (VideoAnalysisPage sigue aplicando su propio gate de
 * plan Club/Elite al entrar).
 *
 * "Mis partidos": cada usuario ve SOLO sus propios partidos cargados
 * (del store local) para retomar su análisis de video.
 *
 * "Todos los partidos" (admin-only): además, un admin ve TODOS los partidos
 * de TODOS los usuarios y puede abrir su video-análisis en solo lectura
 * (video-analysis-page.tsx trae el proyecto ajeno vía fetchMatchAsAdmin y
 * bloquea cualquier escritura — ver RLS *_admin_select en video_events/
 * video_players/video_assets/video_annotations/video_timelines).
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

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  finished: { text: 'Finalizado', cls: 'text-emerald-400 border-emerald-500/30' },
  live:     { text: 'En vivo',    cls: 'text-danger border-danger/40' },
};

export const VideoHubPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = usePlan();
  const addCompleted = useMatchStore((s) => s.addCompleted);
  const myMatches = useMatchStore((s) => s.completed);
  const [showNewVideo, setShowNewVideo] = useState(false);

  const [allMatches, setAllMatches] = useState<AdminMatch[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);

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

  const loadAll = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_get_all_matches');
    if (error) console.error('[video-hub] loadMatches error:', error.message);
    setAllMatches((data as AdminMatch[]) ?? []);
    setLoadingAll(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadAll();
    const iv = window.setInterval(() => { void loadAll(); }, 30000);
    return () => window.clearInterval(iv);
  }, [isAdmin, loadAll]);

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

      {/* Mis partidos — cada usuario ve solo lo suyo */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-fg uppercase tracking-wide">
          Mis partidos
        </h2>
        {myMatches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-fg">
            Todavía no tenés partidos cargados. Creá uno arriba, o cargalo desde Partidos.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {myMatches.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-surface p-4 space-y-2">
                <div className="font-medium truncate">
                  {m.home} <span className="text-muted-fg font-mono">{m.hs}-{m.as}</span> {m.away}
                </div>
                <div className="text-[10px] text-muted-fg">
                  {m.date ?? 'Sin fecha'} · {m.competition || 'Sin competición'}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/app/video/${m.id}`)}
                  className="w-full mt-1 h-9 rounded-md border border-primary/40 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
                >
                  🎥 Analizar video
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Admin-only: todos los partidos de todos los usuarios */}
      {isAdmin && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-muted-fg uppercase tracking-wide">
              🛠️ Todos los partidos (todos los usuarios) · admin
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-fg font-semibold uppercase">
              {allMatches.length} total
            </span>
          </div>
          <p className="text-[10px] text-muted-fg -mt-1">
            Al abrirlos ves el proyecto de video de ese usuario en solo lectura.
          </p>

          {loadingAll ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-fg">
              <span className="inline-block w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin mr-2" />
              Cargando…
            </div>
          ) : allMatches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-fg">
              No hay partidos cargados en la plataforma.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {allMatches.map((m) => {
                const sl = STATUS_LABEL[m.status] ?? { text: m.status, cls: 'text-muted-fg border-border' };
                return (
                  <div key={m.match_id} className="rounded-xl border border-border bg-surface p-4 space-y-2">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase', sl.cls)}>
                      {sl.text}
                    </span>
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
                      onClick={() => navigate(`/app/video/${m.local_id ?? m.match_id}`)}
                      className="w-full mt-1 h-9 rounded-md border border-border bg-surface-2 text-fg text-xs font-semibold hover:bg-surface-2/70 transition-colors"
                    >
                      🎥 Ver análisis de video
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
