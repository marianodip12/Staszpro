import { supabase } from './supabase';

// ═══════════════════ TIPOS ═══════════════════

export type ProfileType = 'coach' | 'player';

export type PersonalEventType =
  | 'goal' | 'miss' | 'saved' | 'post'
  | 'save' | 'goal_conceded'
  | 'assist' | 'turnover' | 'exclusion'
  | 'yellow_card' | 'red_card' | 'blue_card' | 'foul_committed';

export type PersonalMatchStatus = 'idle' | 'live' | 'half_time' | 'finished';

export interface PersonalMatch {
  id: string;
  opponent: string;
  match_date: string;         // ISO date
  competition: string | null;
  my_score: number;
  opp_score: number;
  status: PersonalMatchStatus;
  local_id: string;
  event_count: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalEvent {
  id: string;
  minute: number;
  type: PersonalEventType;
  zone: string | null;
  goal_section: string | null;
  situation: string | null;
  completed: boolean;
  quick_mode: boolean;
  local_id: string;
  created_at: string;
}

export interface PersonalStats {
  matches_played: number;
  wins: number; draws: number; losses: number;
  goals: number; missed_shots: number;
  saved_by_gk: number; posts: number; total_shots: number;
  shot_efficiency: number | null;
  saves: number; goals_conceded: number;
  save_efficiency: number | null;
  assists: number; turnovers: number;
  exclusions: number; yellows: number; reds: number;
}

export interface FullProfile {
  id: string;
  email: string;
  display_name: string;
  profile_type: ProfileType;
  is_admin: boolean;
  plan: string;
  tutorial_done: boolean;
  created_at: string;
}

// ═══════════════════ PERFIL ═══════════════════

export async function getMyProfileType(): Promise<ProfileType | null> {
  const { data, error } = await supabase.rpc('get_my_profile_type');
  if (error) throw error;
  return (data as ProfileType | null) ?? null;
}

export async function setMyProfileType(type: ProfileType): Promise<ProfileType> {
  const { data, error } = await supabase.rpc('set_my_profile_type', { new_type: type });
  if (error) throw error;
  return data as ProfileType;
}

export async function getMyFullProfile(): Promise<FullProfile | null> {
  const { data, error } = await supabase.rpc('get_my_full_profile');
  if (error) throw error;
  return (data?.[0] as FullProfile) ?? null;
}

export async function hasAnyPersonalData(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_any_personal_data');
  if (error) throw error;
  return Boolean(data);
}

// ═══════════════════ PARTIDOS ═══════════════════

export interface UpsertPersonalMatchInput {
  local_id: string;
  opponent: string;
  match_date: string;
  competition?: string | null;
  my_score?: number;
  opp_score?: number;
  notes?: string | null;
  status?: PersonalMatchStatus;
}

export async function upsertPersonalMatch(input: UpsertPersonalMatchInput): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_personal_match', {
    p_local_id: input.local_id,
    p_opponent: input.opponent,
    p_match_date: input.match_date,
    p_competition: input.competition ?? null,
    p_my_score: input.my_score ?? 0,
    p_opp_score: input.opp_score ?? 0,
    p_notes: input.notes ?? null,
    p_status: input.status ?? 'finished',
  });
  if (error) throw error;
  return data as string;
}

export async function softDeletePersonalMatch(matchId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('soft_delete_personal_match', { p_match_id: matchId });
  if (error) throw error;
  return Boolean(data);
}

export async function listMyPersonalMatches(limit = 50, offset = 0): Promise<PersonalMatch[]> {
  const { data, error } = await supabase.rpc('list_my_personal_matches', {
    p_limit: limit, p_offset: offset,
  });
  if (error) throw error;
  return (data as PersonalMatch[]) ?? [];
}

// ═══════════════════ EVENTOS ═══════════════════

export interface UpsertPersonalEventInput {
  local_id: string;
  personal_match_id: string;
  minute: number;
  type: PersonalEventType;
  zone?: string | null;
  goal_section?: string | null;
  situation?: string | null;
  completed?: boolean;
  quick_mode?: boolean;
}

export async function upsertPersonalEvent(input: UpsertPersonalEventInput): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_personal_event', {
    p_local_id: input.local_id,
    p_personal_match_id: input.personal_match_id,
    p_minute: input.minute,
    p_type: input.type,
    p_zone: input.zone ?? null,
    p_goal_section: input.goal_section ?? null,
    p_situation: input.situation ?? null,
    p_completed: input.completed ?? true,
    p_quick_mode: input.quick_mode ?? false,
  });
  if (error) throw error;
  return data as string;
}

export async function softDeletePersonalEvent(eventId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('soft_delete_personal_event', { p_event_id: eventId });
  if (error) throw error;
  return Boolean(data);
}

export async function getPersonalMatchEvents(matchId: string): Promise<PersonalEvent[]> {
  const { data, error } = await supabase.rpc('get_personal_match_events', { p_match_id: matchId });
  if (error) throw error;
  return (data as PersonalEvent[]) ?? [];
}

// ═══════════════════ ANALÍTICA ═══════════════════

export async function getMyPersonalStats(): Promise<PersonalStats | null> {
  const { data, error } = await supabase.rpc('get_my_personal_stats');
  if (error) throw error;
  return (data?.[0] as PersonalStats) ?? null;
}

export async function getMyPersonalStatsByPeriod(from: string, to: string): Promise<PersonalStats | null> {
  const { data, error } = await supabase.rpc('get_my_personal_stats_by_period', {
    p_from: from, p_to: to,
  });
  if (error) throw error;
  return (data?.[0] as PersonalStats) ?? null;
}

export interface ShotByZone {
  zone: string;
  goals: number; missed: number; saved_by_gk: number; posts: number;
  total_shots: number; efficiency: number | null;
}

export async function getMyShotDistributionByZone(): Promise<ShotByZone[]> {
  const { data, error } = await supabase.rpc('get_my_shot_distribution_by_zone');
  if (error) throw error;
  return (data as ShotByZone[]) ?? [];
}

export interface GoalBySection {
  goal_section: string;
  goals: number;
}

export async function getMyGoalDistributionBySection(): Promise<GoalBySection[]> {
  const { data, error } = await supabase.rpc('get_my_goal_distribution_by_section');
  if (error) throw error;
  return (data as GoalBySection[]) ?? [];
}

export interface RecentMatchSummary {
  id: string;
  opponent: string;
  match_date: string;
  competition: string | null;
  my_score: number;
  opp_score: number;
  result: 'W' | 'D' | 'L' | '-';
  my_goals: number;
  my_shots: number;
  my_efficiency: number | null;
  my_saves: number;
  my_conceded: number;
}

export async function getMyRecentMatchesSummary(limit = 10): Promise<RecentMatchSummary[]> {
  const { data, error } = await supabase.rpc('get_my_recent_matches_summary', { p_limit: limit });
  if (error) throw error;
  return (data as RecentMatchSummary[]) ?? [];
}
