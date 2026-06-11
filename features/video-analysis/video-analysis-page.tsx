/**
 * VideoAnalysisPage — The full video analyzer.
 *
 * Ported from the original Handball-analizador, integrated into StatzPro.
 *  - Plan-gated: only club / elite.
 *  - Video source: local file (IndexedDB-persisted) or YouTube.
 *  - Events: hierarchical 4-level model, persisted in Supabase `video_events`.
 *  - Players: free-form roster persisted in `video_players`.
 *  - Clip editor + drawing editor (export with MediaRecorder).
 */

import { useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft, Pencil, Share2 } from 'lucide-react';
import { useMatchStore } from '@/lib/store';
import { usePlan, hasVideoAndAI } from '@/lib/use-plan';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  listVideoEvents,
  createVideoEvent,
  deleteVideoEvent,
  updateVideoEvent,
  listVideoPlayers,
  createVideoPlayer,
  deleteVideoPlayer,
} from '@/lib/video-events-storage';
import { DEFAULT_CLIP_PRE_SEC, DEFAULT_CLIP_POST_SEC } from '@/domain/video-events';
import type {
  VideoEvent,
  VideoPlayer,
  VideoMode,
  EventTipo,
  EventSubtype,
  EventDetail,
  EventQualifier,
  EventResult,
} from '@/domain/video-events';
import { inferResult } from '@/domain/video-events';
import { AnalyzerVideoPlayer } from './AnalyzerVideoPlayer';
import type { VideoPlayerHandle } from './AnalyzerVideoPlayer';
import { EventButtons } from './EventButtons';
import { EventList } from './EventList';
import { PlayerPanel } from './PlayerPanel';
import { ClipEditor } from './ClipEditor';
import { ClipDrawingEditor } from './ClipDrawingEditor';
import { ensureShareToken } from '@/lib/analyzer-video-storage';

