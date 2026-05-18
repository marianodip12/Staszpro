# SportIQ Architecture — Superpowers Principles

## Overview

SportIQ is a modular, multi-tenant sports intelligence platform built on the **Superpowers philosophy**:

- **Pure domain logic** separated from UI and infrastructure
- **Modular packages** with clear boundaries and responsibilities
- **Scalable architecture** ready for real-time collaboration
- **Type safety** as a first-class citizen
- **Incremental migration** from monolith to microservices (if needed)

---

## Core Design Tenets

### 1. Separation of Concerns

The monorepo is organized into **independent packages** that don't share code horizontally:

```
sportiq/
├── packages/
│   ├── core/        ← Domain logic: sports rules, types, analytics
│   ├── media/       ← Multimedia: storage, clip signatures, renders
│   ├── ui/          ← React primitives: buttons, forms, toasts
│   ├── auth/        ← Auth helpers: RLS, org validation, plan gates
│   └── analytics/   ← Analytics pipeline: season stats, trends
├── apps/
│   └── web/         ← Next.js client: consumption layer
└── supabase/
    ├── migrations/  ← Database schema (SQL)
    └── functions/   ← Edge Functions: async compute, webhooks
```

**Each package exports** via explicit `exports` field in `package.json`. This forces consumers to be intentional about what they import.

### 2. Pure Domain (No Frameworks)

`@sportiq/core` contains **zero references** to:
- React, Vue, or any UI framework
- Supabase, databases, APIs
- Browser or Node.js APIs beyond `console`

Example: `computeSeasonAggregates()` is a pure function that works identically:
- On the client (instant dashboard feedback)
- On an Edge Function (background compute after a match closes)
- In a test file (no setup needed)

### 3. Package Exports Strategy

Each package defines **subpath exports** in `package.json` to encourage tree-shaking and prevent circular imports:

```json
{
  "exports": {
    ".":           "./src/index.ts",
    "./pipeline":  "./src/pipeline/index.ts",
    "./hooks":     "./src/hooks/index.ts",
    "./types":     "./src/types/index.ts"
  }
}
```

Consumers use:
```typescript
import { computeSeasonAggregates } from '@sportiq/analytics/pipeline';  // ✅ specific
import { useSeasonAggregates } from '@sportiq/analytics/hooks';         // ✅ specific
import * from '@sportiq/analytics';                                      // ❌ avoid (pulls everything)
```

### 4. Type-First Development

Every package exports a `types/` entry. The type system is the **contract**:

- `@sportiq/core` defines `Organization`, `Match`, `MatchEvent`, `SeasonStats`.
- `@sportiq/media` defines `VideoAsset`, `ClipSignature`, `RenderJob`.
- `@sportiq/ui` defines `ButtonProps`, `DialogProps`, `ProGateProps`.

**TypeScript's `strict` mode is enforced** (minus the overly-pedantic `exactOptionalPropertyTypes`).

### 5. Monorepo as a Development Tool

**Not a deployment unit.** The monorepo makes local development coherent:

- Run `npm run dev` at the root → dev server for `apps/web` with hot reload on `packages/*`.
- `turbo` orchestrates builds: dependencies flow `core` → `media` → `ui`, `auth`, `analytics` → `apps/web`.
- Tests run in parallel across packages.
- Type checking is global: if `core` changes, TypeScript immediately catches breakage in `analytics`.

**For production:**
- Only `apps/web` is deployed (to Vercel).
- `packages/*` are vendored into the `apps/web` build (Next.js transpiles them via `transpilePackages`).
- `supabase/` is deployed separately (migrations, Edge Functions).

### 6. Superpowers Inspiration

Superpowers is a **collaborative, open-source game development framework**. We adopt its principles:

| Principle | In SportIQ |
|-----------|-----------|
| **Modular plugins** | `@sportiq/{core,media,ui,auth,analytics}` as standalone packages |
| **Incremental adoption** | Start with Handball, layer Soccer/Basketball without rewriting core |
| **Real-time collaboration** | Supabase Realtime for live match events, Websocket-ready architecture |
| **Accessible architecture** | Developers can fork and extend any package independently |
| **Type safety for scale** | Leverage TypeScript to prevent integration bugs as the system grows |
| **Layered rendering** | Core domain → analytics pipeline → UI presentation (separation of concerns) |

---

## Package Guidelines

### `@sportiq/core`

**Exports:**
- Sport domain types: `Organization`, `Team`, `Match`, `MatchEvent`, `Player`.
- Sport-specific enums: `HandballZoneId`, `ThrowType`, `Situation`.
- Pure functions: `computeMatchStats()`, `stampScores()`, analysis functions.
- No side effects, no DB access, no UI.

### `@sportiq/media`

