-- ============================================================================
-- 03_ticket_chat.sql — Chat de soporte (hilo de mensajes por ticket)
-- Idempotente. Espejo del estado aplicado en producción.
-- Depende de: support_tickets, ticket_attachments, profiles (01_schema.sql)
-- ============================================================================

-- ── Hilo de mensajes ────────────────────────────────────────────────────────
create table if not exists public.ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  sender_role text not null check (sender_role in ('user','admin')),
  sender_id   uuid references auth.users(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists ticket_messages_ticket_idx
  on public.ticket_messages(ticket_id, created_at);

-- Adjuntos por mensaje (opcional, nullable: no rompe las attachments existentes)
alter table public.ticket_attachments
  add column if not exists message_id uuid references public.ticket_messages(id) on delete cascade;

-- ── Helper admin (usa profiles.is_admin) ────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.ticket_messages enable row level security;

drop policy if exists ticket_messages_select on public.ticket_messages;
create policy ticket_messages_select on public.ticket_messages
for select using (
  public.is_admin()
  or exists (select 1 from public.support_tickets t
             where t.id = ticket_id and t.user_id = auth.uid())
);

drop policy if exists ticket_messages_insert on public.ticket_messages;
create policy ticket_messages_insert on public.ticket_messages
for insert with check (
  (sender_role = 'user' and sender_id = auth.uid()
     and exists (select 1 from public.support_tickets t
                 where t.id = ticket_id and t.user_id = auth.uid()))
  or (sender_role = 'admin' and public.is_admin())
);

-- ── Backfill: tickets existentes → hilo (solo una vez) ──────────────────────
insert into public.ticket_messages (ticket_id, sender_role, sender_id, body, created_at)
select id, 'user', user_id, message, created_at
from public.support_tickets s
where not exists (select 1 from public.ticket_messages m where m.ticket_id = s.id);

insert into public.ticket_messages (ticket_id, sender_role, sender_id, body, created_at)
select id, 'admin', '41af24e7-1f61-4821-861a-8794f9a791cb'::uuid, admin_reply,
       coalesce(updated_at, created_at) + interval '1 second'
from public.support_tickets s
where admin_reply is not null and length(trim(admin_reply)) > 0
  and not exists (
    select 1 from public.ticket_messages m
    where m.ticket_id = s.id and m.sender_role = 'admin'
  );

-- ── Trigger: bump + transición de estado (estados válidos del enum) ─────────
create or replace function public.on_ticket_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.support_tickets
     set updated_at = now(),
         status = case
           when new.sender_role = 'user'  and status in ('resolved','closed') then 'open'
           when new.sender_role = 'admin' and status = 'open'                 then 'in_progress'
           else status
         end
   where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists trg_on_ticket_message on public.ticket_messages;
create trigger trg_on_ticket_message
after insert on public.ticket_messages
for each row execute function public.on_ticket_message();

-- ── RPCs (mismo patrón que get_my_tickets / admin_update_ticket) ────────────
create or replace function public.ticket_list_messages(p_ticket_id uuid)
returns setof public.ticket_messages
language sql stable security definer set search_path = public as $$
  select m.*
  from public.ticket_messages m
  where m.ticket_id = p_ticket_id
    and (
      public.is_admin()
      or exists (select 1 from public.support_tickets t
                 where t.id = p_ticket_id and t.user_id = auth.uid())
    )
  order by m.created_at asc;
$$;

create or replace function public.ticket_post_message(p_ticket_id uuid, p_body text)
returns public.ticket_messages
language plpgsql security definer set search_path = public as $$
declare
  v_admin boolean := public.is_admin();
  v_owner boolean;
  v_role  text;
  v_row   public.ticket_messages;
begin
  if coalesce(trim(p_body), '') = '' then
    raise exception 'Mensaje vacío';
  end if;

  select exists (
    select 1 from public.support_tickets t
    where t.id = p_ticket_id and t.user_id = auth.uid()
  ) into v_owner;

  if not (v_admin or v_owner) then
    raise exception 'No autorizado';
  end if;

  v_role := case when v_admin then 'admin' else 'user' end;

  insert into public.ticket_messages (ticket_id, sender_role, sender_id, body)
  values (p_ticket_id, v_role, auth.uid(), trim(p_body))
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.ticket_list_messages(uuid) to authenticated;
grant execute on function public.ticket_post_message(uuid, text) to authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and tablename='ticket_messages'
  ) then
    alter publication supabase_realtime add table public.ticket_messages;
  end if;
end $$;
