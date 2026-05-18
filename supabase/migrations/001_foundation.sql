-- ============================================================
-- SportIQ — Migration 001: Foundation
-- Schema: Core domain + Media domain + Multi-tenant RLS
--
-- Run with: supabase db push
-- Author:   SportIQ Platform
-- Notes:
--   - All IDs are UUID (gen_random_uuid())
--   - Every table carries org_id for multi-tenant isolation
--   - RLS is ENABLED on all tables — default deny
--   - Media tables are in a separate logical namespace but same DB
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for future full-text search

-- ─── Utility functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Helper: check if calling user belongs to an org
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
  );
$$;

-- Helper: check if calling user has a specific role (or above) in an org
CREATE OR REPLACE FUNCTION has_org_role(p_org_id UUID, p_role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role = ANY(
        CASE p_role
          WHEN 'viewer'  THEN ARRAY['viewer','analyst','coach','owner']
          WHEN 'analyst' THEN ARRAY['analyst','coach','owner']
          WHEN 'coach'   THEN ARRAY['coach','owner']
          WHEN 'owner'   THEN ARRAY['owner']
          ELSE ARRAY[p_role]
        END
      )
  );
$$;

-- ═══════════════════════════════════════════════════════════════
-- SECTION 1: PLATFORM / AUTH LAYER
-- ═══════════════════════════════════════════════════════════════

-- ─── User profiles ────────────────────────────────────────────────────────────
-- Extends auth.users with display info. Created automatically on signup.

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Organizations ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,   -- URL-safe identifier
  sport_type  TEXT        NOT NULL DEFAULT 'handball'
                          CHECK (sport_type IN ('handball','soccer','basketball','volleyball')),
  plan        TEXT        NOT NULL DEFAULT 'free'
                          CHECK (plan IN ('free','pro','team','enterprise')),
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Org members ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_members (
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'viewer'
                          CHECK (role IN ('owner','coach','analyst','viewer')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members (user_id);

-- Auto-create personal org for new users (optional: disable for invite-only flows)
CREATE OR REPLACE FUNCTION handle_new_user_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id  UUID;
  v_slug    TEXT;
BEGIN
  -- Generate a slug from the user's email domain or display name
  v_slug := lower(regexp_replace(
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    '[^a-z0-9]', '-', 'g'
  )) || '-' || substr(NEW.id::text, 1, 8);

  INSERT INTO organizations (name, slug, sport_type, plan)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_slug,
    'handball',
    'free'
  )
  RETURNING id INTO v_org_id;

  INSERT INTO org_members (org_id, user_id, role)
  VALUES (v_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- NOTE: enable this trigger for self-serve signups.
-- Disable for invite-only / enterprise flows.
CREATE OR REPLACE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_org();

-- ═══════════════════════════════════════════════════════════════
-- SECTION 2: CORE SPORT DOMAIN
-- ═══════════════════════════════════════════════════════════════

-- ─── Teams ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teams (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  short_name  TEXT,
  color       TEXT        NOT NULL DEFAULT '#3B82F6',
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, name)
);

CREATE INDEX idx_teams_org ON teams (org_id);
CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Players ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS players (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  number      INT         NOT NULL CHECK (number >= 1 AND number <= 99),
  position    TEXT        CHECK (position IN (
                            'goalkeeper','left_wing','right_wing',
                            'left_back','right_back','center_back','pivot','other'
                          )),
  avatar_url  TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, number)
);