**Exports:**
- `StorageProvider` interface + implementations (`SupabaseStorageProvider`, `R2StorageProvider`).
- `ClipSignature` builder for deterministic clip deduplication.
- `RenderJob` and `RenderAsset` types.
- Pure functions: `buildClipSignature()`, `layoutClips()`.

### `@sportiq/ui`

**Exports:**
- React primitives: `Button`, `Input`, `Dialog`, `Toast`, `Spinner`, `Skeleton`, `EmptyState`, `ErrorFallback`.
- `ProGate` component for feature gating (plan checks).
- `cn()` utility for class merging.
- Pure presentational components (no business logic).

### `@sportiq/auth`

**Exports:**
- `useAuth()` hook (auth state + actions).
- `planHasFeature()` and `useFeatureGate()` for plan-based access control.
- RLS validation helpers.

### `@sportiq/analytics`

**Exports:**
- Pure pipeline functions: `computeSeasonAggregates()`, `buildScorers()`, etc.
- React hooks: `useSeasonAggregates()`, `useFormIndicator()`.
- Types: `SeasonAggregates`, `TopScorer`, `StreakInfo`.

### `apps/web`

**Imports from packages**, adds:
- Page routes (Next.js App Router).
- Data fetching (TanStack Query).
- UI composition (combining `@sportiq/ui` primitives).
- Business logic orchestration (calling analytics, storage, auth).

---

## Build & Deploy

### Local Development

```bash
npm install            # Install all packages
npm run dev           # Turbo dev mode (all packages hot-reload)
npm run build         # Turbo build (graph-aware, cache-optimized)
npm run test          # Vitest across all packages
npm run typecheck     # TypeScript in all packages
```

### Continuous Integration (Vercel)

```bash
# vercel.json configures:
installCommand:  "npx pnpm@9.12.0 install --no-frozen-lockfile"
buildCommand:    "npx pnpm@9.12.0 turbo run build --filter=@sportiq/web..."
outputDirectory: "apps/web/.next"
```

Key points:
- **pnpm** is required (workspace protocol `workspace:*`).
- **Turbo** builds only what's needed for `@sportiq/web`.
- Only `apps/web/.next` is deployed.

### Supabase Deployment

```bash
supabase/migrations/    ← Version-controlled SQL schemas
supabase/functions/     ← Edge Functions (deployed separately)
```

---

## Future Scaling

### Multi-Sport Support

Add `packages/sports/{handball,soccer,basketball}` with sport-specific implementations:

```typescript
// packages/sports/handball/index.ts
export { HandballZone, HandballEvent, buildHandballEvent };

// packages/sports/soccer/index.ts
export { SoccerZone, SoccerEvent, buildSoccerEvent };
```

Core domain remains sport-agnostic; each sport is a plugin.

### Real-Time Collaboration

- Supabase Realtime for live match events.
- Presence system (who's analyzing this match right now?).
- Conflict resolution for concurrent edits (CRDT or OT).

### AI Pipeline

- `packages/ai` for model inference, prompt templates.
- Edge Function workers for async compute.
- Gradual rollout via `@sportiq/ui/ProGate` (premium feature).

### Microservices (Optional)

If needed, any package can become a standalone service:

```typescript
// Instead of:
import { computeSeasonAggregates } from '@sportiq/analytics/pipeline';

// Use an HTTP call:
const response = await fetch('https://analytics-service.internal/aggregate', { ... });
```

The package structure makes this transition easy — the API doesn't change, only the transport layer.

---

## Code Quality

- **TypeScript `strict` mode** enforced (except `exactOptionalPropertyTypes`).
- **Tests in place** for domain logic (`@sportiq/core`, `@sportiq/analytics`).
- **Linting** with ESLint (standardized).
- **Formatting** with Prettier (standardized).
- **No console.logs in production** (use Sentry/PostHog for observability).

---

## Contributing

When adding a feature:

1. **Identify the package** it belongs in. If unclear, it probably needs its own package.
2. **Write types first.** Type the inputs and outputs before implementation.
3. **Keep it pure.** No side effects unless absolutely necessary (and document why).
4. **Test it.** Especially domain logic (`core` and `analytics`).
5. **Export explicitly.** Use `package.json` `exports` field; don't encourage wildcard imports.
6. **Document the boundary.** Write a README if the package is new or complex.

---

## References

- [Superpowers](https://github.com/superpowers/superpowers-core) — Collaborative game dev framework
- [Turborepo](https://turbo.build) — Build system for monorepos
- [pnpm Workspaces](https://pnpm.io/workspaces) — Package management
- [Next.js App Router](https://nextjs.org/docs/app) — Server-side rendering, layouts
- [Supabase](https://supabase.io) — Open-source Firebase alternative

---

**SportIQ: Scalable sports intelligence, built on principles, not hype.**
