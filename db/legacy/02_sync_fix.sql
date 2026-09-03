-- ============================================================================
-- 02_sync_fix.sql — Fix bug "partidos fantasma" (v11.1)
-- ⚠️ YA APLICADO en producción vía MCP el 10/6/2026. Solo referencia.
--
-- Causa raíz del bug:
--   1. Los RPCs de soft-delete NO existían → deleteMatchFromServer fallaba
--      en silencio → el server nunca marcaba deleted_at → downloadFromServer
--      re-bajaba el partido borrado en cada carga.
--   2. teams/players no tenían user_id, local_id ni deleted_at, y sus RLS
--      eran del schema viejo por organización → sync de equipos muerto.
--   3. (cliente) Pestañas viejas re-escribían localStorage con estado stale.
-- ============================================================================

-- Columnas de sync
alter table public.teams
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists local_id text,
  add column if not exists deleted_at timestamptz;

alter table public.players
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists local_id text,
  add column if not exists deleted_at timestamptz;

-- Índices únicos por usuario (antes hubo que deduplicar events: 23 filas)
create unique index if not exists teams_user_local_uidx on public.teams(user_id, local_id) where local_id is not null;
create unique index if not exists players_user_local_uidx on public.players(user_id, local_id) where local_id is not null;
create unique index if not exists matches_user_local_uidx on public.matches(user_id, local_id) where local_id is not null;
create unique index if not exists events_user_local_uidx on public.events(user_id, local_id) where local_id is not null;

create index if not exists matches_user_status_idx on public.matches(user_id, status) where deleted_at is null;
create index if not exists events_match_idx on public.events(match_id);

-- RLS por dueño para teams/players
drop policy if exists teams_owner_all on public.teams;
create policy teams_owner_all on public.teams
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists players_owner_all on public.players;
create policy players_owner_all on public.players
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.teams alter column org_id drop not null;
alter table public.players alter column org_id drop not null;

-- RPCs de soft-delete + tombstones
create or replace function public.soft_delete_match(p_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.matches set deleted_at = now()
    where id = p_match_id and user_id = auth.uid() and deleted_at is null;
  if not found then return; end if;
  update public.events set deleted_at = now()
    where match_id = p_match_id and deleted_at is null;
end; $$;

create or replace function public.soft_delete_team(p_team_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.teams set deleted_at = now()
    where id = p_team_id and user_id = auth.uid() and deleted_at is null;
  if not found then return; end if;
  update public.players set deleted_at = now()
    where team_id = p_team_id and deleted_at is null;
end; $$;

create or replace function public.soft_delete_event(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.events set deleted_at = now()
    where id = p_event_id and user_id = auth.uid() and deleted_at is null;
end; $$;

create or replace function public.get_deleted_match_local_ids()
returns table(local_id text) language sql security definer set search_path = public stable as $$
  select m.local_id from public.matches m
  where m.user_id = auth.uid() and m.deleted_at is not null and m.local_id is not null;
$$;

create or replace function public.get_deleted_team_local_ids()
returns table(local_id text) language sql security definer set search_path = public stable as $$
  select t.local_id from public.teams t
  where t.user_id = auth.uid() and t.deleted_at is not null and t.local_id is not null;
$$;

grant execute on function public.soft_delete_match(uuid) to authenticated;
grant execute on function public.soft_delete_team(uuid) to authenticated;
grant execute on function public.soft_delete_event(uuid) to authenticated;
grant execute on function public.get_deleted_match_local_ids() to authenticated;
grant execute on function public.get_deleted_team_local_ids() to authenticated;
