/**
 * SharedAnalysisPage — Public, read-only view of a video analysis.
 *
 * Opened via /share-analysis/:token — no login required.
 * Shows the video (YouTube or uploaded) + the marked events.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, Loader2 } from 'lucide-react';
import { getAnalyzerVideoByShareToken, getPublicVideoUrl } from '@/lib/analyzer-video-storage';
import { listVideoEvents, listVideoPlayers } from '@/lib/video-events-storage';
import type { VideoEvent, VideoPlayer } from '@/domain/video-events';
import { EventList } from './EventList';

type LoadState = 'loading' | 'ready' | 'notfound' | 'novideo';

export const SharedAnalysisPage = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<LoadState>('loading');
  const [ytId, setYtId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [events, setEvents] = useState<VideoEvent[]>([]);
  const [players, setPlayers] = useState<VideoPlayer[]>([]);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!token) { setState('notfound'); return; }
    let cancelled = false;

    (async () => {
      try {
        const asset = await getAnalyzerVideoByShareToken(token);
        if (cancelled) return;
        if (!asset || !asset.match_local_id) { setState('notfound'); return; }

        // Load events + players for this analysis
        const [evs, pls] = await Promise.all([
          listVideoEvents(asset.match_local_id).catch(() => []),
          listVideoPlayers(asset.match_local_id).catch(() => []),
        ]);
        if (cancelled) return;
        setEvents(evs);
        setPlayers(pls);

        if (asset.source_type === 'youtube' && asset.youtube_video_id) {
          setYtId(asset.youtube_video_id);
          setState('ready');
        } else if (asset.source_type === 'upload' && asset.storage_path) {
          setVideoUrl(getPublicVideoUrl(asset.storage_path));
          setState('ready');
        } else {
          setState('novideo');
        }
      } catch (err) {
        console.error('[SharedAnalysis] load failed:', err);
        if (!cancelled) setState('notfound');
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const handleSeek = (time: number) => {
    if (videoElRef.current) {
      videoElRef.current.currentTime = time;
      videoElRef.current.play().catch(() => {});
    }
    // For YouTube we can't programmatically seek without the IFrame API;
    // the embedded player still lets the viewer scrub manually.
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#080b0f] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#484f58]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-mono text-sm">Cargando análisis…</span>
        </div>
      </div>
    );
  }

  if (state === 'notfound') {
    return (
      <div className="min-h-screen bg-[#080b0f] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white font-semibold mb-1">Análisis no encontrado</p>
          <p className="text-[#484f58] text-sm font-mono">
            El link no es válido o el análisis fue eliminado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b0f]">
      {/* Header */}
      <header className="border-b border-[#21262d] bg-[#0d1117]/90 sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto px-4 h-14 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00ff88]" />
          <span className="font-bold text-white tracking-wide text-sm">StatzPro</span>
          <span className="text-[#484f58] font-mono text-xs">· Análisis compartido</span>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        {/* Video */}
        <div className="rounded-2xl bg-[#0d1117] border border-[#21262d] p-3">
          {state === 'novideo' ? (
            <div className="aspect-video flex items-center justify-center text-[#484f58] font-mono text-sm">
              Este análisis no tiene video cargado.
            </div>
          ) : ytId ? (
            <div className="aspect-video">
              <iframe
                className="w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${ytId}`}
                title="Análisis"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : videoUrl ? (
            <video
              ref={videoElRef}
              src={videoUrl}
              controls
              playsInline
              className="w-full rounded-lg bg-black"
            />
          ) : null}
        </div>

        {/* Events */}
        <aside className="rounded-2xl bg-[#0d1117] border border-[#21262d] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-semibold tracking-widest text-xs text-[#484f58] uppercase">
              Eventos ({events.length})
            </span>
          </div>
          {events.length === 0 ? (
            <p className="text-[#484f58] font-mono text-xs text-center py-6">
              Sin eventos marcados.
            </p>
          ) : (
            <EventList
              events={events}
              players={players}
              onSeek={handleSeek}
              onDelete={() => {}}
              onUpdateResult={() => {}}
              onClearAll={() => {}}
            />
          )}
        </aside>
      </main>

      <footer className="text-center py-6 text-[#484f58] font-mono text-[10px]">
        Hecho con StatzPro · Análisis de Handball
      </footer>
    </div>
  );
};
