'use client';

/**
 * TimelineEditor — Editor de clips tipo CapCut/DaVinci.
 *
 * Arquitectura:
 *  - Timeline es METADATA PURA (TimelineClip[]) — no copia videos
 *  - Preview via HTMLVideoElement con seek (no render en tiempo real)
 *  - Export → ClipSignature → RenderJob → Edge Function → FFmpeg
 *
 * Flujo:
 *  1. Usuario selecciona eventos con clip_start/clip_end (o recorta manualmente)
 *  2. Cada recorte se convierte en un TimelineClip
 *  3. layoutClips() calcula posición en timeline
 *  4. Preview: seek to source_start, play to source_end (sin renderizar)
 *  5. Export: genera ClipSignatures → RenderJob por clip
 */

import {
  useState, useRef, useEffect, useCallback, useMemo, useId,
} from 'react';
import {
  Scissors, Play, Pause, Trash2, Download, Plus,
  ChevronLeft, ChevronRight, Layers, AlertCircle,
} from 'lucide-react';
import { layoutClips, timelineDuration } from '@sportiq/media/clip';
import type { TimelineClip } from '@sportiq/media';
import { useClipSignature } from '@/hooks/useClipSignature';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoSource {
  assetId:   string;
  signedUrl: string;
  duration:  number;
  name:      string;
}

