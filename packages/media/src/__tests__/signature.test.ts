/**
 * @sportiq/media — ClipSignature engine tests.
 */

import { describe, it, expect } from 'vitest';
import {
  computeSigHash,
  buildClipSignature,
  validateClipBounds,
  layoutClips,
  timelineDuration,
} from '../clip/signature';
import type { OverlaySpec } from '../types/index';

// ─── computeSigHash ───────────────────────────────────────────────────────────

describe('computeSigHash', () => {
  it('produces a non-empty hash string', async () => {
    const h = await computeSigHash({
      videoAssetId: 'asset-1',
      startSec:     10.0,
      endSec:       25.0,
      overlays:     [],
    });
    expect(typeof h).toBe('string');
    expect(h.length).toBeGreaterThan(0);
  });

  it('is deterministic — same inputs produce same hash', async () => {
    const input = { videoAssetId: 'asset-abc', startSec: 5.5, endSec: 30.0, overlays: [] };
    const h1 = await computeSigHash(input);
    const h2 = await computeSigHash(input);
    expect(h1).toBe(h2);
  });

  it('differs when videoAssetId changes', async () => {
    const base = { startSec: 10, endSec: 20, overlays: [] };
    const h1 = await computeSigHash({ videoAssetId: 'asset-A', ...base });
    const h2 = await computeSigHash({ videoAssetId: 'asset-B', ...base });
    expect(h1).not.toBe(h2);
  });

  it('differs when startSec changes', async () => {
    const base = { videoAssetId: 'asset-1', endSec: 20, overlays: [] };
    const h1 = await computeSigHash({ startSec: 10.0, ...base });
    const h2 = await computeSigHash({ startSec: 10.1, ...base });
    expect(h1).not.toBe(h2);
  });

  it('differs when endSec changes', async () => {
    const base = { videoAssetId: 'asset-1', startSec: 10, overlays: [] };
    const h1 = await computeSigHash({ endSec: 20.0, ...base });
    const h2 = await computeSigHash({ endSec: 20.5, ...base });
    expect(h1).not.toBe(h2);
  });

  it('is order-independent for overlays (canonical sort)', async () => {
    const base = { videoAssetId: 'asset-1', startSec: 5, endSec: 15 };
    const ov1: OverlaySpec = { type: 'text',  frame_sec: 3, data: { text: 'Hello' } };
    const ov2: OverlaySpec = { type: 'arrow', frame_sec: 1, data: { x: 10, y: 20 } };
    const h1 = await computeSigHash({ ...base, overlays: [ov1, ov2] });
    const h2 = await computeSigHash({ ...base, overlays: [ov2, ov1] });
    expect(h1).toBe(h2);
  });

  it('differs when overlays change', async () => {
    const base = { videoAssetId: 'asset-1', startSec: 5, endSec: 15 };
    const h1 = await computeSigHash({ ...base, overlays: [] });
    const h2 = await computeSigHash({
      ...base,
      overlays: [{ type: 'text', frame_sec: 3, data: { text: 'Goal!' } }],
    });
    expect(h1).not.toBe(h2);
  });

  it('3-decimal precision: 10.001 ≠ 10.002', async () => {
    const base = { videoAssetId: 'asset-1', endSec: 20, overlays: [] };
    const h1 = await computeSigHash({ startSec: 10.001, ...base });
    const h2 = await computeSigHash({ startSec: 10.002, ...base });
    expect(h1).not.toBe(h2);
  });

  it('3-decimal precision: 10.0001 == 10.0002 (truncated)', async () => {
    const base = { videoAssetId: 'asset-1', endSec: 20, overlays: [] };
    const h1 = await computeSigHash({ startSec: 10.0001, ...base });
    const h2 = await computeSigHash({ startSec: 10.0002, ...base });
    expect(h1).toBe(h2);
  });
});

// ─── buildClipSignature ───────────────────────────────────────────────────────

describe('buildClipSignature', () => {
  it('includes all input fields', async () => {
    const sig = await buildClipSignature({
      id:           'sig-id',
      videoAssetId: 'asset-1',
      startSec:     5,
      endSec:       30,
      overlays:     [],
    });
    expect(sig.id).toBe('sig-id');
    expect(sig.video_asset_id).toBe('asset-1');
    expect(sig.start_sec).toBe(5);
    expect(sig.end_sec).toBe(30);
    expect(sig.overlays).toEqual([]);
    expect(sig.sig_hash).toBeTruthy();
  });

  it('defaults overlays to empty array', async () => {
    const sig = await buildClipSignature({
      id: 'x', videoAssetId: 'a', startSec: 0, endSec: 10,
    });
    expect(sig.overlays).toEqual([]);
  });

  it('sig_hash matches computeSigHash output', async () => {
    const params = { id: 'x', videoAssetId: 'a', startSec: 3.5, endSec: 12.0, overlays: [] };
    const sig  = await buildClipSignature(params);
    const hash = await computeSigHash({
      videoAssetId: params.videoAssetId,
      startSec:     params.startSec,
      endSec:       params.endSec,
      overlays:     [],
    });
    expect(sig.sig_hash).toBe(hash);
  });
});

