# Schema de producción — inventario

Proyecto Supabase de **producción**: `xakmuljnclgywxdmgaws`
(`https://xakmuljnclgywxdmgaws.supabase.co`). Región us-east-1.

> El schema real vive en Supabase (aplicado por dashboard / MCP), no en el
> repo. Este archivo es un **inventario** para no perder el norte. Para un
> dump ejecutable: `supabase db dump --schema public` (falta linkear la CLI
> y versionarlo — pendiente).

Snapshot: 2026-09-03. Todas las tablas con **RLS habilitado**.

## Tablas (`public`)

| Tabla | Filas aprox. | Notas |
|---|--:|---|
| `profiles` | 77 | 1 por `auth.users` (trigger). Sin columna `email` (está en `auth.users`). |
| `user_plans` | 77 | `user_id, plan, is_admin, match_limit, expires_at, tutorial_done`. Plan actual del usuario. |
| `teams` | 124 | `user_id, name, color, local_id`, soft-delete `deleted_at`. |
| `players` | 469 | `team_id, user_id, name, number, position, local_id`, soft-delete. `position` es texto libre. |
| `matches` | 108 | `user_id`, `home_team_id`/`away_team_id` (nullable) + nombres/colores denormalizados, `home_score`/`away_score`, `status`, `competition`, `match_date` (texto), `share_token`, `is_public`, `local_id`, soft-delete. |
| `events` | 3980 | `match_id, user_id, local_id, minute, team, type, zone, goal_section, situation, throw_type`, tirador/arquero/sancionado **por nombre+número** (no FK a players), `h_score`/`a_score`, `quick_mode`, `completed`, `lineup` (jsonb), soft-delete. |
| `personal_matches` / `personal_events` | 1 / 1 | Partidos personales de un perfil "player" (sin equipo/rival registrado). |
| `seasons` / `tournaments` / `leagues` | 0 / 0 / 1 | Estructura de competición. |
| `organizations` / `org_members` / `club_members` | 1 / 1 / 1 | Multi-tenant club / staff. |
| `payment_requests` | 5 | `user_id, plan, billing_cycle, payment_method, amount_usd, amount_ars, status, mp_payment_id, paid_at, proof_url`. Consumido por las edge functions de Mercado Pago. |
| `app_secrets` | 1 | `key, value`. Guarda `MP_ACCESS_TOKEN` (prod). Solo service role. |
| `support_tickets` / `ticket_messages` / `support_messages` | 3 / 13 / 6 | Soporte + chat en vivo user↔admin. |
| `ai_match_analysis` / `match_analytics` | 0 / 0 | Salidas de análisis con IA. |
| `video_assets` / `clips` / `clip_signatures` / `render_jobs` / `render_assets` / `timelines` / `annotations` | 4 / 2 / 0 / 0 / 0 / 0 / 0 | Pipeline de video-análisis. |
| `video_players` / `video_events` / `video_annotations` / `video_timelines` | 0 / 16 / 0 / 0 | Eventos taggeados sobre video. |
| `page_visits` | 1747 | Instrumentación de visitas (`src/lib/visits.ts`). |
| `notification_log` | 0 | Log de notificaciones enviadas. |
| `partidos` / `match_events` | 0 / 0 | Tablas vacías (legado / sin uso). |
| `backup_user_plans_20260901` | 76 | Backup del reset de planes (RLS on, sin policies). |
| `backup_players_armador_20260902` | 60 | Backup del rename "Armador"→"Central" (RLS on, sin policies). |

## RPCs conocidas (`public`)

`get_my_plan`, `plan_match_limit`, `create_payment_request`,
`activate_plan_for_payment`, `get_payment_status`, `handle_new_user`,
`handle_new_user_plan`, `is_current_user_admin`, `is_admin`,
`admin_get_all_users`, `admin_set_user_plan`, `admin_get_payment_requests`,
`admin_set_payment_status`, `admin_get_all_matches`, `admin_delete_match`,
`admin_get_all_tickets` / `admin_list_tickets` / `admin_reply_ticket` /
`admin_update_ticket`, `get_my_tickets`, `create_support_ticket`,
`soft_delete_team` / `soft_delete_match` / `soft_delete_player` /
`soft_delete_event`, `get_deleted_team_local_ids` /
`get_deleted_match_local_ids`, `get_tutorial_done` / `set_tutorial_done`,
`get_visit_stats`, `create_organization`, `is_org_member` / `is_org_member` /
`user_org_ids` / `user_owns_org` / `has_org_role` / `is_club_member_of` /
`auto_add_org_owner`.

## Edge functions

`mp-create-preference`, `mp-webhook`, `ai-match-analysis` (todas ACTIVE).
