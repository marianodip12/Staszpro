/**
 * @sportiq/media — Main entry point.
 * Exports media domain types, storage providers, and clip engine.
 */

export * from './types/index';
export { SupabaseStorageProvider, StoragePaths } from './storage/provider';
export type { StorageProvider, UploadOptions, SignedUrlOptions } from './storage/provider';
export { R2StorageProvider, createStorageProvider } from './storage/r2-provider';
export type { R2Config, StorageConfig } from './storage/r2-provider';
export {
  buildClipSignature,
  validateClipBounds,
  layoutClips,
  timelineDuration,
  computeSigHash,
} from './clip/signature';
export type { CreateClipSignatureParams, ClipLayout, ValidationResult } from './clip/signature';
