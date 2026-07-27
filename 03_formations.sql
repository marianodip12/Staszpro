-- ════════════════════════════════════════════════════════════════════
-- StatzPro v11 · Análisis por formación
-- ════════════════════════════════════════════════════════════════════
--
-- Agrega una columna `lineup` (jsonb) a la tabla events para guardar la
-- formación en cancha al momento de cada evento de mi equipo.
--
-- Forma del JSON:
--   { "field": [3,4,6,7,9,11], "goalkeeper": 1 }
--   { "field": [3,4,6,7,9,11,15], "goalkeeper": null }   // portería vacía
--
-- La columna es nullable e idempotente: los eventos viejos sin formación
-- quedan en NULL y el análisis simplemente los ignora.
--
-- SEGURO PARA PRODUCCIÓN: `add column if not exists` + jsonb nullable →
-- no reescribe filas, no rompe RLS ni PostgREST cache.
-- ════════════════════════════════════════════════════════════════════

alter table public.events
  add column if not exists lineup jsonb;

comment on column public.events.lineup is
  'Formación en cancha (mi equipo) al momento del evento. {field:int[], goalkeeper:int|null}. Null = sin datos de formación.';
