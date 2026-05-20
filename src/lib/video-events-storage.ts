/**
 * Video Events — Supabase CRUD.
 *
 * Used exclusively by the Video Analyzer feature.
 * INDEPENDENT from live-match events.
 */

import { supabase } from './supabase';
import type {
  VideoEvent,
  VideoPlayer,
  VideoAnnotation,
  VideoTimeline,
  EventTipo,
  EventSubtype,
  EventDetail,
  EventQualifier,
  EventResult,
  AnnotationTool,
  TimelineSegment,
} from '@/domain/video-events';

// ════════════════════════════════════════════════════════════════════════════
// VIDEO EVENTS
// ════════════════════════════════════════════════════════════════════════════

export interface CreateVideoEventInput {
  userId:         string;
  matchLocalId:   string;
  videoAssetId:   string | null;
  time:           number;
  tipo:           EventTipo;
  subtype:        EventSubtype;
  detail:         EventDetail;
  qualifier:      EventQualifier;
  result:         EventResult;
  playerId:       string | null;
  playerName:     string | null;
  clipStart:      number;
  clipEnd:        number;
  videoFileIndex?: number | null;
}

export const createVideoEvent = async (input: CreateVideoEventInput): Promise<VideoEvent> => {
  const { data, error } = await supabase
    .from('video_events')
    .insert({
      user_id:          input.userId,
      match_local_id:   input.matchLocalId,
      video_asset_id:   input.videoAssetId,
      time:             input.time,
      tipo:             input.tipo,
      subtype:          input.subtype,
      detail:           input.detail,
      qualifier:        input.qualifier,
      result:           input.result,
      player_id:        input.playerId,
      player_name:      input.playerName,
      clip_start:       input.clipStart,
      clip_end:         input.clipEnd,
      video_file_index: input.videoFileIndex ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as VideoEvent;
};

export const listVideoEvents = async (matchLocalId: string): Promise<VideoEvent[]> => {
  const { data, error } = await supabase
    .from('video_events')
    .select('*')
    .eq('match_local_id', matchLocalId)
    .order('time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VideoEvent[];
};

export const updateVideoEvent = async (
  id: string,
  patch: Partial<{
    tipo:        EventTipo;
    subtype:     EventSubtype;
    detail:      EventDetail;
    qualifier:   EventQualifier;
    result:      EventResult;
    player_id:   string | null;
    player_name: string | null;
    time:        number;
    clip_start:  number;
    clip_end:    number;
  }>,
): Promise<VideoEvent> => {
  const { data, error } = await supabase
    .from('video_events')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as VideoEvent;
};

export const deleteVideoEvent = async (id: string): Promise<void> => {
  const { error } = await supabase.from('video_events').delete().eq('id', id);
  if (error) throw error;
};

// ════════════════════════════════════════════════════════════════════════════
// VIDEO PLAYERS
// ════════════════════════════════════════════════════════════════════════════

export interface CreateVideoPlayerInput {
  userId:       string;
  matchLocalId: string;
  name:         string;
  number?:      string | null;
}

export const createVideoPlayer = async (input: CreateVideoPlayerInput): Promise<VideoPlayer> => {
  const { data, error } = await supabase
    .from('video_players')
    .insert({
      user_id:        input.userId,
      match_local_id: input.matchLocalId,
      name:           input.name,
      number:         input.number ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as VideoPlayer;
};

export const listVideoPlayers = async (matchLocalId: string): Promise<VideoPlayer[]> => {
  const { data, error } = await supabase
    .from('video_players')
    .select('*')
    .eq('match_local_id', matchLocalId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VideoPlayer[];
};

export const updateVideoPlayer = async (
  id: string,
  patch: Partial<{ name: string; number: string | null }>,
): Promise<VideoPlayer> => {
  const { data, error } = await supabase
    .from('video_players')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as VideoPlayer;
};

export const deleteVideoPlayer = async (id: string): Promise<void> => {
  const { error } = await supabase.from('video_players').delete().eq('id', id);
  if (error) throw error;
};

// ════════════════════════════════════════════════════════════════════════════
// VIDEO ANNOTATIONS
// ════════════════════════════════════════════════════════════════════════════

export interface CreateVideoAnnotationInput {
  userId:        string;
  matchLocalId:  string;
  videoAssetId:  string | null;
  eventId?:      string | null;
  clipId?:       string | null;
  tool:          AnnotationTool;
  color:         string;
  size:          number;
  points:        Array<{ x: number; y: number }>;
  text?:         string | null;
  timeIn:        number;
  duration:      number;
}

export const createVideoAnnotation = async (input: CreateVideoAnnotationInput): Promise<VideoAnnotation> => {
  const { data, error } = await supabase
    .from('video_annotations')
    .insert({
      user_id:        input.userId,
      match_local_id: input.matchLocalId,
      video_asset_id: input.videoAssetId,
      event_id:       input.eventId ?? null,
      clip_id:        input.clipId ?? null,
      tool:           input.tool,
      color:          input.color,
      size:           input.size,
      points:         input.points,
      text:           input.text ?? null,
      time_in:        input.timeIn,
      duration:       input.duration,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as VideoAnnotation;
};

export const listVideoAnnotationsForClip = async (clipId: string): Promise<VideoAnnotation[]> => {
  const { data, error } = await supabase
    .from('video_annotations')
    .select('*')
    .eq('clip_id', clipId)
    .order('time_in', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VideoAnnotation[];
};

export const listVideoAnnotationsForMatch = async (matchLocalId: string): Promise<VideoAnnotation[]> => {
  const { data, error } = await supabase
    .from('video_annotations')
    .select('*')
    .eq('match_local_id', matchLocalId)
    .order('time_in', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VideoAnnotation[];
};

export const deleteVideoAnnotation = async (id: string): Promise<void> => {
  const { error } = await supabase.from('video_annotations').delete().eq('id', id);
  if (error) throw error;
};

// ════════════════════════════════════════════════════════════════════════════
// VIDEO TIMELINES
// ════════════════════════════════════════════════════════════════════════════

export interface CreateVideoTimelineInput {
  userId:        string;
  matchLocalId:  string;
  name:          string;
  segments:      TimelineSegment[];
  totalDuration: number;
}

export const createVideoTimeline = async (input: CreateVideoTimelineInput): Promise<VideoTimeline> => {
  const { data, error } = await supabase
    .from('video_timelines')
    .insert({
      user_id:        input.userId,
      match_local_id: input.matchLocalId,
      name:           input.name,
      segments:       input.segments,
      total_duration: input.totalDuration,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as VideoTimeline;
};

export const listVideoTimelines = async (matchLocalId: string): Promise<VideoTimeline[]> => {
  const { data, error } = await supabase
    .from('video_timelines')
    .select('*')
    .eq('match_local_id', matchLocalId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VideoTimeline[];
};

export const updateVideoTimeline = async (
  id: string,
  patch: Partial<{ name: string; segments: TimelineSegment[]; total_duration: number }>,
): Promise<VideoTimeline> => {
  const { data, error } = await supabase
    .from('video_timelines')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as VideoTimeline;
};

export const deleteVideoTimeline = async (id: string): Promise<void> => {
  const { error } = await supabase.from('video_timelines').delete().eq('id', id);
  if (error) throw error;
};
