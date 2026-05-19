/**
 * VideoAnalysisPage — Main page for analyzing a match with video.
 *
 * Layout:
 *   ┌──────────────────────────────┬─────────────────────┐
 *   │  Video player                │  Events (rail)      │
 *   │                              │                     │
 *   │  Controls (Create clip here) │                     │
 *   ├──────────────────────────────┴─────────────────────┤
 *   │  Clips list (created clips, click to play, edit)   │
 *   └────────────────────────────────────────────────────┘
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMatchStore } from '@/lib/store';
import { usePlan, hasVideoAndAI } from '@/lib/use-plan';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getVideoAssetForMatch, getVideoSignedUrl, deleteVideoAsset } from '@/lib/video-storage';
import {
  createClip,
  listClipsForMatch,
  updateClip as updateClipDb,
  deleteClip as deleteClipDb,
} from '@/lib/clips-storage';
import { DEFAULT_CLIP_PRE_SEC, DEFAULT_CLIP_POST_SEC } from '@/domain/video';
import type { Clip, VideoAsset } from '@/domain/video';
import type { HandballEvent } from '@/domain/types';
import { VideoLoader } from './video-loader';
import { VideoPlayer, type VideoPlayerHandle } from './video-player';
import { EventRail } from './event-rail';
import { ClipList } from './clip-list';

export const VideoAnalysisPage = () => {
  const { id: matchId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plan = usePlan();
  const { user } = useAuth();
  const completed = useMatchStore((s) => s.completed);
  const queryClient = useQueryClient();

  // Match from local store
  const match = useMemo(
    () => completed.find((m) => m.id === matchId) ?? null,
    [completed, matchId],
  );

  // The user's org id (lazy-resolved via Supabase since the store doesn't expose it directly)
  const [orgId, setOrgId] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setOrgId(data?.org_id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ── Player state ────────────────────────────────────────────────────────
  const playerRef = useRef<VideoPlayerHandle>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────
  const videoQuery = useQuery({
    queryKey: ['video-asset', matchId],
    queryFn: () => getVideoAssetForMatch(matchId!),
    enabled: !!matchId,
  });

  const clipsQuery = useQuery({
    queryKey: ['clips', matchId],
    queryFn: () => listClipsForMatch(matchId!),
    enabled: !!matchId,
  });

  const video = videoQuery.data ?? null;
  const clips = clipsQuery.data ?? [];

  // Resolve signed URL for uploaded videos
  useEffect(() => {
    if (!video || video.source_type !== 'upload' || !video.storage_path) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    getVideoSignedUrl(video.storage_path)
      .then((url) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch((err) => {
        console.error('[VideoAnalysisPage] signed url failed:', err);
        if (!cancelled) setSignedUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [video]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleVideoLoaded = useCallback(
    (asset: VideoAsset) => {
      queryClient.setQueryData(['video-asset', matchId], asset);
    },
    [queryClient, matchId],
  );

  const handleEventClick = useCallback((_event: HandballEvent, videoSec: number) => {
    playerRef.current?.seek(videoSec);
    playerRef.current?.play();
  }, []);

  const handleCreateClipFromEvent = useCallback(
    async (event: HandballEvent, videoSec: number) => {
      if (!matchId || !orgId || !video) return;
      try {
        const newClip = await createClip({
          orgId,
          matchId,
          videoAssetId: video.id,
          eventId: null, // we don't have a UUID link to match_events from local store events
          title: `Evento min ${event.min} — ${event.type}`,
          startSec: Math.max(0, videoSec - DEFAULT_CLIP_PRE_SEC),
          endSec: videoSec + DEFAULT_CLIP_POST_SEC,
        });
        queryClient.setQueryData<Clip[]>(['clips', matchId], (old) => [...(old ?? []), newClip]);
      } catch (err) {
        console.error('[VideoAnalysisPage] create clip failed:', err);
      }
    },
    [matchId, orgId, video, queryClient],
  );

  const handleCreateClipHere = useCallback(async () => {
    if (!matchId || !orgId || !video) return;
    const t = playerRef.current?.getCurrentTime() ?? currentTime;
    try {
      const newClip = await createClip({
        orgId,
        matchId,
        videoAssetId: video.id,
        title: `Clip ${clips.length + 1}`,
        startSec: Math.max(0, t - DEFAULT_CLIP_PRE_SEC),
        endSec: t + DEFAULT_CLIP_POST_SEC,
      });
      queryClient.setQueryData<Clip[]>(['clips', matchId], (old) => [...(old ?? []), newClip]);
    } catch (err) {
      console.error('[VideoAnalysisPage] create clip here failed:', err);
    }
  }, [matchId, orgId, video, currentTime, clips.length, queryClient]);

  const handlePlayClip = useCallback((clip: Clip) => {
    playerRef.current?.seek(clip.start_sec);
    playerRef.current?.play();
  }, []);

  const handleRenameClip = useCallback(
    async (clip: Clip, newTitle: string) => {
      try {
        const updated = await updateClipDb(clip.id, { title: newTitle });
        queryClient.setQueryData<Clip[]>(['clips', matchId], (old) =>
          (old ?? []).map((c) => (c.id === updated.id ? updated : c)),
        );
      } catch (err) {
        console.error('[VideoAnalysisPage] rename clip failed:', err);
      }
    },
    [matchId, queryClient],
  );

  const handleDeleteClip = useCallback(
    async (clip: Clip) => {
      if (!confirm(`¿Eliminar el clip "${clip.title}"?`)) return;
      try {
        await deleteClipDb(clip.id);
        queryClient.setQueryData<Clip[]>(['clips', matchId], (old) =>
          (old ?? []).filter((c) => c.id !== clip.id),
        );
      } catch (err) {
        console.error('[VideoAnalysisPage] delete clip failed:', err);
      }
    },
    [matchId, queryClient],
  );

  const handleReplaceVideo = useCallback(async () => {
    if (!video) return;
    if (!confirm('¿Eliminar el video actual y cargar otro?')) return;
    try {
      await deleteVideoAsset(video.id, video.storage_path);
      queryClient.setQueryData(['video-asset', matchId], null);
    } catch (err) {
      console.error('[VideoAnalysisPage] replace video failed:', err);
    }
  }, [video, matchId, queryClient]);

  // ── Plan gate ───────────────────────────────────────────────────────────
  if (!plan.loading && !hasVideoAndAI(plan)) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary">
              <LockIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Análisis con video</h2>
              <p className="text-sm text-muted-fg">
                Disponible en los planes <strong>Club</strong> y <strong>Elite</strong>. Subí el video del partido, clickeá los eventos para saltar al momento exacto, y exportá los clips destacados.
              </p>
            </div>
            <Button onClick={() => navigate('/app/plans')}>
              Ver planes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading / empty states ──────────────────────────────────────────────
  if (!matchId || !match) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-fg">
            No encontramos el partido. Volvé a la lista de partidos.
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

  if (videoQuery.isLoading || !orgId) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-fg">
            Cargando…
          </CardContent>
        </Card>
      </div>
    );
  }

  // No video yet → show loader
  if (!video) {
    return (
      <div className="container mx-auto p-4 max-w-3xl space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{match.home} vs {match.away}</h1>
            <p className="text-xs text-muted-fg">Análisis con video</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app')}>
            ← Volver
          </Button>
        </header>
        <VideoLoader orgId={orgId} matchId={matchId} onLoaded={handleVideoLoaded} />
      </div>
    );
  }

  // ── Main UI ─────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold">{match.home} vs {match.away}</h1>
          <p className="text-xs text-muted-fg">
            Análisis con video · {match.hs}-{match.as} · {clips.length} clip{clips.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReplaceVideo}>
            Reemplazar video
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app')}>
            ← Volver
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* LEFT: Video + controls */}
        <div className="space-y-3">
          <VideoPlayer
            ref={playerRef}
            asset={video}
            signedUrl={signedUrl}
            onTimeUpdate={setCurrentTime}
            onDurationKnown={setDuration}
          />

          <Card>
            <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-muted-fg font-mono tabular-nums">
                {fmtTime(currentTime)} / {fmtTime(duration)}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => playerRef.current?.seek(Math.max(0, currentTime - 10))}>
                  −10s
                </Button>
                <Button variant="secondary" size="sm" onClick={() => playerRef.current?.seek(currentTime + 10)}>
                  +10s
                </Button>
                <Button onClick={handleCreateClipHere} size="sm">
                  + Crear clip aquí
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-2">
                Clips ({clips.length})
              </div>
              <ClipList
                clips={clips}
                currentTime={currentTime}
                onPlayClip={handlePlayClip}
                onRenameClip={handleRenameClip}
                onDeleteClip={handleDeleteClip}
              />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Events rail */}
        <div className="space-y-2">
          <Card>
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-2">
                Eventos del partido ({match.events.length})
              </div>
              <EventRail
                events={match.events}
                homeTeamName={match.home}
                awayTeamName={match.away}
                currentTime={currentTime}
                onEventClick={handleEventClick}
                onCreateClip={handleCreateClipFromEvent}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const fmtTime = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
