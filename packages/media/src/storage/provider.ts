/**
 * @sportiq/media — Storage provider abstraction.
 *
 * The app NEVER calls Supabase Storage directly.
 * It always goes through StorageProvider.
 * Swapping to Cloudflare R2 = swap one import in config.ts.
 */

export interface UploadOptions {
  /** Override MIME type detection */
  contentType?: string;
  /** Make the file publicly accessible (default: false — private) */
  isPublic?: boolean;
  /** Callback for upload progress (0–100) */
  onProgress?: (pct: number) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface SignedUrlOptions {
  /** Expiry in seconds (default: 900 = 15 minutes) */
  expiresIn?: number;
  /** If true, return a download URL (forces browser download) */
  download?: boolean;
}

export interface StorageProvider {
  /** Provider identifier for DB persistence */
  readonly name: string;

  /** Upload a file. Returns the stored path. */
  upload(
    path:    string,
    file:    File | Blob | ArrayBuffer,
    options?: UploadOptions,
  ): Promise<string>;

  /** Generate a short-lived signed URL for private access. */
  getSignedUrl(path: string, options?: SignedUrlOptions): Promise<string>;

  /** Delete a file at path. */
  delete(path: string): Promise<void>;

  /** Delete multiple files. Best-effort (no throw on partial failure). */
  deleteMany(paths: string[]): Promise<void>;

  /** Check if a file exists. */
  exists(path: string): Promise<boolean>;
}

// ─── Supabase Storage implementation ─────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = 'supabase';

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly bucket:   string,
  ) {}

  async upload(
    path:    string,
    file:    File | Blob | ArrayBuffer,
    options?: UploadOptions,
  ): Promise<string> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file, {
        contentType: options?.contentType,
        upsert:      false,
      });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return path;
  }

  async getSignedUrl(path: string, options?: SignedUrlOptions): Promise<string> {
    const expiresIn = options?.expiresIn ?? 900;
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn, {
        download: options?.download ?? false,
      });
    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${error?.message}`);
    }
    return data.signedUrl;
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([path]);
    if (error) throw new Error(`Storage delete failed: ${error.message}`);
  }

  async deleteMany(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    // Fire-and-forget batches of 100 (Supabase limit)
    const chunks = chunk(paths, 100);
    await Promise.allSettled(
      chunks.map((c) => this.supabase.storage.from(this.bucket).remove(c)),
    );
  }

  async exists(path: string): Promise<boolean> {
    // Supabase doesn't have a direct exists() — use getPublicUrl + HEAD trick
    // For private buckets we attempt a signed URL and catch errors
    try {
      await this.getSignedUrl(path, { expiresIn: 5 });
      return true;
    } catch {
      return false;
    }
  }
}

// ─── Path builders ────────────────────────────────────────────────────────────
// Centralizes storage path conventions to avoid scattered string concatenation.

export const StoragePaths = {
  video: (orgId: string, matchId: string, filename: string) =>
    `orgs/${orgId}/matches/${matchId}/videos/${filename}`,

  thumbnail: (orgId: string, clipSigId: string) =>
    `orgs/${orgId}/clips/${clipSigId}/thumbnail.jpg`,

  preview: (orgId: string, clipSigId: string) =>
    `orgs/${orgId}/clips/${clipSigId}/preview.mp4`,

  export: (orgId: string, clipSigId: string, format: string) =>
    `orgs/${orgId}/clips/${clipSigId}/export.${format}`,
} as const;

// ─── Utility ──────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}
