'use client';

/**
 * VideoPanel — reproductor de video con sincronización de eventos.
 *
 * - Carga la URL firmada del video (via /api/storage/signed-url)
 * - Lista de eventos a la derecha: click → seek al timestamp del clip
 * - Botón "Ver clip" → abre TimelineEditor con ese clip pre-cargado
 * - Subida de video si no hay ninguno
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Play, Pause, SkipBack, SkipForward, Scissors, Volume2 } from 'lucide-react';
import type { Match } from '@sportiq/core';
import type { HandballEvent } from '@sportiq/core/handball';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { useOrg } from '@/components/org-shell';

interface VideoAssetSummary {
  id: string; status: string; duration: number | null; original_name: string | null; created_at: string;
}

interface VideoPanelProps {
  match:           Match;
  videoAssets:     VideoAssetSummary[];
  events:          HandballEvent[];
  selectedEventId: string | null;
  onEventSelect:   (id: string | null) => void;
  orgSlug:         string;
}

export function VideoPanel({
  match, videoAssets, events, selectedEventId, onEventSelect, orgSlug,
}: VideoPanelProps) {
  const { org } = useOrg();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [signedUrl,  setSignedUrl]  = useState<string | null>(null);
  const [activeAsset, setActiveAsset] = useState<VideoAssetSummary | null>(
    videoAssets.find((a) => a.status === 'ready') ?? null
  );
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [volume,     setVolume]     = useState(1);
  const [urlError,   setUrlError]   = useState<string | null>(null);

  const { upload, progress, isUploading } = useVideoUpload({
    orgId:   org.id,
    matchId: match.id,
    onSuccess: (asset) => {
      setActiveAsset(asset as unknown as VideoAssetSummary);
    },
  });

  // ── Load signed URL when active asset changes ──────────────────────────────
  useEffect(() => {
    if (!activeAsset) return;
    setSignedUrl(null);
    setUrlError(null);

    fetch('/api/storage/signed-url', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ asset_type: 'video', asset_id: activeAsset.id }),
    })
      .then((r) => r.json())
      .then(({ signed_url }) => setSignedUrl(signed_url))
      .catch((e) => setUrlError(e.message));
  }, [activeAsset]);

  // ── Seek to event clip_start when event is selected ───────────────────────
  useEffect(() => {
    if (!selectedEventId || !videoRef.current) return;
    const ev = events.find((e) => e.id === selectedEventId);
    if (ev?.clipStart != null) {
      videoRef.current.currentTime = ev.clipStart;
      videoRef.current.play().catch(() => null);
    }
  }, [selectedEventId, events]);

  // ── Video controls ─────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else          { v.pause(); setIsPlaying(false); }
  }, []);

  const seek = useCallback((delta: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, currentSec + delta));
  }, [currentSec, duration]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentSec(videoRef.current.currentTime);
  }, []);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentSec(t);
  }, []);

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // ─── No video state ─────────────────────────────────────────────────────────
  if (!activeAsset) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center"
               style={{ background: 'var(--navy-700)', border: '1px solid var(--surface-border)' }}>
            <Upload size={24} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="text-center">
            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sin video para este partido</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Subí el video completo para acceder al editor de clips y sincronización de eventos.
            </p>
          </div>

          {isUploading ? (
            <UploadProgress progress={progress} />
          ) : (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file);
                }}
              />
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:brightness-110"
                   style={{ background: 'var(--blue-600)', color: 'white' }}>
                <Upload size={14} />
                Subir video del partido
              </div>
            </label>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">

      {/* ── Video player ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Video */}
        <div className="relative flex-1 bg-black flex items-center justify-center"
             style={{ minHeight: 0 }}>
          {signedUrl ? (
            <video
              ref={videoRef}
              src={signedUrl}
              className="max-w-full max-h-full"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : urlError ? (
            <div className="text-center p-4">
              <p className="text-sm" style={{ color: 'var(--red-400)' }}>Error cargando video: {urlError}</p>
            </div>
          ) : (
            <div className="text-sm animate-pulse" style={{ color: 'var(--text-muted)' }}>Cargando video…</div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 px-4 py-2 space-y-2"
             style={{ background: 'var(--navy-900)', borderTop: '1px solid var(--surface-border)' }}>

          {/* Scrubber */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono w-10" style={{ color: 'var(--text-muted)' }}>
              {formatTime(currentSec)}
            </span>
            <input
              type="range" min={0} max={duration || 1} step={0.1} value={currentSec}
              onChange={handleScrub}
              className="flex-1 h-1 rounded appearance-none cursor-pointer"
              style={{ accentColor: 'var(--blue-500)', background: 'var(--navy-700)' }}
            />
            <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--text-muted)' }}>
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button onClick={() => seek(-10)} style={{ color: 'var(--text-secondary)' }}
                    className="hover:text-white transition-colors">
              <SkipBack size={16} />
            </button>
            <button onClick={togglePlay}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:brightness-110"
                    style={{ background: 'var(--blue-600)', color: 'white' }}>
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button onClick={() => seek(10)} style={{ color: 'var(--text-secondary)' }}
                    className="hover:text-white transition-colors">
              <SkipForward size={16} />
            </button>

            <div className="flex-1" />

            {/* Volume */}
            <Volume2 size={14} style={{ color: 'var(--text-muted)' }} />
            <input type="range" min={0} max={1} step={0.05} value={volume}
                   onChange={(e) => {
                     const v = Number(e.target.value);
                     setVolume(v);
                     if (videoRef.current) videoRef.current.volume = v;
                   }}
                   className="w-16 h-1 rounded appearance-none cursor-pointer"
                   style={{ accentColor: 'var(--blue-500)' }} />

            {/* Clip editor button */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all hover:brightness-110"
              style={{ background: 'var(--navy-700)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}
              onClick={() => {
                /* Navigate to timeline editor with this asset pre-loaded */
                window.location.href = `/${orgSlug}/video/timeline?match=${match.id}&asset=${activeAsset.id}&t=${Math.floor(currentSec)}`;
              }}
            >
              <Scissors size={12} />
              Editor de clips
            </button>
          </div>
        </div>
      </div>

      {/* ── Event sidebar (click → seek) ──────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-l overflow-hidden"
             style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>
        <div className="px-3 py-2 border-b flex-shrink-0"
             style={{ borderColor: 'var(--surface-border)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            EVENTOS — {events.length}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <p className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>Sin eventos con el filtro actual.</p>
          ) : (
            events.map((ev) => {
              const isSelected = ev.id === selectedEventId;
              const hasClip    = ev.clipStart != null;
              return (
                <button
                  key={ev.id}
                  onClick={() => onEventSelect(isSelected ? null : ev.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all hover:brightness-110 border-b"
                  style={{
                    background:  isSelected ? 'var(--navy-700)' : 'transparent',
                    borderColor: 'var(--surface-border)',
                  }}
                >
                  <span className="text-xs font-mono w-8 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {ev.min}'
                  </span>
                  <EventTypeBadge type={ev.type} />
                  {hasClip && (
                    <Play size={8} className="flex-shrink-0" style={{ color: 'var(--blue-400)' }} />
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  goal:      'event-goal',
  miss:      'event-miss',
  saved:     'event-saved',
  exclusion: 'event-exclusion',
  turnover:  'event-turnover',
};

function EventTypeBadge({ type }: { type: string }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold border flex-shrink-0 ${TYPE_COLORS[type] ?? ''}`}>
      {type.slice(0, 4).toUpperCase()}
    </span>
  );
}

function UploadProgress({ progress }: { progress: ReturnType<typeof useVideoUpload>['progress'] }) {
  if (!progress) return null;
  return (
    <div className="w-full max-w-xs space-y-2">
      <div className="flex justify-between text-xs">
        <span style={{ color: 'var(--text-muted)' }}>{progress.file_name}</span>
        <span style={{ color: 'var(--blue-400)' }}>{progress.pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--navy-700)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress.pct}%`, background: 'var(--blue-600)' }}
        />
      </div>
      <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{progress.status}…</p>
    </div>
  );
}