interface TimelineEditorProps {
  orgId:        string;
  matchId:      string;
  videoSources: VideoSource[];
  /** Pre-populated clips (e.g. from match events with clip_start/end) */
  initialClips?: Omit<TimelineClip, 'start_in_timeline' | 'end_in_timeline'>[];
  onSave?:       (clips: TimelineClip[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PX_PER_SEC  = 60;   // pixels per second on the timeline track
const TRACK_H     = 48;   // track height in px
const MIN_CLIP_S  = 0.5;  // minimum clip duration in seconds

// ─── Component ────────────────────────────────────────────────────────────────

export function TimelineEditor({
  orgId, matchId, videoSources, initialClips = [], onSave,
}: TimelineEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Raw clips (without layout — computed separately)
  const [rawClips, setRawClips] = useState<
    Omit<TimelineClip, 'start_in_timeline' | 'end_in_timeline'>[]
  >(initialClips);

  const [selectedClipId,  setSelectedClipId]  = useState<string | null>(null);
  const [activeSourceIdx, setActiveSourceIdx]  = useState(0);
  const [isPlaying,       setIsPlaying]        = useState(false);
  const [currentSec,      setCurrentSec]       = useState(0);
  const [previewClipId,   setPreviewClipId]    = useState<string | null>(null);
  const [exportStatus,    setExportStatus]     = useState<'idle'|'exporting'|'done'|'error'>('idle');
  const [exportUrls,      setExportUrls]       = useState<string[]>([]);

  const { requestExport } = useClipSignature({ orgId });

  const activeSource = videoSources[activeSourceIdx];

  // ── Computed layout ────────────────────────────────────────────────────────

  const layoutedClips = useMemo((): TimelineClip[] => {
    return layoutClips(rawClips.map((c) => ({
      id:           c.id,
      source_start: c.source_start,
      source_end:   c.source_end,
    })), 0).map((layout, i) => ({
      ...rawClips[i]!,
      start_in_timeline: layout.start_in_timeline,
      end_in_timeline:   layout.end_in_timeline,
    }));
  }, [rawClips]);

  const totalDuration = useMemo(() =>
    timelineDuration(layoutedClips.map((c) => ({
      start_in_timeline: c.start_in_timeline,
      end_in_timeline:   c.end_in_timeline,
    }))),
    [layoutedClips]
  );

  const timelineWidth = Math.max(totalDuration * PX_PER_SEC, 600);

  // ── Video controls ─────────────────────────────────────────────────────────

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentSec(v.currentTime);

    // Stop at clip end in preview mode
    if (previewClipId) {
      const clip = layoutedClips.find((c) => c.id === previewClipId);
      if (clip && v.currentTime >= clip.source_end) {
        v.pause();
        setIsPlaying(false);
        setPreviewClipId(null);
      }
    }
  }, [previewClipId, layoutedClips]);

  const previewClip = useCallback((clipId: string) => {
    const clip = layoutedClips.find((c) => c.id === clipId);
    if (!clip || !videoRef.current || !activeSource) return;

    // Find matching source
    const src = videoSources.find((s) => s.assetId === clip.video_asset_id);
    if (!src) return;

    setPreviewClipId(clipId);
    setSelectedClipId(clipId);

    if (videoRef.current.src !== src.signedUrl) {
      videoRef.current.src    = src.signedUrl;
      videoRef.current.load();
    }
    videoRef.current.currentTime = clip.source_start;
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => null);
  }, [layoutedClips, videoSources, activeSource]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // ── Clip operations ────────────────────────────────────────────────────────

  const addClipFromSource = useCallback(() => {
    if (!activeSource) return;
    const id = crypto.randomUUID();
    const start = currentSec;
    const end   = Math.min(currentSec + 10, activeSource.duration);
    setRawClips((prev) => [...prev, {
      id,
      video_asset_id:  activeSource.assetId,
      source_start:    start,
      source_end:      end,
      overlays:        [],
    }]);
    setSelectedClipId(id);
  }, [activeSource, currentSec]);

  const deleteClip = useCallback((clipId: string) => {
    setRawClips((prev) => prev.filter((c) => c.id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
    if (previewClipId === clipId)  setPreviewClipId(null);
  }, [selectedClipId, previewClipId]);

  const trimClip = useCallback((
    clipId: string,
    edge:   'start' | 'end',
    newSec: number,
    videoDuration: number,
  ) => {
    setRawClips((prev) => prev.map((c) => {
      if (c.id !== clipId) return c;
      if (edge === 'start') {
        const newStart = Math.max(0, Math.min(newSec, c.source_end - MIN_CLIP_S));
        return { ...c, source_start: newStart };
      } else {
        const newEnd = Math.min(videoDuration, Math.max(newSec, c.source_start + MIN_CLIP_S));
        return { ...c, source_end: newEnd };
      }
    }));
  }, []);

  const reorderClips = useCallback((fromIdx: number, toIdx: number) => {
    setRawClips((prev) => {
      const arr  = [...prev];
      const [el] = arr.splice(fromIdx, 1);
      if (el) arr.splice(toIdx, 0, el);
      return arr;
    });
  }, []);

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExportAll = useCallback(async () => {
    if (layoutedClips.length === 0) return;
    setExportStatus('exporting');
    const urls: string[] = [];

    for (const clip of layoutedClips) {
      const result = await requestExport({
        videoAssetId: clip.video_asset_id,
        startSec:     clip.source_start,
        endSec:       clip.source_end,
        overlays:     clip.overlays as any,
        format:       'mp4',
      });
      if (result) urls.push(result.signedUrl);
    }

    if (urls.length > 0) {
      setExportUrls(urls);
      setExportStatus('done');
      onSave?.(layoutedClips);
    } else {
      setExportStatus('error');
    }
  }, [layoutedClips, requestExport, onSave]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (videoSources.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'var(--text-muted)' }}>No hay videos disponibles para este partido.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--navy-950)' }}>

      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 h-11 border-b"
           style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>
        <Layers size={14} style={{ color: 'var(--text-muted)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Editor de timeline</span>
        <span className="text-xs font-mono px-2 py-0.5 rounded"
              style={{ background: 'var(--navy-700)', color: 'var(--text-muted)' }}>
          {layoutedClips.length} clips · {formatDuration(totalDuration)}
        </span>
        <div className="flex-1" />

        <button
          onClick={addClipFromSource}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:brightness-110"
          style={{ background: 'var(--navy-700)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}
        >
          <Plus size={12} /> Añadir clip
        </button>

        <button
          onClick={handleExportAll}
          disabled={layoutedClips.length === 0 || exportStatus === 'exporting'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: 'var(--blue-600)', color: 'white' }}
        >
          {exportStatus === 'exporting'
            ? <><span className="animate-spin">⟳</span> Exportando…</>
            : <><Download size={12} /> Exportar</>
          }
        </button>
      </div>

      {/* ── Main area: preview + source list ─────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Video preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 bg-black flex items-center justify-center" style={{ minHeight: 0 }}>
            <video
              ref={videoRef}
              src={activeSource?.signedUrl}
              className="max-w-full max-h-full"
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>

          {/* Playback controls */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-t"
               style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>
            <button onClick={togglePlay}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--blue-600)', color: 'white' }}>
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {formatDuration(currentSec)} / {formatDuration(activeSource?.duration ?? 0)}
            </span>
            <input
              type="range"
              min={0} max={activeSource?.duration ?? 1} step={0.1} value={currentSec}
              onChange={(e) => {
                const t = Number(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = t;
                setCurrentSec(t);
              }}
              className="flex-1 h-1 rounded appearance-none cursor-pointer"
              style={{ accentColor: 'var(--blue-500)' }}
            />
            <button
              onClick={addClipFromSource}
              title="Marcar punto de corte aquí"
              className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
              style={{ background: 'var(--navy-700)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}
            >
              <Scissors size={11} /> Marcar
            </button>
          </div>
        </div>

        {/* Clip list panel */}
        <aside className="w-56 flex-shrink-0 flex flex-col border-l overflow-hidden"
               style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>
          <div className="px-3 py-2 border-b flex-shrink-0"
               style={{ borderColor: 'var(--surface-border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>CLIPS EN TIMELINE</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {layoutedClips.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Añadí clips desde el video o importá desde eventos del partido.
                </p>
              </div>
            ) : (
              layoutedClips.map((clip, idx) => {
                const src      = videoSources.find((s) => s.assetId === clip.video_asset_id);
                const isActive = clip.id === selectedClipId;
                return (
                  <div
                    key={clip.id}
                    onClick={() => { setSelectedClipId(clip.id); previewClip(clip.id); }}
                    className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer transition-all"
                    style={{
                      borderColor: 'var(--surface-border)',
                      background:  isActive ? 'var(--navy-700)' : 'transparent',
                    }}
                  >
                    <span className="text-xs font-mono w-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                        {src?.name ?? 'Video'}
                      </p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {formatDuration(clip.source_start)} → {formatDuration(clip.source_end)}
                        <span className="ml-1">({formatDuration(clip.source_end - clip.source_start)})</span>
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:text-red-400"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* ── Timeline track ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t" style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>

        {/* Ruler */}
        <div className="px-4 pt-2 pb-1 overflow-x-auto">
          <div style={{ width: timelineWidth, height: 16, position: 'relative', minWidth: '100%' }}>
            {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
              <div key={i} style={{ position: 'absolute', left: i * PX_PER_SEC, top: 0 }}>
                <div style={{ width: 1, height: 6, background: 'var(--surface-border)' }} />
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 2 }}>
                  {formatDuration(i)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Track */}
        <div className="px-4 pb-4 overflow-x-auto">
          <div
            className="timeline-track"
            style={{ width: timelineWidth, height: TRACK_H, minWidth: '100%', position: 'relative' }}
          >
            {layoutedClips.map((clip) => {
              const left  = clip.start_in_timeline * PX_PER_SEC;
              const width = (clip.end_in_timeline - clip.start_in_timeline) * PX_PER_SEC;
              const isActive = clip.id === selectedClipId;
              return (
                <div
                  key={clip.id}
                  className={`timeline-clip ${isActive ? 'selected' : ''}`}
                  style={{ left, width }}
                  onClick={() => { setSelectedClipId(clip.id); previewClip(clip.id); }}
                  title={`${formatDuration(clip.source_start)} → ${formatDuration(clip.source_end)}`}
                >
                  {/* Left trim handle */}
                  <TrimHandle
                    side="left"
                    onDrag={(dx) => {
                      const src = videoSources.find((s) => s.assetId === clip.video_asset_id);
                      trimClip(clip.id, 'start', clip.source_start + dx / PX_PER_SEC, src?.duration ?? 9999);
                    }}
                  />
                  {/* Label */}
                  <span style={{
                    position: 'absolute', top: '50%', left: 8,
                    transform: 'translateY(-50%)',
                    fontSize: 10, fontFamily: 'var(--font-mono)',
                    color: 'rgba(255,255,255,.8)',
                    pointerEvents: 'none', userSelect: 'none',
                    maxWidth: width - 24, overflow: 'hidden', whiteSpace: 'nowrap',
                  }}>
                    {formatDuration(clip.source_end - clip.source_start)}
                  </span>
                  {/* Right trim handle */}
                  <TrimHandle
                    side="right"
                    onDrag={(dx) => {
                      const src = videoSources.find((s) => s.assetId === clip.video_asset_id);
                      trimClip(clip.id, 'end', clip.source_end + dx / PX_PER_SEC, src?.duration ?? 9999);
                    }}
                  />
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="timeline-playhead"
              style={{ left: currentSec * PX_PER_SEC }}
            />
          </div>
        </div>
      </div>

      {/* ── Export done banner ────────────────────────────────────────────── */}
      {exportStatus === 'done' && exportUrls.length > 0 && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-t"
             style={{
               borderColor: 'var(--surface-border)',
               background:  'rgba(132,204,22,.06)',
             }}>
          <div className="live-dot" style={{ background: 'var(--lime-500)' }} />
          <span className="text-sm" style={{ color: 'var(--lime-400)' }}>
            {exportUrls.length} clip{exportUrls.length > 1 ? 's' : ''} exportado{exportUrls.length > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 ml-auto">
            {exportUrls.map((url, i) => (
              <a key={i} href={url} download={`clip-${i + 1}.mp4`}
                 className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium"
                 style={{ background: 'var(--lime-600)', color: 'white' }}>
                <Download size={11} /> Clip {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {exportStatus === 'error' && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-t"
             style={{ borderColor: 'var(--surface-border)', background: 'rgba(239,68,68,.06)' }}>
          <AlertCircle size={14} style={{ color: 'var(--red-400)' }} />
          <span className="text-sm" style={{ color: 'var(--red-400)' }}>Error en la exportación. Intentá de nuevo.</span>
        </div>
      )}
    </div>
  );
}

// ─── TrimHandle ───────────────────────────────────────────────────────────────

function TrimHandle({ side, onDrag }: {
  side:   'left' | 'right';
  onDrag: (dx: number) => void;
}) {
  const startX = useRef<number | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;

    const onMove = (ev: MouseEvent) => {
      if (startX.current == null) return;
      onDrag(ev.clientX - startX.current);
      startX.current = ev.clientX;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [onDrag]);

  return (
    <div
      className="timeline-clip-handle"
      style={{ [side]: 0 }}
      onMouseDown={handleMouseDown}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
