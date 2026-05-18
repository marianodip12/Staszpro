/**
 * @sportiq/media — Media domain types.
 *
 * This package knows NOTHING about sports, teams, or matches.
 * It only deals with: files, clips, renders, and storage.
 *
 * The only connection to the sport domain is through string IDs
 * (org_id, match_id) — never through imported types from @sportiq/core.
 */

// ─── Storage ──────────────────────────────────────────────────────────────────

export type StorageProviderName = 'supabase' | 'r2' | 's3' | 'local';

export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface VideoAsset {
  id:            string;
  org_id:        string;
  /** Foreign key to a match — stored as plain string, no import from @sportiq/core */
  match_id:      string | null;
  storage_path:  string;          // path within the bucket
  provider:      StorageProviderName;
  bucket:        string;
  duration:      number | null;   // seconds
  file_size:     number | null;   // bytes
  mime_type:     string | null;
  status:        VideoStatus;
  /** Original filename uploaded by the user */
  original_name: string | null;
  created_at:    string;
  updated_at:    string;
}

// ─── Clip signature ───────────────────────────────────────────────────────────
// Represents the conceptual identity of a clip. Identical clips share the same
// sig_hash — this is the deduplication key for renders.

export interface OverlaySpec {
  type:      'text' | 'arrow' | 'rect' | 'ellipse' | 'draw';
  frame_sec: number;   // which video second this overlay applies to
  data:      unknown;  // shape-specific payload
}

export interface ClipSignature {
  id:             string;
  video_asset_id: string;
  /** SHA-256(video_asset_id + start + end + JSON(overlays sorted)) */
  sig_hash:       string;
  start_sec:      number;
  end_sec:        number;
  overlays:       OverlaySpec[];
  created_at:     string;
}

// ─── Render job ───────────────────────────────────────────────────────────────
// A request to materialize a ClipSignature into actual bytes.

export type RenderStatus = 'pending' | 'queued' | 'processing' | 'done' | 'error';
export type RenderFormat = 'mp4' | 'webm' | 'gif' | 'hls';

export interface RenderJob {
  id:                 string;
  clip_signature_id:  string;
  org_id:             string;
  requested_by:       string;   // user_id
  status:             RenderStatus;
  output_format:      RenderFormat;
  error_message:      string | null;
  requested_at:       string;
  started_at:         string | null;
  completed_at:       string | null;
}

// ─── Render asset ─────────────────────────────────────────────────────────────
// A materialized output file produced by a RenderJob.

export type RenderAssetType = 'thumbnail' | 'preview' | 'export' | 'hls_manifest';

export interface RenderAsset {
  id:             string;
  render_job_id:  string;
  asset_type:     RenderAssetType;
  storage_path:   string;
  provider:       StorageProviderName;
  file_size:      number | null;
  created_at:     string;
}

// ─── Timeline (clip editor state) ────────────────────────────────────────────
// Represents the editor's in-memory composition — stored as metadata/JSON,
// never as a rendered file until explicitly exported.

export interface TimelineClip {
  id:             string;    // local UUID
  video_asset_id: string;
  /** Position in the timeline composition */
  start_in_timeline: number;
  end_in_timeline:   number;
  /** Trim handles within the source video */
  source_start:   number;
  source_end:     number;
  overlays:       OverlaySpec[];
}

export interface Timeline {
  id:          string;
  org_id:      string;
  match_id:    string | null;
  name:        string;
  clips:       TimelineClip[];
  total_duration: number;
  created_at:  string;
  updated_at:  string;
}

// ─── Upload progress ──────────────────────────────────────────────────────────
// Used by UI hooks — not persisted to DB.

export interface UploadProgress {
  file_name:   string;
  bytes_sent:  number;
  total_bytes: number;
  pct:         number;
  status:      'pending' | 'uploading' | 'done' | 'error';
  error?:      string;
}
