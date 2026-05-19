/**
 * YouTube helpers.
 *
 *  - parseYouTubeUrl: extract video id from any common YouTube URL shape
 *  - loadYouTubeIframeApi: load the IFrame API script once and resolve when ready
 */

/**
 * Parse a YouTube URL and return the video id, or null if invalid.
 *
 * Supports:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 *   https://m.youtube.com/watch?v=VIDEO_ID
 */
export const parseYouTubeUrl = (raw: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Direct 11-char id
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '');
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = url.searchParams.get('v');
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

      const pathParts = url.pathname.split('/').filter(Boolean);
      // /embed/VIDEO_ID, /shorts/VIDEO_ID, /v/VIDEO_ID
      if (['embed', 'shorts', 'v'].includes(pathParts[0] ?? '')) {
        const id = pathParts[1];
        if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return id;
      }
    }
  } catch {
    return null;
  }

  return null;
};

// ─── YouTube IFrame API loader ────────────────────────────────────────────────

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<typeof window.YT> | null = null;

/**
 * Load the YouTube IFrame API exactly once.
 * Resolves with the global `YT` namespace, which provides `YT.Player`, `YT.PlayerState`, etc.
 */
export const loadYouTubeIframeApi = (): Promise<typeof window.YT> => {
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('YouTube IFrame API requires a browser'));
      return;
    }

    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src*="youtube.com/iframe_api"]');
    const installCallback = () => {
      window.onYouTubeIframeAPIReady = () => {
        if (window.YT && window.YT.Player) resolve(window.YT);
        else reject(new Error('YouTube IFrame API loaded but YT.Player is missing'));
      };
    };

    if (existing) {
      installCallback();
    } else {
      installCallback();
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => reject(new Error('Failed to load YouTube IFrame API script'));
      document.body.appendChild(tag);
    }
  });

  return ytApiPromise;
};
