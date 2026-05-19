# StatzPro v11.1-beta — Notas del paquete final

Build OK · 142/142 tests pasan al momento de empaquetar.

## Lo que se hizo en BD (Supabase, proyecto emmqrzqxlkqvsqbihwdt)

### Backups previos
Antes de tocar nada se creó snapshot completo de las 4 tablas core:
- `backup_teams_20260512_v2` (49 rows)
- `backup_players_20260512_v2` (216 rows)
- `backup_matches_20260512_v2` (9 rows)
- `backup_events_20260512_v2` (1079 rows)

### Migración `add_soft_delete_columns`
Columnas nuevas (`deleted_at timestamptz`) en `teams`, `players`, `matches`, `events`.
NULL = vigente, timestamptz = eliminado lógicamente.
Índices parciales en `(user_id|team_id|match_id) WHERE deleted_at IS NULL` para
que las queries de "lo activo" sean rápidas.

### Migración `soft_delete_rpcs`
RPCs nuevas:
- `soft_delete_team(p_team_id uuid)` — marca team + cascada a sus players
- `soft_delete_match(p_match_id uuid)` — marca match + cascada a sus events
- `soft_delete_player(p_player_id uuid)`
- `soft_delete_event(p_event_id uuid)`
- `get_deleted_team_local_ids(p_since timestamptz)` — tombstones para el sync
- `get_deleted_match_local_ids(p_since timestamptz)`

Todas validan ownership via `auth.uid()` y son idempotentes.

### Limpieza de datos
- 7 equipos duplicados (creados por seed.ts en boot anterior) → soft-delete
  Quedan en BD, no se muestran. IDs preservados por si los necesitamos.
- 1 gol home re-sincronizado en GEI BE vs Atlanta → soft-delete.
  Score correcto: **27-29 (home 27 + away 29 = 56)**.

### Estado actual visible al usuario
- Solo 2 equipos activos: **GEI (14 jugadores)** y **GEI BE (12 jugadores)** ✓
- Partido GEI BE vs Atlanta: 27-29 finalizado ✓

## Lo que se hizo en frontend

### Fix definitivo del loop de sync
Tres capas trabajando juntas:

**1. Version check al boot** (`src/lib/app-version.ts`):
- Se importa primero en `main.tsx` para que el wipe corra ANTES de que zustand re-hidrate.
- `APP_VERSION = 'v11.1-beta'`. Cambiar la constante = forzar reset masivo en próximo boot.

**2. Seed gateado** (`src/lib/seed.ts`):
- Flag `hp_seed_done_v1` que **persiste a través de los wipes de version-check**.
- Si ya se sembró alguna vez, no se vuelve a sembrar. **Esta es la causa del loop original**: cada wipe hacía que seed re-creara los demos que luego se sincronizaban a Supabase.

**3. Sync respetando tombstones** (`src/lib/sync.ts`):
- Toda query de download filtra `is('deleted_at', null)`.
- Todo upsert chequea `deleted_at` antes de re-subir; si está marcado, purga local y aborta.
- `purgeLocalDeletedTeams()` y `purgeLocalDeletedMatches()` corren al final del sync para detectar tombstones nuevos.
- Eventos eliminados se filtran al cargar matches; el score se recalcula sobre los eventos vivos.

**4. UI conectada** — al borrar desde la UI ahora se hace soft-delete server-side:
- `softDeleteTeamRemote(localId)` desde `teams-page.tsx` al confirmar borrado.
- `softDeleteEventRemote(localId)` desde `live-match-page.tsx`, `live-match-free.tsx`, y `superpower-bar.tsx` al deshacer/borrar evento.
- `deleteMatchFromServer()` (ya existía) reescrita para usar `soft_delete_match` RPC.

### Sistema de tickets — RPCs corregidas
Las RPCs reales en tu BD son distintas a las que asumí en la primera iteración.
Ahora el frontend llama:
- `get_my_tickets()` (sin args) ✓
- `create_support_ticket(p_category, p_subject, p_message, p_app_version, p_user_agent)` ✓
- `admin_list_tickets(p_status)` — null trae todos ✓
- `admin_update_ticket(p_ticket_id, p_status, p_admin_reply)` — combinada ✓

