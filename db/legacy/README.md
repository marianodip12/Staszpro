# SQL histórico — NO representa la base actual

Estos archivos son de la reescritura v11.1-beta (julio 2026) y apuntaban al
proyecto Supabase **`emmqrzqxlkqvsqbihwdt`** ("Prueba De Statzpro antes de
lanzar"), que hoy está **pausado y no es producción**.

**Producción es el proyecto `xakmuljnclgywxdmgaws`** (URL
`https://xakmuljnclgywxdmgaws.supabase.co`), cuyo schema evolucionó mucho
más allá de lo que hay acá: `user_plans`, `payment_requests`,
`organizations` / `org_members` / `club_members`, `personal_matches` /
`personal_events`, tablas de video (`video_assets`, `clips`, `render_jobs`…),
`support_tickets` / `ticket_messages`, `page_visits`, `app_secrets`, etc.

- Inventario de tablas reales: `../schema.md`.
- Dump ejecutable real: `supabase db dump` (requiere linkear el proyecto con
  la CLI de Supabase). Todavía no está versionado.

Se conservan solo como referencia de la migración de aquel momento.