// ─── validateClipBounds ───────────────────────────────────────────────────────

describe('validateClipBounds', () => {
  it('accepts valid bounds', () => {
    expect(validateClipBounds(10, 30).valid).toBe(true);
  });

  it('rejects negative start', () => {
    const r = validateClipBounds(-1, 10);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /negative/.test(e))).toBe(true);
  });

  it('rejects end <= start', () => {
    expect(validateClipBounds(10, 10).valid).toBe(false);
    expect(validateClipBounds(15, 10).valid).toBe(false);
  });

  it('rejects clips shorter than 0.5s', () => {
    expect(validateClipBounds(10, 10.3).valid).toBe(false);
  });

  it('rejects clips longer than 1 hour', () => {
    expect(validateClipBounds(0, 3601).valid).toBe(false);
  });

  it('rejects end beyond video duration', () => {
    const r = validateClipBounds(0, 120, 90);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /duration/.test(e))).toBe(true);
  });

  it('accepts end equal to video duration', () => {
    expect(validateClipBounds(0, 90, 90).valid).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const r = validateClipBounds(-5, -10);
    expect(r.errors.length).toBeGreaterThan(1);
  });
});

// ─── layoutClips ──────────────────────────────────────────────────────────────

describe('layoutClips', () => {
  const clips = [
    { id: 'c1', source_start: 10, source_end: 20 },   // 10s
    { id: 'c2', source_start: 30, source_end: 35 },   // 5s
    { id: 'c3', source_start: 0,  source_end: 8  },   // 8s
  ];

  it('lays out sequentially with no gap', () => {
    const result = layoutClips(clips, 0);
    expect(result[0]!.start_in_timeline).toBe(0);
    expect(result[0]!.end_in_timeline).toBe(10);
    expect(result[1]!.start_in_timeline).toBe(10);
    expect(result[1]!.end_in_timeline).toBe(15);
    expect(result[2]!.start_in_timeline).toBe(15);
    expect(result[2]!.end_in_timeline).toBe(23);
  });

  it('lays out with gap between clips', () => {
    const result = layoutClips(clips, 2);
    expect(result[0]!.end_in_timeline).toBe(10);
    expect(result[1]!.start_in_timeline).toBe(12);   // 10 + 2s gap
    expect(result[1]!.end_in_timeline).toBe(17);
    expect(result[2]!.start_in_timeline).toBe(19);   // 17 + 2s gap
  });

  it('preserves source times', () => {
    const result = layoutClips(clips, 0);
    expect(result[0]!.source_start).toBe(10);
    expect(result[0]!.source_end).toBe(20);
    expect(result[1]!.source_start).toBe(30);
  });

  it('computes duration per clip', () => {
    const result = layoutClips(clips, 0);
    expect(result[0]!.duration).toBe(10);
    expect(result[1]!.duration).toBe(5);
    expect(result[2]!.duration).toBe(8);
  });

  it('handles empty input', () => {
    expect(layoutClips([], 0)).toEqual([]);
  });

  it('handles single clip', () => {
    const result = layoutClips([{ id: 'x', source_start: 5, source_end: 15 }], 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.start_in_timeline).toBe(0);
    expect(result[0]!.end_in_timeline).toBe(10);
  });
});

// ─── timelineDuration ─────────────────────────────────────────────────────────

describe('timelineDuration', () => {
  it('returns 0 for empty timeline', () => {
    expect(timelineDuration([])).toBe(0);
  });

  it('returns end_in_timeline of last clip', () => {
    const layouts = layoutClips([
      { id: 'a', source_start: 0, source_end: 10 },
      { id: 'b', source_start: 0, source_end: 5  },
    ], 0);
    expect(timelineDuration(layouts)).toBe(15);
  });

  it('accounts for gaps in total duration', () => {
    const layouts = layoutClips([
      { id: 'a', source_start: 0, source_end: 10 },
      { id: 'b', source_start: 0, source_end: 5  },
    ], 3);
    expect(timelineDuration(layouts)).toBe(18); // 10 + 3 + 5
  });
});
