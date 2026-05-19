/**
 * Video Analysis — Domain types.
 *
 * A match can have ONE video asset (uploaded file or YouTube link).
 * Clips are time ranges within that video, optionally tied to a match event.
 * Annotations are drawings/text overlaid on the clip at specific timestamps.
 */

export type VideoSourceType = 'upload' | 'youtube';

export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface VideoAsset {
  id: string;
  org_id: string;
  match_id: string | null;
  source_type: VideoSourceType;
  /** For 'upload': Supabase Storage path. For 'youtube': empty. */
  storage_path: string;
  /** For 'youtube': full URL pasted by user. */
  youtube_url: string | null;
  /** Extracted video id (e.g. 'dQw4w9WgXcQ'). */
  youtube_video_id: string | null;
  duration: number | null;
  file_size: number | null;
  mime_type: string | null;
  original_name: string | null;
  status: VideoStatus;
  bucket: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface Clip {
  id: string;
  org_id: string;
  match_id: string | null;
  video_asset_id: string;
  /** Match event this clip is associated with (optional). */
  event_id: string | null;
  title: string;
  start_sec: number;
  end_sec: number;
  notes: string | null;
  thumbnail_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Shape of an annotation's `data` JSON column. Discriminated by `kind`. */
export type AnnotationData =
  | { x1: number; y1: number; x2: number; y2: number }                                              // arrow, line
  | { cx: number; cy: number; r: number }                                                            // circle
  | { x: number; y: number; w: number; h: number }                                                   // rect
  | { x: number; y: number; text: string; size?: number }                                            // text
  | { points: Array<{ x: number; y: number }>; width?: number };                                     // freehand

export type AnnotationKind = 'arrow' | 'line' | 'circle' | 'rect' | 'text' | 'freehand';

export interface Annotation {
  id: string;
  org_id: string;
  clip_id: string;
  /** Annotation visible during this time window (in clip-local seconds). */
  start_sec: number;
  end_sec: number;
  kind: AnnotationKind;
  /** Coordinates normalized to 0..1 (resolution-independent). */
  data: AnnotationData;
  color: string;
  created_by: string | null;
  created_at: string;
}

// ─── Suggested clip duration around an event ──────────────────────────────────

/** Default seconds BEFORE the event timestamp to start a clip. */
export const DEFAULT_CLIP_PRE_SEC = 5;
/** Default seconds AFTER the event timestamp to end a clip. */
export const DEFAULT_CLIP_POST_SEC = 8;

/**
 * Convert a match event minute to an approximate video timestamp in seconds.
 * Assumes the video starts at minute 0 of the match (caller can pass an offset).
 */
export const eventToVideoSeconds = (matchMinute: number, offsetSec = 0): number =>
  Math.max(0, matchMinute * 60 + offsetSec);
