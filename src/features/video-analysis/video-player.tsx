/**
 * VideoPlayer — Unified player for uploaded files and YouTube videos.
 *
 * Exposes an imperative ref API so parent components can seek, play, pause
 * programmatically — e.g. "jump to this event's timestamp".
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import { loadYouTubeIframeApi } from '@/lib/youtube';
import type { VideoAsset } from '@/domain/video';

export interface VideoPlayerHandle {
  /** Jump to a specific timestamp (seconds). */
  seek: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

interface VideoPlayerProps {
  asset: VideoAsset;
  /** Signed URL when asset.source_type === 'upload'. */
  signedUrl?: string | null;
  /** Called every ~250ms with the current playback time. */
  onTimeUpdate?: (sec: number) => void;
  /** Called once when duration is known. */
  onDurationKnown?: (sec: number) => void;
  className?: string;
}

const TIME_UPDATE_INTERVAL_MS = 250;

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  { asset, signedUrl, onTimeUpdate, onDurationKnown, className },
  ref: Ref<VideoPlayerHandle>,
) {
  const isYouTube = asset.source_type === 'youtube' && !!asset.youtube_video_id;

  // ── Local <video> element refs ──────────────────────────────────────────
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  // ── YouTube player ──────────────────────────────────────────────────────
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const [ytReady, setYtReady] = useState(false);

  // ── Imperative handle (parent can call seek/play/pause/etc.) ───────────
  useImperativeHandle(
    ref,
    (): VideoPlayerHandle => ({
      seek: (sec: number) => {
        if (isYouTube) {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
            ytPlayerRef.current.seekTo(sec, true);
          }
        } else if (videoElRef.current) {
          videoElRef.current.currentTime = sec;
        }
      },
      play: () => {
        if (isYouTube) {
          ytPlayerRef.current?.playVideo?.();
        } else {
          videoElRef.current?.play().catch(() => undefined);
        }
      },
      pause: () => {
        if (isYouTube) {
          ytPlayerRef.current?.pauseVideo?.();
        } else {
          videoElRef.current?.pause();
        }
      },
      getCurrentTime: () => {
        if (isYouTube) {
          return typeof ytPlayerRef.current?.getCurrentTime === 'function'
            ? ytPlayerRef.current.getCurrentTime()
            : 0;
        }
        return videoElRef.current?.currentTime ?? 0;
      },
      getDuration: () => {
        if (isYouTube) {
          return typeof ytPlayerRef.current?.getDuration === 'function'
            ? ytPlayerRef.current.getDuration()
            : 0;
        }
        return videoElRef.current?.duration ?? 0;
      },
    }),
    [isYouTube],
  );

  // ── YouTube player lifecycle ────────────────────────────────────────────
  useEffect(() => {
    if (!isYouTube || !asset.youtube_video_id || !ytContainerRef.current) return;

    let cancelled = false;
    let player: any = null;

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !ytContainerRef.current) return;
        player = new YT.Player(ytContainerRef.current, {
          videoId: asset.youtube_video_id,
          playerVars: {
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            controls: 1,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              ytPlayerRef.current = player;
              setYtReady(true);
              const dur = player.getDuration?.() ?? 0;
              if (dur > 0) onDurationKnown?.(dur);
            },
          },
        });
      })
      .catch((err) => {
        console.error('[VideoPlayer] failed to load YouTube API:', err);
      });

    return () => {
      cancelled = true;
      try {
        player?.destroy?.();
      } catch {
        // ignore
      }
      ytPlayerRef.current = null;
      setYtReady(false);
    };
    // We intentionally only re-run when the video id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYouTube, asset.youtube_video_id]);

  // ── Time update polling (works for both player types) ───────────────────
  useEffect(() => {
    if (!onTimeUpdate) return;
    if (isYouTube && !ytReady) return;

    const interval = window.setInterval(() => {
      let t = 0;
      if (isYouTube) {
        try {
          t = ytPlayerRef.current?.getCurrentTime?.() ?? 0;
        } catch {
          t = 0;
        }
      } else if (videoElRef.current) {
        t = videoElRef.current.currentTime;
      }
      onTimeUpdate(t);
    }, TIME_UPDATE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isYouTube, ytReady, onTimeUpdate]);

  // ── Local video duration callback ───────────────────────────────────────
  const handleLoadedMetadata = useCallback(() => {
    if (videoElRef.current && onDurationKnown) {
      onDurationKnown(videoElRef.current.duration);
    }
  }, [onDurationKnown]);

  // ── Render ──────────────────────────────────────────────────────────────
  if (isYouTube) {
    return (
      <div className={className ?? 'relative w-full bg-black aspect-video'}>
        <div ref={ytContainerRef} className="w-full h-full" />
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className={className ?? 'relative w-full bg-black aspect-video flex items-center justify-center text-muted-fg text-sm'}>
        Cargando video…
      </div>
    );
  }

  return (
    <div className={className ?? 'relative w-full bg-black aspect-video'}>
      <video
        ref={videoElRef}
        src={signedUrl}
        controls
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        className="w-full h-full"
      />
    </div>
  );
});
