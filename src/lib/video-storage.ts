/**
 * Video storage helpers — Handball-Pro flavor.
 *
 * Handball-Pro stores matches in the `partidos` table with TEXT ids (not UUIDs),
 * and doesn't use organizations. So video_assets/clips are owned directly by
 * the authenticated user and link to the local match id via `match_local_id`.
 */

import { supabase } from './supabase';
import type { VideoAsset, VideoSourceType } from '@/domain/video';

const BUCKET = 'match-videos';
const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

export interface UploadProgress {
  loaded: number;
  total: number;
  pct: number;
}

export interface UploadOptions {
  userId: string;
  matchLocalId: string;
  file: File;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}

export interface VideoUploadResult {
  storagePath: string;
  fileSize: number;
  mimeType: string;
  originalName: string;
}

export const uploadVideoFile = async ({
  userId,
  matchLocalId,
  file,
  onProgress,
  signal,
}: UploadOptions): Promise<VideoUploadResult> => {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`El archivo supera el l\u00edmite de ${(MAX_SIZE_BYTES / 1024 / 1024 / 1024).toFixed(0)}GB`);
  }
  if (signal?.aborted) throw new Error('Upload aborted');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const safeMatchId = matchLocalId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const rand = crypto.randomUUID().split('-')[0];
  const storagePath = `${userId}/${safeMatchId}/${rand}-${safeName}`;

  onProgress?.({ loaded: 0, total: file.size, pct: 0 });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'video/mp4',
    });

  if (error) throw error;

  onProgress?.({ loaded: file.size, total: file.size, pct: 100 });

  return {
    storagePath,
    fileSize: file.size,
    mimeType: file.type || 'video/mp4',
    originalName: file.name,
  };
};

export const getVideoSignedUrl = async (storagePath: string, expiresIn = 3600): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Failed to create signed URL');
  }
  return data.signedUrl;
};

export const deleteVideoFile = async (storagePath: string): Promise<void> => {
  try {
    await supabase.storage.from(BUCKET).remove([storagePath]);
  } catch {
    // best-effort
  }
};

// ─── Database helpers ─────────────────────────────────────────────────────────

export interface CreateVideoAssetInput {
  userId: string;
  matchLocalId: string;
  sourceType: VideoSourceType;
  storagePath?: string;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  originalName?: string;
}

export const createVideoAsset = async (input: CreateVideoAssetInput): Promise<VideoAsset> => {
  const row = {
    user_id:          input.userId,
    org_id:           null,
    match_id:         null,
    match_local_id:   input.matchLocalId,
    source_type:      input.sourceType,
    storage_path:     input.storagePath ?? '',
    youtube_url:      input.youtubeUrl ?? null,
    youtube_video_id: input.youtubeVideoId ?? null,
    duration:         input.duration ?? null,
    file_size:        input.fileSize ?? null,
    mime_type:        input.mimeType ?? null,
    original_name:    input.originalName ?? null,
    status:           'ready' as const,
    bucket:           BUCKET,
    provider:         'supabase',
  };

  const { data, error } = await supabase
    .from('video_assets')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return data as VideoAsset;
};

export const getVideoAssetForMatch = async (matchLocalId: string): Promise<VideoAsset | null> => {
  const { data, error } = await supabase
    .from('video_assets')
    .select('*')
    .eq('match_local_id', matchLocalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as VideoAsset | null) ?? null;
};

export const deleteVideoAsset = async (id: string, storagePath?: string): Promise<void> => {
  if (storagePath) await deleteVideoFile(storagePath);
  const { error } = await supabase.from('video_assets').delete().eq('id', id);
  if (error) throw error;
};
