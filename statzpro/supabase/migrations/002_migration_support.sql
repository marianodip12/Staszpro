-- ============================================================
-- SportIQ — Migration 002: Legacy migration support
-- Adds nullable user_id columns to support incremental migration
-- from Handball Pro single-tenant schema.
-- ============================================================

-- Add user_id to teams/players/matches for legacy data lookup.
-- These columns are NULLABLE and only populated by the migrate-user function.
-- After full migration they can be dropped (migration 003).

ALTER TABLE teams   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Legacy events column: holds JSONB events array from Handball Pro.
-- Populated during migration, cleared after normalization to match_events.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS events JSONB;

-- Index for migration queries
CREATE INDEX IF NOT EXISTS idx_teams_user_legacy   ON teams   (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_user_legacy ON players (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_user_legacy ON matches (user_id) WHERE user_id IS NOT NULL;

-- Track which users have been migrated
CREATE TABLE IF NOT EXISTS migration_log (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id),
  migrated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id       UUID REFERENCES organizations(id),
  teams        INT  NOT NULL DEFAULT 0,
  players      INT  NOT NULL DEFAULT 0,
  matches      INT  NOT NULL DEFAULT 0,
  events       INT  NOT NULL DEFAULT 0,
  dry_run      BOOLEAN NOT NULL DEFAULT false
);

COMMENT ON TABLE migration_log IS 'Tracks Handball Pro → SportIQ data migration per user.';
COMMENT ON COLUMN matches.events IS 'Legacy JSONB events from Handball Pro. NULL after migration.';
