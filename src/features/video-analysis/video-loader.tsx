/**
 * VideoLoader — Initial screen shown when a match has no video yet.
 *
 * Two paths:
 *   1) Upload a video file from disk
 *   2) Paste a YouTube URL
 */

import { useCallback, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { uploadVideoFile, createVideoAsset } from '@/lib/video-storage';
import { parseYouTubeUrl } from '@/lib/youtube';
import type { VideoAsset } from '@/domain/video';

interface VideoLoaderProps {
  userId: string;
  matchLocalId: string;
  onLoaded: (asset: VideoAsset) => void;
}

type Mode = 'choose' | 'youtube' | 'upload';

export const VideoLoader = ({ userId, matchLocalId, onLoaded }: VideoLoaderProps) => {
  const [mode, setMode] = useState<Mode>('choose');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [ytUrl, setYtUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputId = useId();

  // ── YouTube ─────────────────────────────────────────────────────────────
  const handleYoutubeLoad = useCallback(async () => {
    setError(null);
    const videoId = parseYouTubeUrl(ytUrl);
    if (!videoId) {
      setError('No pude reconocer ese link de YouTube. Pegá uno como https://youtube.com/watch?v=XXXX');
      return;
    }
    setBusy(true);
    try {
      const asset = await createVideoAsset({
        userId,
        matchLocalId,
        sourceType: 'youtube',
        youtubeUrl: ytUrl.trim(),
        youtubeVideoId: videoId,
      });
      onLoaded(asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el link');
    } finally {
      setBusy(false);
    }
  }, [ytUrl, userId, matchLocalId, onLoaded]);

  // ── Upload ──────────────────────────────────────────────────────────────
  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith('video/')) {
        setError('Ese archivo no parece un video.');
        return;
      }
      setBusy(true);
      setProgressPct(0);
      try {
        const result = await uploadVideoFile({
          userId,
          matchLocalId,
          file,
          onProgress: (p) => setProgressPct(p.pct),
        });
        const asset = await createVideoAsset({
          userId,
          matchLocalId,
          sourceType: 'upload',
          storagePath: result.storagePath,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
          originalName: result.originalName,
        });
        onLoaded(asset);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo subir el video');
      } finally {
        setBusy(false);
      }
    },
    [userId, matchLocalId, onLoaded],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ── Render ──────────────────────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <Card>
        <CardContent className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Agregar video del partido</h2>
            <p className="text-sm text-muted-fg">
              Subí el video desde tu computadora o pegá un link de YouTube.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="secondary"
              onClick={() => setMode('upload')}
              className="h-28 flex flex-col items-center justify-center gap-2"
            >
              <UploadIcon />
              <span className="text-sm font-medium">Subir archivo</span>
              <span className="text-[10px] text-muted-fg">Desde tu computadora</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => setMode('youtube')}
              className="h-28 flex flex-col items-center justify-center gap-2"
            >
              <YouTubeIcon />
              <span className="text-sm font-medium">Pegar link de YouTube</span>
              <span className="text-[10px] text-muted-fg">Si ya está subido al canal</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'youtube') {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Link de YouTube</h2>
            <Button variant="ghost" size="sm" onClick={() => setMode('choose')} disabled={busy}>
              Volver
            </Button>
          </div>

          <input
            type="url"
            value={ytUrl}
            onChange={(e) => setYtUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-3 py-2 rounded-md bg-bg-elevated border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            disabled={busy}
          />

          {error && <div className="text-xs text-danger">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMode('choose')} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleYoutubeLoad} disabled={busy || !ytUrl.trim()}>
              {busy ? 'Guardando…' : 'Cargar video'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // mode === 'upload'
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Subir video</h2>
          <Button variant="ghost" size="sm" onClick={() => setMode('choose')} disabled={busy}>
            Volver
          </Button>
        </div>

        <label
          htmlFor={fileInputId}
          className="block border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInput}
            disabled={busy}
            className="sr-only"
          />
          <UploadIcon />
          <div className="mt-2 text-sm font-medium">Hacé click o arrastrá un video</div>
          <div className="text-xs text-muted-fg mt-1">MP4, MOV, WebM — hasta 2GB</div>
        </label>

        {busy && (
          <div className="space-y-1">
            <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-[11px] text-muted-fg text-right">{progressPct}%</div>
          </div>
        )}

        {error && <div className="text-xs text-danger">{error}</div>}
      </CardContent>
    </Card>
  );
};

// ─── Inline icons ────────────────────────────────────────────────────────────

const UploadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const YouTubeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="mx-auto">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);