El form de soporte envía automáticamente `APP_VERSION` y `navigator.userAgent` para que en el panel admin tengas contexto del entorno del usuario al ver el ticket.

### Modo Beta
Sin cambios respecto al paquete anterior: `BETA_UNTIL = 2026-08-09`, `usePlan()` retorna `betaActive`+`betaUntil`, `hasCompleteMode`/`hasVideoAndAI` aceptan `{plan, betaActive}`, banner dismissible con TTL de 24h.

### Player picker fix
Sin cambios respecto al paquete anterior: botón "➕ Agregar jugador no registrado" siempre visible debajo del roster.

### Superpower Mode
Sin cambios funcionales respecto al paquete anterior. Barra densa arriba del scoreboard con `+1`, `ATJ`, `ERR`, `PER`, `2'` y `↶ Deshacer`. Ahora el deshacer también dispara `softDeleteEventRemote` para que el evento quede oculto server-side.

### UI Pro Max — principios de la skill `ui-ux-pro-max` aplicados
Tu app cae en las categorías **Data-Dense Dashboard** + **Real-Time Monitoring**
(de las 10 BI Dashboard Styles de la skill). Los principios que se aplicaron al CSS bajo `.ui-pro-max`:

**De la pre-delivery checklist:**
- `cursor-pointer` universal en clickables, `cursor-not-allowed` en disabled
- Focus visible para nav por teclado (`*:focus-visible` outline primario)
- Transitions 150ms feedback / 200-280ms layout (rango pro recomendado)
- `prefers-reduced-motion` respetado (ya estaba)
- Tabular nums universal en `text-3xl/4xl/5xl` (scores side-by-side limpios)

**Anti-patterns de la skill que el modo neutraliza:**
- Gradients morado/rosa estilo AI → si alguno aparece en el código, se reemplaza
  por gradient del primary del sistema. Reglas con `[class*="from-purple-"]` etc.
- Animaciones >300ms → todas las del modo están dentro del rango 150-280ms
- Pulse agresivo en live indicator → curva más suave y de duración mayor

**Layout en pantallas grandes:**
- `max-width` sube a 80rem en lg+ (más densidad de info)
- Cards con hover lift + borde primario sutil (sólo `pointer:fine`, no en touch)
- Sidebar nav con barrita lateral cuando está activa
- Tablas/listas: row hover visible

### Panel "⚙️ Modos" ahora en mobile
Antes vivía sólo en sidebar desktop. Ahora también hay un botón ⚙️ en el header mobile (al lado del locale selector), que abre un popover con los mismos toggles. Cierra al click afuera.

### Sobre la skill `ui-ux-pro-max-skill` de GitHub
Honestidad: el repo es un sistema (con CLI Python `uipro-cli`) que **genera design systems desde cero** para proyectos nuevos. No es una librería para "drop in" en una app existente. Lo que se aplicó acá fueron sus **principios concretos** — pre-delivery checklist, anti-patterns, rango de timings — adaptados a tu CSS y a tu categoría de producto (Data-Dense Dashboard). Si en el futuro querés correr la CLI literal para generar una paleta nueva o probar un estilo entero distinto, eso requiere agregar Python al stack.

## Verificación pre-paquete

```
npm install   ✓ 272 packages
npm run build ✓ 212 modules transformed, sin errores TS
npm run test:run ✓ 142/142 tests pass
```

## Migration log (Supabase)

```sql
-- 1. backup_teams_20260512_v2 / players / matches / events ← snapshots
-- 2. ALTER TABLE teams|players|matches|events ADD COLUMN deleted_at ← soft delete
-- 3. CREATE INDEX idx_*_active ON ... WHERE deleted_at IS NULL
-- 4. CREATE FUNCTION soft_delete_{team|match|player|event}, get_deleted_*_local_ids
-- 5. UPDATE teams SET deleted_at = now() WHERE id IN (7 duplicados)
-- 6. UPDATE players SET deleted_at = now() WHERE team_id IN (7 duplicados)
-- 7. UPDATE events SET deleted_at = now() WHERE id = <último goal home de Atlanta>
```

Todo reversible: para restaurar un equipo, `UPDATE teams SET deleted_at = NULL WHERE id = '...'`.
