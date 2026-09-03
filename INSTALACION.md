# Setup

> El instructivo viejo (crear las tablas corriendo `01_schema.sql`) quedó
> obsoleto y **destruiría** el schema real de producción. Está en
> `db/legacy/`. Esto es lo vigente.

## Proyecto Supabase

**Producción:** `xakmuljnclgywxdmgaws` — `https://xakmuljnclgywxdmgaws.supabase.co`
· [dashboard](https://supabase.com/dashboard/project/xakmuljnclgywxdmgaws)

El schema vive en Supabase (aplicado por dashboard / migraciones), no en el
repo. Inventario en [`db/schema.md`](db/schema.md).

⚠️ **No hay proyecto de staging.** En desarrollo la app pega contra
producción. Cuidado al crear o borrar datos de prueba.

## Local

```bash
cp .env.example .env.local
# → pegá VITE_SUPABASE_ANON_KEY (la publishable key) desde:
#   https://supabase.com/dashboard/project/xakmuljnclgywxdmgaws/settings/api
npm install
npm run dev            # http://localhost:5173

npm run typecheck
npm run test:run
npm run build          # genera dist/ + dist/blog/
```

Sin `.env.local`, la app arranca con data seed local (ideal para iterar UI).

## Vercel

Proyecto `staszpro` (ojo con la `s`). Env vars (Production + Preview + Development):

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://xakmuljnclgywxdmgaws.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | la publishable key de prod (`sb_publishable_…`) |

El deploy sale de `main`. Si un push a `main` no dispara build (a veces se
pierde el webhook), pushear otro commit o redeployar desde el dashboard.

## Compartir un partido

Partido finalizado → botón **Compartir** → link `/(app)/…` público
`statzpro.com/share/:token` (lectura pública vía RLS con `is_public` +
`share_token`, sin login).
