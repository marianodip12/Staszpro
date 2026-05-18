/**
 * apps/web — useVideoUpload hook.
 *
 * Replaces the IndexedDB-based video storage from the Analizador.
 * Videos are uploaded to Supabase Storage (private bucket) via StorageProvider.
 * A video_assets row is created before upload starts so the UI can track state.
 *
 * Upload flow:
 *  1. Create video_assets row with status='uploading'
 *  2. Upload file to storage path: orgs/{orgId}/matches/{matchId}/videos/{filename}
 *  3. Update row with status='ready' and file metadata
 *  4. On error: update row with status='error'
 */

import { useState, useCallback, useRef } from 'react';
import { useSupabase } from '@/lib/supabase';
import { useStorageProvider } from '@/lib/storage';
import { StoragePaths } from '@sportiq/media/storage';
import type { VideoAsset, UploadProgress } from '@sportiq/media';

interface UseVideoUploadOptions {
  orgId:   string;
  matchId: string;
  onSuccess?: (asset: VideoAsset) => void;
  onError?:   (error: Error) => void;
}

export function useVideoUpload({ orgId, matchId, onSuccess, onError }: UseVideoUploadOptions) {
  const supabase       = useSupabase();
  const storageProvider = useStorageProvider();
  const abortRef       = useRef<AbortController | null>(null);

  const [progress, setProgress]   = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [assetId, setAssetId]     = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    if (isUploading) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setIsUploading(true);
    setProgress({
      file_name:  file.name,
      bytes_sent: 0,
      total_bytes: file.size,
      pct:         0,
      status:      'pending',
    });

    let videoAssetId: string | null = null;

    try {
      // 1. Create the DB row first (status='uploading')
      const { data: asset, error: insertError } = await supabase
        .from('video_assets')
        .insert({
          org_id:        orgId,
          match_id:      matchId,
          storage_path:  '',           // filled after upload
          provider:      'supabase',
          bucket:        'videos',
          original_name: file.name,
          file_size:     file.size,
          mime_type:     file.type,
          status:        'uploading',
        })
        .select('*')
        .single();

      if (insertError || !asset) throw insertError ?? new Error('Failed to create asset record');

      videoAssetId = asset.id;
      setAssetId(asset.id);

      // 2. Build the storage path
      const ext  = file.name.split('.').pop() ?? 'mp4';
      const path = StoragePaths.video(orgId, matchId, `${asset.id}.${ext}`);

      setProgress((p) => p ? { ...p, status: 'uploading' } : null);

      // 3. Upload via StorageProvider (abstracted — works with Supabase or R2)
      await storageProvider.upload(path, file, {
        contentType: file.type,
        signal:      controller.signal,
        onProgress:  (pct) => {
          setProgress((p) => p
            ? { ...p, pct, bytes_sent: Math.floor(file.size * pct / 100) }
            : null
          );
        },
      });

      // 4. Extract video duration via browser API
      const duration = await getVideoDuration(file).catch(() => null);

      // 5. Update the row with final metadata
      const { data: updatedAsset, error: updateError } = await supabase
        .from('video_assets')
        .update({
          storage_path: path,
          duration,
          status:       'ready',
        })
        .eq('id', videoAssetId)
        .select('*')
        .single();

      if (updateError) throw updateError;

      setProgress((p) => p ? { ...p, pct: 100, status: 'done' } : null);
      onSuccess?.(updatedAsset as VideoAsset);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');

      // Mark error in DB if we got that far
      if (videoAssetId) {
        try {
          await supabase
            .from('video_assets')
            .update({ status: 'error' })
            .eq('id', videoAssetId);
        } catch {
          // best-effort, ignore DB errors
        }
      }

      setProgress((p) => p ? { ...p, status: 'error', error: error.message } : null);

      // Don't report abort as error
      if (error.name !== 'AbortError') {
        onError?.(error);
      }
    } finally {
      setIsUploading(false);
      abortRef.current = null;
    }
  }, [orgId, matchId, isUploading, supabase, storageProvider, onSuccess, onError]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setProgress(null);
    setAssetId(null);
    setIsUploading(false);
  }, []);

  return { upload, cancel, reset, progress, isUploading, assetId };
}

// ─── Utility: extract video duration from a File ─────────────────────────────

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Could not read video metadata'));
    };
    video.src = URL.createObjectURL(file);
  });
}
