/**
 * @sportiq/core — Platform entity types.
 *
 * These are the multi-tenant domain types. They mirror the Supabase schema
 * but are the source of truth for business logic. No UI imports allowed here.
 *
 * Design principles:
 *  - All IDs are UUIDs (string).
 *  - Every important entity carries `org_id` for multi-tenant isolation.
 *  - `sport_type` on Organization enables future multi-sport expansion.
 *  - Nullable fields use `T | null` — never `T | undefined` in DB-facing types.
 */

// ─── Org / Multi-tenant ────────────────────────────────────────────────────────

export type SportType = 'handball' | 'soccer' | 'basketball' | 'volleyball';

export type OrgPlan = 'free' | 'pro' | 'team' | 'enterprise';

export type OrgMemberRole = 'owner' | 'coach' | 'analyst' | 'viewer';

export interface Organization {
  id:          string;
  name:        string;
  slug:        string;      // URL-friendly identifier
  sport_type:  SportType;
  plan:        OrgPlan;
  logo_url:    string | null;
  created_at:  string;
  updated_at:  string;
}

export interface OrgMember {
  org_id:     string;
  user_id:    string;
  role:       OrgMemberRole;
  joined_at:  string;
}

// ─── Profile (extends Supabase auth.users) ─────────────────────────────────────

export interface UserProfile {
  id:           string;   // = auth.users.id
  display_name: string | null;
  avatar_url:   string | null;
  created_at:   string;
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface Team {
  id:         string;
  org_id:     string;
  name:       string;
  short_name: string | null;
  color:      string;       // CSS hex, e.g. '#3B82F6'
  logo_url:   string | null;
  created_at: string;
  updated_at: string;
}

// ─── Player ───────────────────────────────────────────────────────────────────

export type PlayerPosition =
  | 'goalkeeper'
  | 'left_wing'
  | 'right_wing'
  | 'left_back'
  | 'right_back'
  | 'center_back'
  | 'pivot'
  | 'other';

export interface Player {
  id:         string;
  team_id:    string;
  org_id:     string;
  name:       string;
  number:     number;
  position:   PlayerPosition | null;
  avatar_url: string | null;
  is_active:  boolean;
  created_at: string;
}

// ─── Season ───────────────────────────────────────────────────────────────────

export interface Season {
  id:          string;
  org_id:      string;
  name:        string;       // e.g. '2024/25'
  sport_type:  SportType;
  starts_at:   string | null;
  ends_at:     string | null;
  is_active:   boolean;
  created_at:  string;
}

// ─── Tournament ───────────────────────────────────────────────────────────────

export interface Tournament {
  id:          string;
  org_id:      string;
  season_id:   string | null;
  name:        string;
  description: string | null;
  created_at:  string;
}

// ─── Match ────────────────────────────────────────────────────────────────────

export type MatchStatus = 'idle' | 'live' | 'half_time' | 'closed';

export interface Match {
  id:              string;
  org_id:          string;
  season_id:       string | null;
  tournament_id:   string | null;
  home_team_id:    string | null;
  away_team_id:    string | null;
  /** Denormalized for quick display without joins */
  home_team_name:  string;
  away_team_name:  string;
  home_team_color: string;
  away_team_color: string;
  home_score:      number;
  away_score:      number;
  status:          MatchStatus;
  competition:     string | null;
  match_date:      string | null;
  venue:           string | null;
  /** Opaque token for public sharing. Null = not shared. */
  share_token:     string | null;
  notes:           string | null;
  created_at:      string;
  updated_at:      string;
}

// ─── Match Event ──────────────────────────────────────────────────────────────
// This is the normalized per-row shape (vs. JSONB blob in legacy schema).
// Sport-specific fields (zone, goal_zone, etc.) are present but nullable,
// making the schema flexible for multi-sport without breaking changes.

export interface MatchEvent {
  id:               string;
  match_id:         string;
  org_id:           string;   // denormalized for RLS performance
  minute:           number;
  second:           number | null;
  team:             'home' | 'away';
  /** Unified event type — see sports/handball/types.ts for sport-specific values */
  type:             string;
  subtype:          string | null;
  detail:           string | null;
  qualifier:        string | null;

  // Spatial (handball-specific, nullable for multi-sport)
  zone:             string | null;
  goal_zone:        string | null;
  situation:        string | null;
  throw_type:       string | null;

  // Participants (denormalized — avoids joins on hot paths)
  shooter_name:     string | null;
  shooter_number:   number | null;
  goalkeeper_name:  string | null;
  goalkeeper_number: number | null;
  sanctioned_name:  string | null;
  sanctioned_number: number | null;

  // Score snapshot at the moment of the event
  home_score:       number;
  away_score:       number;

  // Media bridge (links to @sportiq/media domain)
  video_asset_id:   string | null;
  clip_start:       number | null;   // seconds (fractional)
  clip_end:         number | null;

  // Metadata
  quick_mode:       boolean;
  completed:        boolean;
  created_at:       string;
}

// ─── Analytics snapshot (computed, persisted after match closes) ──────────────

export interface MatchAnalytics {
  id:           string;
  match_id:     string;
  org_id:       string;
  computed_at:  string;
  /** Raw JSON blobs — typed via domain functions, not here */
  shot_map:     unknown;
  goal_grid:    unknown;
  scorer_list:  unknown;
  gk_map:       unknown;
  timeline:     unknown;
  season_totals: unknown;
}

// ─── Shared primitive helpers ─────────────────────────────────────────────────

export type ISODateString = string;
export type UUID = string;