CREATE INDEX idx_players_team  ON players (team_id);
CREATE INDEX idx_players_org   ON players (org_id);
CREATE TRIGGER trg_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Seasons ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seasons (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,         -- e.g. '2024/25'
  sport_type  TEXT        NOT NULL DEFAULT 'handball',
  starts_at   DATE,
  ends_at     DATE,
  is_active   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seasons_org ON seasons (org_id);

-- ─── Tournaments ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tournaments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  season_id   UUID        REFERENCES seasons(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tournaments_org    ON tournaments (org_id);
CREATE INDEX idx_tournaments_season ON tournaments (season_id);

-- ─── Matches ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS matches (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  season_id        UUID        REFERENCES seasons(id)     ON DELETE SET NULL,
  tournament_id    UUID        REFERENCES tournaments(id) ON DELETE SET NULL,
  home_team_id     UUID        REFERENCES teams(id)       ON DELETE SET NULL,
  away_team_id     UUID        REFERENCES teams(id)       ON DELETE SET NULL,

  -- Denormalized for fast display (avoids joins in lists)
  home_team_name   TEXT        NOT NULL,
  away_team_name   TEXT        NOT NULL,
  home_team_color  TEXT        NOT NULL DEFAULT '#3B82F6',
  away_team_color  TEXT        NOT NULL DEFAULT '#EF4444',

  home_score       INT         NOT NULL DEFAULT 0,
  away_score       INT         NOT NULL DEFAULT 0,

  status           TEXT        NOT NULL DEFAULT 'idle'
                               CHECK (status IN ('idle','live','half_time','closed')),
  competition      TEXT,
  match_date       TIMESTAMPTZ,
  venue            TEXT,
  notes            TEXT,

  -- Public sharing: null = private, non-null = shareable via token
  share_token      TEXT        UNIQUE,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matches_org        ON matches (org_id);
CREATE INDEX idx_matches_season     ON matches (season_id);
CREATE INDEX idx_matches_status     ON matches (org_id, status);
CREATE INDEX idx_matches_share      ON matches (share_token) WHERE share_token IS NOT NULL;
CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Match events ─────────────────────────────────────────────────────────────
-- Normalized rows (NOT JSONB). One row per event.

CREATE TABLE IF NOT EXISTS match_events (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id           UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  org_id             UUID        NOT NULL,   -- denormalized for RLS

  minute             INT         NOT NULL CHECK (minute >= 0),
  second             INT         CHECK (second >= 0 AND second <= 59),
  team               TEXT        NOT NULL CHECK (team IN ('home','away')),

  -- Unified event taxonomy (top 4 levels)
  type               TEXT        NOT NULL,   -- HandballEventType or sport-specific value
  subtype            TEXT,                   -- tactical category (level 2)
  detail             TEXT,                   -- tactical detail (level 3)
  qualifier          TEXT,                   -- optional (level 4, e.g. 'Positiva'/'Negativa')

  -- Spatial context (nullable for multi-sport compatibility)
  zone               TEXT,
  goal_zone          TEXT,
  situation          TEXT,
  throw_type         TEXT,

  -- Participants (denormalized snapshot — avoids joins on playback)
  shooter_name       TEXT,
  shooter_number     INT,
  goalkeeper_name    TEXT,
  goalkeeper_number  INT,
  sanctioned_name    TEXT,
  sanctioned_number  INT,

  -- Score snapshot at event time
  home_score         INT         NOT NULL DEFAULT 0,
  away_score         INT         NOT NULL DEFAULT 0,

  -- Media bridge (optional link into the media domain)
  video_asset_id     UUID,       -- FK enforced at app level (cross-schema)
  clip_start         NUMERIC(10,3),   -- seconds (3 decimal places = ms precision)
  clip_end           NUMERIC(10,3),

  quick_mode         BOOLEAN     NOT NULL DEFAULT false,
  completed          BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_events_match  ON match_events (match_id);
CREATE INDEX idx_match_events_org    ON match_events (org_id);
CREATE INDEX idx_match_events_type   ON match_events (match_id, type);
CREATE INDEX idx_match_events_team   ON match_events (match_id, team);
CREATE INDEX idx_match_events_minute ON match_events (match_id, minute);

-- ─── Match analytics (computed snapshot, updated when match closes) ───────────

CREATE TABLE IF NOT EXISTS match_analytics (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID        NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  org_id        UUID        NOT NULL,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shot_map      JSONB,
  goal_grid     JSONB,
  scorer_list   JSONB,
  gk_map        JSONB,
  timeline      JSONB,
  season_totals JSONB
);

CREATE INDEX idx_match_analytics_org ON match_analytics (org_id);

-- ═══════════════════════════════════════════════════════════════
-- SECTION 3: MEDIA DOMAIN
-- ═══════════════════════════════════════════════════════════════

-- ─── Video assets ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_assets (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  match_id       UUID        REFERENCES matches(id) ON DELETE SET NULL,
  storage_path   TEXT        NOT NULL,
  provider       TEXT        NOT NULL DEFAULT 'supabase'
                             CHECK (provider IN ('supabase','r2','s3','local')),
  bucket         TEXT        NOT NULL DEFAULT 'videos',
  duration       NUMERIC(10,3),
  file_size      BIGINT,
  mime_type      TEXT,
  original_name  TEXT,
  status         TEXT        NOT NULL DEFAULT 'ready'
                             CHECK (status IN ('uploading','processing','ready','error')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_video_assets_org   ON video_assets (org_id);
CREATE INDEX idx_video_assets_match ON video_assets (match_id);
CREATE TRIGGER trg_video_assets_updated_at BEFORE UPDATE ON video_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Clip signatures ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clip_signatures (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_asset_id  UUID        NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
  sig_hash        TEXT        NOT NULL UNIQUE,   -- dedup key
  start_sec       NUMERIC(10,3) NOT NULL,
  end_sec         NUMERIC(10,3) NOT NULL,
  overlays        JSONB       NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_sec > start_sec)
);

CREATE INDEX idx_clip_signatures_video ON clip_signatures (video_asset_id);
CREATE INDEX idx_clip_signatures_hash  ON clip_signatures (sig_hash);

-- ─── Render jobs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS render_jobs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_signature_id   UUID        NOT NULL REFERENCES clip_signatures(id) ON DELETE CASCADE,
  org_id              UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','queued','processing','done','error')),
  output_format       TEXT        NOT NULL DEFAULT 'mp4'
                                  CHECK (output_format IN ('mp4','webm','gif','hls')),
  error_message       TEXT,
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_render_jobs_org    ON render_jobs (org_id);
CREATE INDEX idx_render_jobs_status ON render_jobs (status) WHERE status IN ('pending','queued','processing');
CREATE INDEX idx_render_jobs_clip   ON render_jobs (clip_signature_id);

-- ─── Render assets (outputs of a render job) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS render_assets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  render_job_id   UUID        NOT NULL REFERENCES render_jobs(id) ON DELETE CASCADE,
  asset_type      TEXT        NOT NULL
                              CHECK (asset_type IN ('thumbnail','preview','export','hls_manifest')),
  storage_path    TEXT        NOT NULL,
  provider        TEXT        NOT NULL DEFAULT 'supabase',
  file_size       BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_render_assets_job ON render_assets (render_job_id);

-- ─── Timelines (editor compositions) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS timelines (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  match_id        UUID        REFERENCES matches(id) ON DELETE SET NULL,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT        NOT NULL DEFAULT 'Untitled timeline',
  clips           JSONB       NOT NULL DEFAULT '[]',   -- TimelineClip[]
  total_duration  NUMERIC(10,3) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timelines_org   ON timelines (org_id);
CREATE INDEX idx_timelines_match ON timelines (match_id);
CREATE TRIGGER trg_timelines_updated_at BEFORE UPDATE ON timelines FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- SECTION 4: ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables (default deny — access only via policies below)

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_analytics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_assets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_signatures  ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_assets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelines        ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ─────────────────────────────────────────────────────────────────

CREATE POLICY "profiles: own read/write"
  ON profiles FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── Organizations ────────────────────────────────────────────────────────────

CREATE POLICY "organizations: member read"
  ON organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "organizations: owner update"
  ON organizations FOR UPDATE
  USING (has_org_role(id, 'owner'));

-- ─── Org members ──────────────────────────────────────────────────────────────

CREATE POLICY "org_members: member read"
  ON org_members FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "org_members: owner manage"
  ON org_members FOR ALL
  USING (has_org_role(org_id, 'owner'));

CREATE POLICY "org_members: self read"
  ON org_members FOR SELECT
  USING (user_id = auth.uid());

-- ─── Teams ────────────────────────────────────────────────────────────────────

CREATE POLICY "teams: member read"
  ON teams FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "teams: coach+ write"
  ON teams FOR INSERT WITH CHECK (has_org_role(org_id, 'coach'));

CREATE POLICY "teams: coach+ update"
  ON teams FOR UPDATE USING (has_org_role(org_id, 'coach'));

CREATE POLICY "teams: owner delete"
  ON teams FOR DELETE USING (has_org_role(org_id, 'owner'));

-- ─── Players ──────────────────────────────────────────────────────────────────

CREATE POLICY "players: member read"
  ON players FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "players: coach+ write"
  ON players FOR INSERT WITH CHECK (has_org_role(org_id, 'coach'));

CREATE POLICY "players: coach+ update"
  ON players FOR UPDATE USING (has_org_role(org_id, 'coach'));

CREATE POLICY "players: owner delete"
  ON players FOR DELETE USING (has_org_role(org_id, 'owner'));

-- ─── Seasons & Tournaments ────────────────────────────────────────────────────

CREATE POLICY "seasons: member read"  ON seasons FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "seasons: coach+ write" ON seasons FOR ALL   USING (has_org_role(org_id, 'coach'));

CREATE POLICY "tournaments: member read"  ON tournaments FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "tournaments: coach+ write" ON tournaments FOR ALL   USING (has_org_role(org_id, 'coach'));

-- ─── Matches ──────────────────────────────────────────────────────────────────

CREATE POLICY "matches: member read"
  ON matches FOR SELECT
  USING (
    is_org_member(org_id)
    OR share_token IS NOT NULL  -- public share: anyone with the token
  );

CREATE POLICY "matches: coach+ create"
  ON matches FOR INSERT WITH CHECK (has_org_role(org_id, 'coach'));

CREATE POLICY "matches: coach+ update"
  ON matches FOR UPDATE USING (has_org_role(org_id, 'coach'));

CREATE POLICY "matches: owner delete"
  ON matches FOR DELETE USING (has_org_role(org_id, 'owner'));

-- ─── Match events ─────────────────────────────────────────────────────────────

CREATE POLICY "match_events: member read"
  ON match_events FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "match_events: analyst+ write"
  ON match_events FOR INSERT WITH CHECK (has_org_role(org_id, 'analyst'));

CREATE POLICY "match_events: analyst+ update"
  ON match_events FOR UPDATE USING (has_org_role(org_id, 'analyst'));

CREATE POLICY "match_events: coach+ delete"
  ON match_events FOR DELETE USING (has_org_role(org_id, 'coach'));

-- ─── Match analytics ──────────────────────────────────────────────────────────

CREATE POLICY "match_analytics: member read"
  ON match_analytics FOR SELECT USING (is_org_member(org_id));

-- Only service role (Edge Functions) can write analytics — no direct client writes
-- (achieved by omitting INSERT/UPDATE policies for non-service roles)

-- ─── Video assets ─────────────────────────────────────────────────────────────

CREATE POLICY "video_assets: member read"
  ON video_assets FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "video_assets: analyst+ upload"
  ON video_assets FOR INSERT WITH CHECK (has_org_role(org_id, 'analyst'));

CREATE POLICY "video_assets: owner delete"
  ON video_assets FOR DELETE USING (has_org_role(org_id, 'owner'));

-- ─── Clip signatures ──────────────────────────────────────────────────────────

CREATE POLICY "clip_signatures: member read"
  ON clip_signatures FOR SELECT
  USING (
    video_asset_id IN (
      SELECT id FROM video_assets WHERE is_org_member(org_id)
    )
  );

CREATE POLICY "clip_signatures: analyst+ create"
  ON clip_signatures FOR INSERT
  WITH CHECK (
    video_asset_id IN (
      SELECT id FROM video_assets WHERE has_org_role(org_id, 'analyst')
    )
  );

-- ─── Render jobs ──────────────────────────────────────────────────────────────

CREATE POLICY "render_jobs: org member read"
  ON render_jobs FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "render_jobs: analyst+ create"
  ON render_jobs FOR INSERT WITH CHECK (has_org_role(org_id, 'analyst'));

-- ─── Render assets ────────────────────────────────────────────────────────────

CREATE POLICY "render_assets: read via job"
  ON render_assets FOR SELECT
  USING (
    render_job_id IN (
      SELECT id FROM render_jobs WHERE is_org_member(org_id)
    )
  );

-- ─── Timelines ────────────────────────────────────────────────────────────────

CREATE POLICY "timelines: member read"
  ON timelines FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "timelines: analyst+ write"
  ON timelines FOR ALL USING (has_org_role(org_id, 'analyst'));

-- ═══════════════════════════════════════════════════════════════
-- SECTION 5: SUPABASE STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════════

-- Run these via Supabase dashboard or storage API.
-- Listed here for documentation purposes.
--
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES
--   ('videos',    'videos',    FALSE, 5368709120, ARRAY['video/mp4','video/webm','video/quicktime']),
--   ('thumbnails','thumbnails',FALSE, 10485760,   ARRAY['image/jpeg','image/png','image/webp']),
--   ('renders',   'renders',   FALSE, 2147483648, ARRAY['video/mp4','video/webm','image/gif']);
--
-- Storage RLS: restrict access by org_id prefix:
-- objects path format: orgs/{org_id}/...
-- Policy: allow read/write if is_org_member(org_id extracted from path)

-- ═══════════════════════════════════════════════════════════════
-- SECTION 6: MIGRATION HELPERS (from legacy schemas)
-- ═══════════════════════════════════════════════════════════════

-- These functions assist the Phase 1 data migration from:
--   Platform B (Handball Pro): single-tenant user_id → org_id
--   Platform A (Analizador):   JSONB events → normalized match_events rows

-- Placeholder: migrate_handball_pro_user(p_user_id UUID)
-- Logic: find or create org for user, migrate their matches + events
-- Implementation in: supabase/functions/migrate-user/index.ts

COMMENT ON TABLE organizations  IS 'Multi-tenant root. Every entity belongs to exactly one org.';
COMMENT ON TABLE org_members     IS 'User ↔ Org membership with role-based access.';
COMMENT ON TABLE match_events    IS 'Normalized per-event rows. NOT JSONB. Replaces embedded events arrays.';
COMMENT ON TABLE clip_signatures IS 'Content-addressable clip identity. Same sig_hash = no re-render.';
COMMENT ON TABLE render_jobs     IS 'Async render requests. Processed by Edge Functions + workers.';
