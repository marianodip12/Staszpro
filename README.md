# SportIQ Platform

Ecosistema unificado de inteligencia deportiva.  
Fusión de **Handball Analizador** (editor de video + timeline) + **Handball Pro** (estadísticas + análisis).

## Stack

| Capa         | Tecnología                                      |
|--------------|--------------------------------------------------|
| Web app      | Next.js 15 (App Router + RSC)                   |
| UI           | Tailwind CSS + Radix UI + Lucide                |
| Estado       | Zustand (live match only) + TanStack Query       |
| Backend      | Supabase (Auth · Postgres · Storage · RLS)      |
| Edge         | Supabase Edge Functions (Deno)                  |
| Monorepo     | pnpm workspaces + Turborepo                     |
| Tests        | Vitest                                          |

## Estructura

```
sportiq/
├── apps/
│   └── web/                     # Next.js 15 app
│       ├── src/app/             # Routes (RSC)
│       ├── src/features/        # Feature modules (client)
│       ├── src/hooks/           # useEventSync, useVideoUpload, useClipSignature
│       ├── src/stores/          # Zustand (live-match only)
│       └── src/lib/             # supabase.ts, storage.ts
├── packages/
│   ├── core/                    # @sportiq/core — sport domain (pure TS)
│   │   ├── src/types/           # Organization, Match, MatchEvent, Player…
│   │   └── src/sports/handball/ # analysis, stats, evolution, mappers, types
│   ├── media/                   # @sportiq/media — media domain (pure TS)
│   │   ├── src/types/           # VideoAsset, ClipSignature, RenderJob…
│   │   ├── src/storage/         # StorageProvider interface + SupabaseStorageProvider
│   │   └── src/clip/            # ClipSignature engine (SHA-256 dedup)
│   └── auth/                    # @sportiq/auth — Supabase client + org helpers
└── supabase/
    ├── migrations/              # SQL versionado (001_foundation, 002_migration_support)
    └── functions/               # Edge Functions (trigger-render, generate-signed-url, migrate-user)
```

## Fases de implementación

### ✅ Fase 1 — Fundación (completada)
- Monorepo pnpm + Turborepo
- `@sportiq/core`: dominio deportivo puro, multi-tenant, testeado
- `@sportiq/media`: StorageProvider abstraction, ClipSignature engine
- Schema SQL unificado con 15 tablas, RLS multi-tenant, auto-org en signup
- Edge Functions: trigger-render, generate-signed-url

### ✅ Fase 2 — UI Shell + Features principales (completada)
- Design system: tokens CSS, tipografía DM Sans + Space Mono + Barlow Condensed
- `OrgShell`: sidebar colapsable, breadcrumb, nav multi-rol
- `CourtView` + `GoalGrid`: crossfilter visual SVG interactivo
- `LiveMatchPage`: árbol de eventos 4 niveles + scoreboard + sync optimista
- `MatchAnalysisClient`: análisis post-partido 3 columnas, tabs, crossfilter
- `VideoPanel`: player + signed URLs + sidebar click-to-seek
- `StatsPanel` + `ScoreTimeline`: recharts, momentos clave, goleadores
- `TimelineEditor`: clips como metadata, drag trim, export via ClipSignature

### ✅ Fase 3 — Rutas completas + Migración + Tests (completada)
- `DashboardPage`: métricas de temporada, últimos partidos, acciones rápidas
- `TeamsClient`: CRUD inline de equipos y jugadores con validación de número
- `MatchForm`: nuevo partido con selección de equipos y preview
- Rutas: `/matches/new`, `/matches/[id]/live`, `/video/timeline`
- Tests: 60+ assertions en análisis, stats, evolución, mappers, ClipSignature
- Edge Function `migrate-user`: JSONB → match_events normalizado, idempotente
- Migration 002: columnas legacy para migración incremental

### 🔄 Fase 4 — Escalabilidad (próxima)
- FFmpeg worker externo para render real
- Cloudflare R2 provider (swap de una línea)
- Analytics pipeline background compute
- Multi-sport: `sport_type` configurable por Org
- Scouting module
- AI pipeline: auto-tagging de eventos

## Configuración inicial

### 1. Variables de entorno

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 2. Instalar y buildear

```bash
pnpm install
pnpm build
```

### 3. Ejecutar migraciones

```bash
pnpm db:migrate          # supabase db push
pnpm db:types            # genera types desde schema
```

### 4. Crear buckets en Supabase Storage

```
videos     — private, max 5GB, video/mp4 + video/webm + video/quicktime
thumbnails — private, max 10MB, image/jpeg + image/png
renders    — private, max 2GB, video/mp4 + video/webm + image/gif
```

### 5. Deploy Edge Functions

```bash
supabase functions deploy trigger-render
supabase functions deploy generate-signed-url
supabase functions deploy migrate-user
```

### 6. Migrar usuarios existentes de Handball Pro

```bash
# Llamar la función desde el cliente (o via curl con el token del usuario):
POST /functions/v1/migrate-user
Authorization: Bearer <user_token>
{ "dry_run": true }   # simular primero
{ "dry_run": false }  # ejecutar migración real
```

### 7. Desarrollo local

```bash
pnpm dev        # todos los workspaces en paralelo
pnpm test       # Vitest en @sportiq/core y @sportiq/media
pnpm typecheck  # TypeScript strict en todo el monorepo
```

## Principios de arquitectura

| Principio              | Implementación                                               |
|------------------------|--------------------------------------------------------------|
| Multi-tenant           | `org_id` en todas las tablas + RLS basado en `org_members`   |
| Separación de dominios | `@sportiq/core` y `@sportiq/media` sin imports cruzados      |
| Video sin duplicación  | ClipSignature dedup via SHA-256 — mismo clip = 0 re-renders  |
| Storage abstracto      | `StorageProvider` interface — Supabase hoy, R2 mañana        |
| Estado mínimo          | Zustand solo para partido en vivo — histórico en TanStack Query |
| RSC-first              | Páginas como Server Components — cliente solo donde hay interactividad |

## Convenciones de código

- **IDs**: siempre UUID (`crypto.randomUUID()` en cliente, `gen_random_uuid()` en DB)
- **Timestamps**: ISO strings (no Date objects en tipos de dominio)
- **Nullability**: `T | null` en tipos DB-facing, nunca `T | undefined`
- **Imports de dominio**: features importan de `@sportiq/core`, nunca al revés
- **Signed URLs**: siempre via `/api/storage/signed-url` — nunca URLs directas de Supabase en el cliente
