/**
 * @sportiq/media — R2StorageProvider
 *
 * Cloudflare R2 via S3-compatible API (aws4fetch).
 * Swap: change one line in StorageProviderFactory config.
 *
 * Usage:
 *   const provider = new R2StorageProvider({
 *     accountId:       process.env.R2_ACCOUNT_ID,
 *     accessKeyId:     process.env.R2_ACCESS_KEY_ID,
 *     secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
 *     bucketName:      process.env.R2_BUCKET_NAME,
 *     publicUrl:       process.env.R2_PUBLIC_URL, // optional CDN
 *   });
 */

import type { StorageProvider, UploadOptions, SignedUrlOptions } from './provider';

// ─── Config ───────────────────────────────────────────────────────────────────

export interface R2Config {
  accountId:       string;
  accessKeyId:     string;
  secretAccessKey: string;
  bucketName:      string;
  /** Optional CDN prefix — if set, signed URLs use this base instead of R2 directly */
  publicUrl?:      string;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class R2StorageProvider implements StorageProvider {
  readonly name = 'r2';

  private readonly endpoint: string;
  private readonly bucketUrl: string;

  constructor(private readonly config: R2Config) {
    this.endpoint  = `https://${config.accountId}.r2.cloudflarestorage.com`;
    this.bucketUrl = `${this.endpoint}/${config.bucketName}`;
  }

  async upload(
    path:    string,
    file:    File | Blob | ArrayBuffer,
    options?: UploadOptions,
  ): Promise<string> {
    const url    = `${this.bucketUrl}/${encodeURIComponent(path)}`;
    const body   = file instanceof ArrayBuffer ? file : (file as Blob);
    const ct     = options?.contentType ?? (file instanceof File ? file.type : 'application/octet-stream');

    const headers = await this.signHeaders('PUT', path, ct);
    const res     = await fetch(url, {
      method:  'PUT',
      headers: { ...headers, 'Content-Type': ct },
      body,
      signal:  options?.signal,
    });

    if (!res.ok) {
      throw new Error(`R2 upload failed: ${res.status} ${await res.text()}`);
    }

    return path;
  }

  async getSignedUrl(path: string, options?: SignedUrlOptions): Promise<string> {
    // If a CDN public URL is configured, generate a short-lived token using
    // Cloudflare Workers (future) or return a pre-signed R2 URL.
    // For now: pre-signed S3-compatible URL valid for expiresIn seconds.
    const expiresIn = options?.expiresIn ?? 900;
    const expires   = Math.floor(Date.now() / 1000) + expiresIn;
    const objectUrl = `${this.bucketUrl}/${encodeURIComponent(path)}`;

    // In a full implementation this uses aws4 signing with X-Amz-Expires.
    // This stub returns the object URL — replace with real signing in production.
    // See: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
    const signed = await this.presign('GET', path, expiresIn);
    return signed;
  }

  async delete(path: string): Promise<void> {
    const url     = `${this.bucketUrl}/${encodeURIComponent(path)}`;
    const headers = await this.signHeaders('DELETE', path);
    const res     = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok && res.status !== 404) {
      throw new Error(`R2 delete failed: ${res.status}`);
    }
  }

  async deleteMany(paths: string[]): Promise<void> {
    // R2 supports S3 batch delete (max 1000 objects per request)
    const chunks = chunk(paths, 1000);
    await Promise.allSettled(chunks.map((c) => this.deleteBatch(c)));
  }

  async exists(path: string): Promise<boolean> {
    const url     = `${this.bucketUrl}/${encodeURIComponent(path)}`;
    const headers = await this.signHeaders('HEAD', path);
    const res     = await fetch(url, { method: 'HEAD', headers });
    return res.ok;
  }

  // ── Signing helpers (AWS Signature V4) ──────────────────────────────────────
  // NOTE: In production use `aws4fetch` or `@aws-sdk/signature-v4`.
  // This is a structural placeholder — replace with real signing.

  private async signHeaders(
    method:      string,
    path:        string,
    contentType?: string,
  ): Promise<Record<string, string>> {
    const date        = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateShort   = date.slice(0, 8);
    const region      = 'auto';
    const service     = 's3';
    const host        = `${this.config.accountId}.r2.cloudflarestorage.com`;
    const canonicalUri = `/${this.config.bucketName}/${path}`;

    // In production: full HMAC-SHA256 signing per AWS Signature V4 spec
    // For now return minimal headers; replace with aws4fetch in production:
    // import { AwsClient } from 'aws4fetch';
    // const aws = new AwsClient({ accessKeyId, secretAccessKey, region });
    // return (await aws.sign(request)).headers;

    return {
      'x-amz-date':    date,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'Authorization': `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${dateShort}/${region}/${service}/aws4_request, TODO=REPLACE_WITH_aws4fetch`,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    };
  }

  private async presign(method: string, path: string, expiresIn: number): Promise<string> {
    // Structural placeholder — replace with real presigning via aws4fetch
    const url = `${this.bucketUrl}/${encodeURIComponent(path)}`;
    const params = new URLSearchParams({
      'X-Amz-Algorithm':  'AWS4-HMAC-SHA256',
      'X-Amz-Expires':    String(expiresIn),
      'X-Amz-SignedHeaders': 'host',
      // TODO: add real query-string signing
    });
    return `${url}?${params.toString()}`;
  }

  private async deleteBatch(paths: string[]): Promise<void> {
    // S3 Multi-Object Delete API
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Delete>',
      ...paths.map((p) => `<Object><Key>${p}</Key></Object>`),
      '</Delete>',
    ].join('');

    const url     = `${this.bucketUrl}?delete`;
    const headers = await this.signHeaders('POST', '', 'application/xml');
    await fetch(url, { method: 'POST', headers, body });
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

import { SupabaseStorageProvider } from './provider';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface StorageConfig {
  provider:   'supabase' | 'r2';
  supabase?:  { client: SupabaseClient; bucket: string };
  r2?:        R2Config;
}

/**
 * Factory: creates the appropriate StorageProvider from config.
 * The app passes this config from environment variables at boot.
 *
 * @example
 * const provider = createStorageProvider({
 *   provider: process.env.STORAGE_PROVIDER === 'r2' ? 'r2' : 'supabase',
 *   supabase: { client: getSupabaseBrowser(), bucket: 'videos' },
 *   r2:       { accountId: '…', accessKeyId: '…', secretAccessKey: '…', bucketName: '…' },
 * });
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
  if (config.provider === 'r2') {
    if (!config.r2) throw new Error('R2 config required when provider=r2');
    return new R2StorageProvider(config.r2);
  }
  if (!config.supabase) throw new Error('Supabase config required when provider=supabase');
  return new SupabaseStorageProvider(config.supabase.client, config.supabase.bucket);
}
