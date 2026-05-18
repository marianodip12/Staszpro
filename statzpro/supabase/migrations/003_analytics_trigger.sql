-- ============================================================
-- SportIQ — Migration 003: Auto-trigger analytics on match close
-- ============================================================

-- Trigger function: llama a sync-analytics Edge Function
-- cuando un partido pasa a status='closed'
CREATE OR REPLACE FUNCTION notify_match_closed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Solo ejecutar cuando status cambia a 'closed'
  IF NEW.status = 'closed' AND (OLD.status IS NULL OR OLD.status <> 'closed') THEN
    PERFORM net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/sync-analytics',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := jsonb_build_object('match_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Requiere la extensión pg_net (habilitada en Supabase por defecto)
-- Si pg_net no está disponible, llamar sync-analytics desde el cliente
-- después de PATCH /matches/:id { status: 'closed' }
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    CREATE OR REPLACE TRIGGER trg_match_closed_analytics
      AFTER UPDATE OF status ON matches
      FOR EACH ROW EXECUTE FUNCTION notify_match_closed();
    RAISE NOTICE 'Analytics trigger created (pg_net available)';
  ELSE
    RAISE NOTICE 'pg_net not available — call sync-analytics manually from client';
  END IF;
END;
$$;

-- Share token: función para generar un token único por partido
CREATE OR REPLACE FUNCTION generate_share_token(p_match_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Verificar que el caller es miembro de la org del partido
  IF NOT EXISTS (
    SELECT 1 FROM matches m
    JOIN org_members om ON om.org_id = m.org_id
    WHERE m.id = p_match_id AND om.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_token := lower(encode(gen_random_bytes(12), 'hex'));

  UPDATE matches SET share_token = v_token WHERE id = p_match_id;

  RETURN v_token;
END;
$$;

-- Revocar share token
CREATE OR REPLACE FUNCTION revoke_share_token(p_match_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM matches m
    JOIN org_members om ON om.org_id = m.org_id
    WHERE m.id = p_match_id AND om.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE matches SET share_token = NULL WHERE id = p_match_id;
END;
$$;

-- Índice para búsqueda de partidos por fecha dentro de una org
CREATE INDEX IF NOT EXISTS idx_matches_org_date
  ON matches (org_id, match_date DESC NULLS LAST);

-- Índice compuesto para consultas de eventos filtrados por tipo (análisis)
CREATE INDEX IF NOT EXISTS idx_match_events_match_type_team
  ON match_events (match_id, type, team);

COMMENT ON FUNCTION generate_share_token IS 'Genera token público para compartir un partido. Solo miembros de la org.';
COMMENT ON FUNCTION revoke_share_token   IS 'Revoca el token público de un partido.';
