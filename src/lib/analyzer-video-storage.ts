/**
 * Analyzer video asset storage.
 *
 * Persists the video associated with a match analysis so it survives refresh
 * and can be shared via public link.
 *
 *  - YouTube  → store the video id (lightweight, no upload)
 *  - Local    → upload the file to Supabase Storage (public bucket) + store path
 */

import { supabase } from './supabase';

const BUCKET = 'match-videos';

export interface AnalyzerVideoAsset {
  id: string;
  user_id: string | null;
  match_local_id: string | null;
  source_type: 'upload' | 'youtube';
  storage_path: string;
  youtube_url: string | null;
  youtube_video_id: string | null;
  original_name: string | null;
  file_size: number | null;
  share_token: string | null;
}

/** Get the most recent video asset for a match (analyzer). */
export const getAnalyzerVideo = async (matchLocalId: string): Promise<AnalyzerVideoAsset | null> => {
  const { data, error } = await supabase
    .from('video_assets')
    .select('id,user_id,match_local_id,source_type,storage_path,youtube_url,youtube_video_id,original_name,file_size,share_token')
    .eq('match_local_id', matchLocalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as AnalyzerVideoAsset | null) ?? null;
};

/** Get a video asset by its public share token (no auth needed). */
export const getAnalyzerVideoByShareToken = async (token: string): Promise<AnalyzerVideoAsset | null> => {
  const { data, error } = await supabase
    .from('video_assets')
    .select('id,user_id,match_local_id,source_type,storage_path,youtube_url,youtube_video_id,original_name,file_size,share_token')
    .eq('share_token', token)
    .maybeSingle();
  if (error) throw error;
  return (data as AnalyzerVideoAsset | null) ?? null;
};

/** Save a YouTube video reference for a match. */
export const saveYouTubeVideo = async (
  userId: string,
  matchLocalId: string,
  youtubeUrl: string,
  youtubeVideoId: string,
): Promise<AnalyzerVideoAsset> => {
  // Delete any prior asset for this match (one video per analysis)
  await supabase.from('video_assets').delete().eq('match_local_id', matchLocalId);

  const { data, error } = await supabase
    .from('video_assets')
    .insert({
      user_id: userId,
      org_id: null,
      match_id: null,
      match_local_id: matchLocalId,
      source_type: 'youtube',
      storage_path: '',
      youtube_url: youtubeUrl,
      youtube_video_id: youtubeVideoId,
      status: 'ready',
      bucket: BUCKET,
      provider: 'youtube',
    })
    .select('id,user_id,match_local_id,source_type,storage_path,youtube_url,youtube_video_id,original_name,file_size,share_token')
    .single();
  if (error) throw error;
  return data as AnalyzerVideoAsset;
};

/** Upload a local video file to Storage and save the asset record. */
export const uploadLocalVideo = async (
  userId: string,
  matchLocalId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<AnalyzerVideoAsset> => {
  const safeMatch = matchLocalId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const rand = crypto.randomUUID().split('-')[0];
  const storagePath = `${userId}/${safeMatch}/${rand}-${safeName}`;

  onProgress?.(5);

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'video/mp4',
    });
  if (upErr) throw upErr;

  onProgress?.(90);

  // Delete prior asset(s) for this match, and remove their storage objects
  const { data: prior } = await supabase
    .from('video_assets')
    .select('id,storage_path')
    .eq('match_local_id', matchLocalId);
  if (prior && prior.length > 0) {
    const paths = prior.map((p: { storage_path: string }) => p.storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    await supabase.from('video_assets').delete().eq('match_local_id', matchLocalId);
  }

  const { data, error } = await supabase
    .from('video_assets')
    .insert({
      user_id: userId,
      org_id: null,
      match_id: null,
      match_local_id: matchLocalId,
      source_type: 'upload',
      storage_path: storagePath,
      youtube_url: null,
      youtube_video_id: null,
      original_name: file.name,
      file_size: file.size,
      mime_type: file.type || 'video/mp4',
      status: 'ready',
      bucket: BUCKET,
      provider: 'supabase',
    })
    .select('id,user_id,match_local_id,source_type,storage_path,youtube_url,youtube_video_id,original_name,file_size,share_token')
    .single();
  if (error) throw error;

  onProgress?.(100);
  return data as AnalyzerVideoAsset;
};

/** Public URL for an uploaded video (bucket is public). */
export const getPublicVideoUrl = (storagePath: string): string => {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
};

/** Generate (or fetch existing) a share token for a match's video asset. */
export const ensureShareToken = async (matchLocalId: string): Promise<string> => {
  const existing = await getAnalyzerVideo(matchLocalId);
  if (existing?.share_token) return existing.share_token;
  if (!existing) throw new Error('No hay video cargado para compartir');

  const token = crypto.randomUUID().replace(/-/g, '');
  const { error } = await supabase
    .from('video_assets')
    .update({ share_token: token })
    .eq('id', existing.id);
  if (error) throw error;
  return token;
};
