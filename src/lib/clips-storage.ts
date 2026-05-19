/**
 * Clips storage helpers — CRUD for the `clips` table.
 */

import { supabase } from './supabase';
import type { Clip } from '@/domain/video';

export interface CreateClipInput {
  orgId: string;
  matchId: string | null;
  videoAssetId: string;
  eventId?: string | null;
  title: string;
  startSec: number;
  endSec: number;
  notes?: string | null;
}

export const createClip = async (input: CreateClipInput): Promise<Clip> => {
  const row = {
    org_id:         input.orgId,
    match_id:       input.matchId,
    video_asset_id: input.videoAssetId,
    event_id:       input.eventId ?? null,
    title:          input.title,
    start_sec:      input.startSec,
    end_sec:        input.endSec,
    notes:          input.notes ?? null,
  };

  const { data, error } = await supabase
    .from('clips')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return data as Clip;
};

export const listClipsForMatch = async (matchId: string): Promise<Clip[]> => {
  const { data, error } = await supabase
    .from('clips')
    .select('*')
    .eq('match_id', matchId)
    .order('start_sec', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Clip[];
};

export const updateClip = async (
  id: string,
  patch: Partial<{ title: string; start_sec: number; end_sec: number; notes: string | null }>,
): Promise<Clip> => {
  const { data, error } = await supabase
    .from('clips')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Clip;
};

export const deleteClip = async (id: string): Promise<void> => {
  const { error } = await supabase.from('clips').delete().eq('id', id);
  if (error) throw error;
};
