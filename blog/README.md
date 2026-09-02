# Blog de StatzPro

Blog estático (Astro 4) que se publica en **https://statzpro.com/blog**, dentro
del mismo proyecto de Vercel que la SPA.

## Cómo se integra

- `blog/` es un proyecto Astro independiente con `base: '/blog'` y salida a
  `blog/dist`.
- El `build` de la raíz corre `build:blog`, que hace `astro build` en `blog/` y
  copia `blog/dist` → `dist/blog`. Vercel publica `dist/` completo.
- `vercel.json` de la raíz: `cleanUrls`, `/blog` excluido del rewrite de la SPA,
  y cache `immutable` para `/blog/_astro/*`.

## Escribir un artículo

Crear un `.md` en `blog/src/content/posts/`. Frontmatter (schema en
`src/content/config.ts`):

```yaml
---
title: "..."
description: "..."          # ~150-155 car., keyword al frente
pubDate: 2026-09-01T12:00:00-03:00
author: "Equipo StatzPro"
tags: ["...", "..."]
keyword: "keyword primaria"
lang: "es"
faq:
  - q: "..."
    a: "..."
draft: false
---
```

El cuerpo empieza directo con un párrafo (el `<h1>` lo pone el layout). Los links
internos van como `[texto](/blog/slug)`. El bloque CTA a la app lo agrega el
layout solo.

## Local

```bash
cd blog
npm install
npm run dev      # http://localhost:4321/blog
```

## Referencia

- `PLAN-CONTENIDO.md` — plan de keywords / artículos / enlazado interno (agente SEO).
- `GLOSARIO.md` — terminología handball ES-España/LatAm/EN/PT.
- `REVISION-TACTICA.md` — criterio deportivo y correcciones (agente entrenador).