export const VideoAnalysisPage = () => {
  const { id: matchId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plan = usePlan();
  const { user } = useAuth();
  const completed = useMatchStore((s) => s.completed);
  const queryClient = useQueryClient();

  const userId = user?.id ?? null;
  const match = completed.find((m) => m.id === matchId) ?? null;

  // ── Player + UI refs/state ──────────────────────────────────────────────
  const videoRef = useRef<VideoPlayerHandle>(null);
  const [videoMode, setVideoMode] = useState<VideoMode>(null);
  const [showDrawEditor, setShowDrawEditor] = useState(false);
  const [editClipRange, setEditClipRange] = useState<{ start: number; end: number } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────
  const eventsQuery = useQuery({
    queryKey: ['video-events', matchId],
    queryFn: () => listVideoEvents(matchId!),
    enabled: !!matchId,
  });

  const playersQuery = useQuery({
    queryKey: ['video-players', matchId],
    queryFn: () => listVideoPlayers(matchId!),
    enabled: !!matchId,
  });

  const events: VideoEvent[] = eventsQuery.data ?? [];
  const players: VideoPlayer[] = playersQuery.data ?? [];

  // ── Event handlers ──────────────────────────────────────────────────────
  const handleEvent = useCallback(
    async (
      tipo: EventTipo,
      subtype: EventSubtype,
      detail: EventDetail,
      qualifier: EventQualifier,
      _result: EventResult,
      playerId: string | null,
      playerName: string | null,
    ) => {
      if (!matchId || !userId) return;
      const time = videoRef.current?.getCurrentTime() ?? 0;
      const result = inferResult({ tipo, subtype, detail, qualifier });
      try {
        const created = await createVideoEvent({
          userId,
          matchLocalId: matchId,
          videoAssetId: null,
          time,
          tipo,
          subtype,
          detail,
          qualifier,
          result,
          playerId,
          playerName,
          clipStart: Math.max(0, time - DEFAULT_CLIP_PRE_SEC),
          clipEnd: time + DEFAULT_CLIP_POST_SEC,
        });
        queryClient.setQueryData<VideoEvent[]>(['video-events', matchId], (old) =>
          [...(old ?? []), created].sort((a, b) => a.time - b.time),
        );
      } catch (err) {
        console.error('[VideoAnalysis] create event failed:', err);
      }
    },
    [matchId, userId, queryClient],
  );

  const handleSeek = useCallback((time: number) => {
    videoRef.current?.seekTo(time);
  }, []);

  const handleDeleteEvent = useCallback(
    async (id: string) => {
      try {
        await deleteVideoEvent(id);
        queryClient.setQueryData<VideoEvent[]>(['video-events', matchId], (old) =>
          (old ?? []).filter((e) => e.id !== id),
        );
      } catch (err) {
        console.error('[VideoAnalysis] delete event failed:', err);
      }
    },
    [matchId, queryClient],
  );

  const handleUpdateResult = useCallback(
    async (id: string, result: EventResult) => {
      try {
        const updated = await updateVideoEvent(id, { result });
        queryClient.setQueryData<VideoEvent[]>(['video-events', matchId], (old) =>
          (old ?? []).map((e) => (e.id === updated.id ? updated : e)),
        );
      } catch (err) {
        console.error('[VideoAnalysis] update result failed:', err);
      }
    },
    [matchId, queryClient],
  );

  const handleClearAll = useCallback(async () => {
    try {
      await Promise.all(events.map((e) => deleteVideoEvent(e.id)));
      queryClient.setQueryData<VideoEvent[]>(['video-events', matchId], []);
    } catch (err) {
      console.error('[VideoAnalysis] clear all failed:', err);
    }
  }, [events, matchId, queryClient]);

  const handleUpdateClip = useCallback(
    async (eventId: string, clip_start: number, clip_end: number) => {
      try {
        const updated = await updateVideoEvent(eventId, { clip_start, clip_end });
        queryClient.setQueryData<VideoEvent[]>(['video-events', matchId], (old) =>
          (old ?? []).map((e) => (e.id === updated.id ? updated : e)),
        );
      } catch (err) {
        console.error('[VideoAnalysis] update clip failed:', err);
      }
    },
    [matchId, queryClient],
  );

  const handleAddPlayer = useCallback(
    async (name: string, number?: string) => {
      if (!matchId || !userId) return;
      try {
        const created = await createVideoPlayer({
          userId,
          matchLocalId: matchId,
          name,
          number: number ?? null,
        });
        queryClient.setQueryData<VideoPlayer[]>(['video-players', matchId], (old) => [
          ...(old ?? []),
          created,
        ]);
      } catch (err) {
        console.error('[VideoAnalysis] add player failed:', err);
      }
    },
    [matchId, userId, queryClient],
  );

  const handleRemovePlayer = useCallback(
    async (id: string) => {
      try {
        await deleteVideoPlayer(id);
        queryClient.setQueryData<VideoPlayer[]>(['video-players', matchId], (old) =>
          (old ?? []).filter((p) => p.id !== id),
        );
      } catch (err) {
        console.error('[VideoAnalysis] remove player failed:', err);
      }
    },
    [matchId, queryClient],
  );

  const openClipEditor = useCallback((start: number, end: number) => {
    setEditClipRange({ start, end });
    setShowDrawEditor(true);
  }, []);

  // ── Share: generate a public link for this analysis ─────────────────────
  const handleShare = useCallback(async () => {
    if (!matchId) return;
    setSharing(true);
    try {
      const token = await ensureShareToken(matchId);
      const url = `${window.location.origin}/share-analysis/${token}`;
      setShareUrl(url);
    } catch (err) {
      console.error('[VideoAnalysis] share failed:', err);
      alert(
        err instanceof Error && err.message.includes('No hay video')
          ? 'Primero cargá un video para poder compartir el análisis.'
          : 'No se pudo generar el link. Intentá de nuevo.',
      );
    } finally {
      setSharing(false);
    }
  }, [matchId]);

  // ── Plan gate ───────────────────────────────────────────────────────────
  if (!plan.loading && !hasVideoAndAI(plan)) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary text-2xl">
              🎬
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Análisis con video</h2>
              <p className="text-sm text-muted-fg">
                Disponible en los planes <strong>Club</strong> y <strong>Elite</strong>.
              </p>
            </div>
            <Button onClick={() => navigate('/app/plans')}>Ver planes</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading / not found ─────────────────────────────────────────────────
  if (!matchId || !match) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-fg">
            No encontramos el partido.
            <div className="mt-3">
              <Button variant="secondary" onClick={() => navigate('/app')}>
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main UI (analyzer layout) ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080b0f]">
      {/* Header */}
      <header className="border-b border-[#21262d] bg-[#0d1117]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 text-[#484f58] hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-xs hidden sm:block">PARTIDOS</span>
          </button>
          <div className="w-px h-5 bg-[#30363d]" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Activity className="w-4 h-4 text-[#00ff88] shrink-0" />
            <span className="font-bold text-white tracking-wide truncate text-sm">
              {match.home} vs {match.away}
            </span>
            <span className="text-[#484f58] font-mono text-xs hidden md:block shrink-0">
              Análisis con video
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {videoMode && (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center gap-1.5 text-xs font-mono text-[#00ff88] hover:text-[#00ff88]/80 border border-[#00ff88]/30 hover:border-[#00ff88]/50 px-3 py-1.5 rounded-lg bg-[#00ff88]/10 transition-all disabled:opacity-50"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:block">{sharing ? '...' : 'COMPARTIR'}</span>
              </button>
            )}
            {videoMode === 'local' && (
              <button
                onClick={() => {
                  setEditClipRange(null);
                  setShowDrawEditor(true);
                }}
                className="flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-500/50 px-3 py-1.5 rounded-lg bg-violet-500/10 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:block">EDITOR</span>
              </button>
            )}
            <div className="px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg font-black text-[#00ff88] text-sm tabular-nums">
              {match.hs} : {match.as}
            </div>
          </div>
        </div>
      </header>

      {/* Share link banner */}
      {shareUrl && (
        <div className="bg-[#00ff88]/10 border-b border-[#00ff88]/30 px-4 py-2.5">
          <div className="max-w-[1400px] mx-auto flex items-center gap-2 flex-wrap">
            <Share2 className="w-4 h-4 text-[#00ff88] shrink-0" />
            <span className="text-xs font-mono text-[#00ff88] shrink-0">Link público:</span>
            <input
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 min-w-[200px] bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs font-mono text-white"
            />
            <button
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs font-mono px-3 py-1 rounded bg-[#00ff88] text-black font-bold shrink-0"
            >
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
            <button
              onClick={() => setShareUrl(null)}
              className="text-xs font-mono text-[#484f58] hover:text-white shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">
        {/* Left column */}
        <div className="contents xl:flex xl:flex-col xl:gap-4 xl:min-w-0">
          {/* Video */}
          <section className="rounded-none sm:rounded-2xl bg-[#0d1117] border-y sm:border border-[#21262d] p-2 sm:p-4 sticky top-[56px] xl:top-[70px] z-30 shadow-2xl -mx-4 sm:mx-0 self-start xl:self-stretch">
            <AnalyzerVideoPlayer ref={videoRef} onModeChange={setVideoMode} partidoId={matchId} userId={userId} />
            {videoMode === 'local' && (
              <button
                onClick={() => {
                  setEditClipRange(null);
                  setShowDrawEditor(true);
                }}
                className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-full bg-violet-500/90 hover:bg-violet-500 backdrop-blur text-white text-xs font-bold shadow-lg shadow-violet-500/40 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar video
              </button>
            )}
          </section>

          {/* Players */}
          <PlayerPanel players={players} onAdd={handleAddPlayer} onRemove={handleRemovePlayer} />

          {/* Event buttons */}
          <section className="rounded-2xl bg-[#0d1117] border border-[#21262d] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-400 text-sm">⚡</span>
              <span className="font-semibold tracking-widest text-xs text-[#484f58] uppercase">
                Marcar Evento
              </span>
              {!videoMode && (
                <span className="text-xs font-mono text-[#484f58] ml-auto">
                  Cargá un video primero
                </span>
              )}
            </div>
            <EventButtons players={players} onEvent={handleEvent} disabled={!videoMode} />
          </section>

          {/* Clip editor */}
          <ClipEditor
            events={events}
            playerRef={videoRef}
            onUpdateClip={handleUpdateClip}
            onEditClip={videoMode === 'local' ? openClipEditor : undefined}
          />

          {/* Event list — mobile */}
          <section className="rounded-2xl bg-[#0d1117] border border-[#21262d] p-4 xl:hidden">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-semibold tracking-widest text-xs text-[#484f58] uppercase">
                Timeline
              </span>
            </div>
            <EventList
              events={events}
              players={players}
              onSeek={handleSeek}
              onDelete={handleDeleteEvent}
              onUpdateResult={handleUpdateResult}
              onClearAll={handleClearAll}
            />
          </section>
        </div>

        {/* Right column — desktop */}
        <aside className="hidden xl:flex flex-col gap-4">
          <section className="rounded-2xl bg-[#0d1117] border border-[#21262d] p-4 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-semibold tracking-widest text-xs text-[#484f58] uppercase">
                Timeline de Eventos
              </span>
            </div>
            <EventList
              events={events}
              players={players}
              onSeek={handleSeek}
              onDelete={handleDeleteEvent}
              onUpdateResult={handleUpdateResult}
              onClearAll={handleClearAll}
            />
          </section>
        </aside>
      </main>

      {/* Drawing / Clip Editor overlay */}
      {showDrawEditor && (
        <ClipDrawingEditor
          localFile={videoRef.current?.getLocalFile() ?? null}
          initialTime={editClipRange?.start ?? videoRef.current?.getCurrentTime() ?? 0}
          clipRange={editClipRange}
          events={events}
          onClose={() => {
            setShowDrawEditor(false);
            setEditClipRange(null);
          }}
        />
      )}
    </div>
  );
};
