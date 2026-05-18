/**
 * @sportiq/core — Handball event mappers.
 *
 * Converts Supabase DB rows (MatchEvent) ↔ in-memory domain objects (HandballEvent).
 * This is the ONLY place that knows about both layers.
 *
 * Principle: DB rows are "dumb" — they use string columns.
 *            Domain objects are "smart" — they use typed enums and refined shapes.
 */

import type { MatchEvent } from '../../types/entities';
import type {
  CourtZoneId, GoalZoneId, HandballEvent,
  HandballEventType, Situation, ThrowType,
} from './types';

// ─── DB row → domain ──────────────────────────────────────────────────────────

export function rowToHandballEvent(row: MatchEvent): HandballEvent {
  return {
    id:         row.id,
    min:        row.minute,
    team:       row.team,
    type:       row.type as HandballEventType,
    zone:       (row.zone as CourtZoneId)   ?? null,
    goalZone:   (row.goal_zone as GoalZoneId) ?? null,
    situation:  (row.situation as Situation) ?? null,
    throwType:  (row.throw_type as ThrowType) ?? null,

    shooter: row.shooter_name != null && row.shooter_number != null
      ? { name: row.shooter_name, number: row.shooter_number }
      : null,

    goalkeeper: row.goalkeeper_name != null && row.goalkeeper_number != null
      ? { name: row.goalkeeper_name, number: row.goalkeeper_number }
      : null,

    sanctioned: row.sanctioned_name != null && row.sanctioned_number != null
      ? { name: row.sanctioned_name, number: row.sanctioned_number }
      : null,

    hScore:   row.home_score,
    aScore:   row.away_score,
    quickMode: row.quick_mode,
    completed: row.completed,

    videoAssetId: row.video_asset_id,
    clipStart:    row.clip_start,
    clipEnd:      row.clip_end,
  };
}

// ─── Domain → DB row (for inserts / updates) ─────────────────────────────────

export type HandballEventInsert = Omit<MatchEvent,
  'id' | 'created_at' | 'subtype' | 'detail' | 'qualifier'
>;

export function handballEventToRow(
  e: HandballEvent,
  matchId: string,
  orgId: string,
): HandballEventInsert {
  return {
    match_id:           matchId,
    org_id:             orgId,
    minute:             e.min,
    second:             null,
    team:               e.team,
    type:               e.type,
    zone:               e.zone ?? null,
    goal_zone:          e.goalZone ?? null,
    situation:          e.situation ?? null,
    throw_type:         e.throwType ?? null,

    shooter_name:       e.shooter?.name       ?? null,
    shooter_number:     e.shooter?.number      ?? null,
    goalkeeper_name:    e.goalkeeper?.name     ?? null,
    goalkeeper_number:  e.goalkeeper?.number   ?? null,
    sanctioned_name:    e.sanctioned?.name     ?? null,
    sanctioned_number:  e.sanctioned?.number   ?? null,

    home_score:         e.hScore,
    away_score:         e.aScore,
    quick_mode:         e.quickMode,
    completed:          e.completed,

    video_asset_id:     e.videoAssetId ?? null,
    clip_start:         e.clipStart    ?? null,
    clip_end:           e.clipEnd      ?? null,
  };
}

// ─── Score reconstruction ─────────────────────────────────────────────────────

/**
 * Replay events chronologically to stamp correct scores on each one.
 * Use when inserting events that don't carry a score snapshot yet.
 */
export function stampScores(events: HandballEvent[]): HandballEvent[] {
  const sorted = [...events].sort((a, b) => a.min - b.min);
  let h = 0, a = 0;
  return sorted.map((e) => {
    if (e.type === 'goal') {
      if (e.team === 'home') h++; else a++;
    }
    return { ...e, hScore: h, aScore: a };
  });
}
