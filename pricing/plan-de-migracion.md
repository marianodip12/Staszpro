# Plan de migración

**Fecha:** 2026-09-02
**Autor:** agente `analista-precios` (StatzPro)
**Fuentes:** `benchmark/conclusiones.md`, `market/contexto-economico.md`; código: `src/features/billing/checkout-dialog.tsx`, `src/features/billing/plans-page.tsx`, `src/lib/use-plan.ts`, `src/components/pro-gate.tsx`, `01_schema.sql`.

---

## 1. Situación de partida

- **~74 usuarios en prod.** 2 en `elite`: Mariano (fundador, `is_admin=true`, bypass total, no paga) y **1 usuario Elite real**. El resto quedó en `free` tras el reset.
- **Beta ya vencida:** `BETA_UNTIL = 2026-08-31` (`use-plan.ts`). Hoy (2026-09-02) `betaActive=false` → los paywalls (`ProGate`, `hasCompleteMode`, `hasVideoAndAI`) ya están activos y el free real de 10 partidos ya rige.
- **Cero ingresos recurrentes reales.** No hay `pro`/`pro_plus`/`club` pagos vivos. → **Momento ideal para reestructurar**: el coste de migración es casi nulo y la libertad de cambio es máxima.
- Cobro: solo **Mercado Pago (ARS)** + transferencia manual (WhatsApp). `USD_TO_ARS = 1545` hardcodeado.

---

## 2. Qué pasa con cada grupo de usuarios

| Grupo | Cuántos | Qué hacemos |
|---|---|---|
| **Fundador (Mariano)** | 1 | Sin cambios. `is_admin` sigue bypaseando todo. |
| **Elite real** | 1 | **Grandfathering total:** se le mantiene el acceso Elite y las condiciones actuales **mínimo 12 meses**, renovable. Hablarlo 1-a-1 por WhatsApp antes del anuncio: confirmar si hoy paga algo o es cortesía, y si Elite le sigue sirviendo o encaja mejor en Club. Que se entere por vos, no por un email masivo. |
| **Free "beta veterans"** (usaron la app durante la beta) | mayoría de los ~70 | Email + banner: (a) buena noticia → **el free ahora es ilimitado en Modo Rápido** (antes 10 partidos); (b) nuevos planes simplificados (Pro / Club) y **precio en tu moneda**; (c) **cupón "Fundador"**: −30% sobre el precio anual de Pro **de por vida** (o precio fijo 12 meses) si activan en los primeros 30 días. Recompensa el haber estado en la beta y crea urgencia. |
| **Free nuevos** (post-beta) | los que entren de acá en más | Ven directamente la estructura y precios nuevos. Sin cupón (o cupón de bienvenida menor, −15% primer año, como test). |
| **Pagos previos** (si apareciera alguno con `pro/pro_plus/club` activo por transferencia) | ~0 | Grandfather **12 meses** al precio viejo; al renovar, pasan al precio nuevo de su país con aviso de 30 días. `pro_plus` → se mapea a `pro` sin perder features (Pro ahora incluye análisis por formación). |

**Principio:** nadie pierde una feature que ya tenía. `pro_plus` desaparece **hacia arriba** (sus features quedan en Pro), nunca hacia abajo.

---

## 3. Comunicación

**Canales:** email a los ~74 + banner in-app (reutilizar el patrón de `BetaBanner`) + mensaje fijado en el/los grupos de WhatsApp de la comunidad.

**Mensaje (orden de lo que se cuenta):**
1. "El Modo Rápido ahora es **gratis para siempre, sin límite de partidos**." (la mejora primero)
2. "Simplificamos los planes: **Free · Pro · Club · Elite**. Pro+ se fusionó con Pro — si te interesaba el análisis por formación, ahora está en Pro."
3. "Estrenamos **precios en tu moneda** (ARS, BRL, EUR): pagás en pesos por Mercado Pago, sin tarjeta internacional." (ventaja competitiva concreta, `benchmark/conclusiones.md` §6)
4. "Por haber estado en la beta: **cupón Fundador −30% en el plan anual de Pro**, 30 días para activarlo."
5. Link a la nueva página de planes.

**Qué NO hacer:** no encuadrar como "subida de precios" (para DE/ES el número sube vs. el viejo US$45, pero el mensaje es "precio local + free ilimitado"). No mandar el email antes de hablar con el Elite real.

**Timing:** anunciar el mismo día que se despliega la nueva `plans-page`. Campañas de conversión, **estacionales** (semanas previas a playoffs/ascensos/Nacionales de cada liga) — `market/prioridad-y-recomendacion.md` §3.

---

## 4. Qué tocar en el código

### 4.1 `src/features/billing/checkout-dialog.tsx`
- **Reemplazar** `PLAN_INFO` (`{label, monthlyUsd, annualUsd}`) y la constante única `USD_TO_ARS` por una **tabla de precios por moneda**:
  ```ts
  // { [plan]: { [currency]: { monthly, annual } } }
  const PRICE_TABLE = {
    pro:  { ARS: {monthly: 3900,  annual: 29900}, BRL: {monthly: 19.9, annual: 149},
            EUR_ES: {monthly: 4.99, annual: 39}, EUR_DE: {monthly: 7.99, annual: 69} },
    club: { ARS: {monthly: 12900, annual: 99000}, BRL: {monthly: 69.9, annual: 549},
            EUR_ES: {monthly: 13.99, annual: 119}, EUR_DE: {monthly: 19.99, annual: 169} },
  } as const;
  ```
  (valores de `precios-por-pais.md`). Mantener un **ancla USD interna** por plan solo para reporting/márgenes, no para mostrar.
- Sacar `'pro_plus'` de `type CheckoutPlan` (o dejarlo como alias temporal → `'pro'`).
- **Bug a arreglar de paso:** el resumen muestra `Cotización: $1 USD = $1.430 ARS` (string hardcodeado) mientras el cálculo usa `USD_TO_ARS = 1545`. En AR/BR el checkout debe mostrar **solo el precio local**, sin línea de cotización ni equivalente USD (`benchmark/conclusiones.md` §6).
- La RPC `create_payment_request` recibe `p_amount_usd` + `p_amount_ars`: generalizar a `p_amount_local` + `p_currency` (ver §5), manteniendo `p_amount_usd` como ancla de reporte.
- Detección de moneda/banda: país del perfil → IP → `navigator.language` → selector manual. **No** por idioma de la UI.

### 4.2 `src/features/billing/plans-page.tsx`
- **Eliminar la card de PRO +** y su rama en el grid. El grid de entrenador pasa de 4 columnas (Pro/Pro+/Club/Elite) a 3 (Pro/Club/Elite) o 4 con Free incluido.
- Precios: leer de `PRICE_TABLE` según banda detectada, en vez de los literales `'$45'`, `'$75'`, `'$144'`, `'≈ 5.360 ARS/mes'`, etc. (hoy hay ~10 strings de precio hardcodeados entre las cards de coach y player).
- Badge `-25%` → descuento real por plan/país (28–38%); considerar copy **"2 meses gratis"** (`experimentos.md` test 3).
- Copy del header y de la card Free: "10 partidos gratis" → "Modo Rápido gratis, sin límite" (o "30 partidos" si se elige la variante conservadora).
- Feature list de Pro: sumar los ítems ex-Pro+ ("Análisis por formación", "Modo Super Completo en vivo", "Línea temporal + gráfico de score").
- Card Club: "3 usuarios" → "hasta 5 staff · jugadores ilimitados · hasta 5 equipos".

### 4.3 `src/lib/use-plan.ts`
- `type Plan`: quitar `'pro_plus'` de la unión pública (dejar que el resolver acepte el valor legacy y lo trate como `'pro'` para no romper filas viejas).
- `DEFAULT_PLAN_INFO.matchLimit`: `10` → `-1` (free ilimitado) **o** `30` (variante conservadora).
- `hasFormationAnalysis(...)`: incluir `'pro'` (o borrar el helper y gate bajo `hasCompleteMode`). Grep de usos: `hasFormationAnalysis`, `pro_plus`, `'pro_plus'`.
- `effectivePlan` / `effectiveLimit` (preview admin): sacar el caso `pro_plus`; si Pro pasa a free ilimitado, revisar el `preview === 'pro' ? 50 : 10`.
- `getPlanPreview` / `setPlanPreview` / `PREVIEW_KEY`: quitar `'pro_plus'` de la lista de valores válidos.
- `BETA_UNTIL`: ya venció; si se quiere una "ventana de gracia" para veteranos, mejor via cupón/columna en BD que reactivando la beta global.

### 4.4 `src/components/pro-gate.tsx`
- `PRO_CONFIG.defaultFeatures` incluye `'Partidos ilimitados (Free tiene 10)'` → actualizar ("Free ya es ilimitado en Modo Rápido; Pro agrega el análisis").
- Sin cambios en la lógica `requires: 'pro' | 'club'` (sigue habiendo 2 niveles de gate).

### 4.5 Otros
- Grep global de `pro_plus`, `Pro +`, `75`, `144`, `USD_TO_ARS`, `1545`, `1.430` para cazar strings sueltos (landing, blog en `blog/`, `dist/` se regenera).

---

## 5. Qué tocar en la base de datos (Supabase)

> Las tablas de plan/pago **no están en el repo** (`01_schema.sql` solo cubre profiles/teams/players/matches/events). Viven en el proyecto Supabase `emmqrzqxlkqvsqbihwdt`, aplicadas por dashboard. Hay RPCs `get_my_plan`, `create_payment_request` y (presumiblemente) tablas `subscriptions`/`payment_requests` + un enum o CHECK de `plan`.

Cambios:
1. **Enum/CHECK de `plan`:** mantener `'pro_plus'` como valor aceptado (legacy) pero dejar de emitirlo. `UPDATE ... SET plan='pro' WHERE plan='pro_plus'` (hoy: 0 filas, pero dejar el script listo).
2. **`get_my_plan`:** `match_limit` para `free` de `10` → `-1` o `30`, alineado con el código.
3. **Moneda/país:** agregar `country` y `currency` a `profiles` (o a la tabla de suscripción). Se setea en signup/checkout y define la banda.
4. **`create_payment_request(...)`:** generalizar firma a `p_amount_local numeric, p_currency text` (+ mantener `p_amount_usd` como ancla). Guardar ambos.
5. **Grandfathering:** columna `price_locked_until date` y/o `founder_coupon boolean` en la suscripción; el checkout y `get_my_plan` la respetan.
6. **`payment_requests`:** agregar `currency` y renombrar/duplicar `amount_ars` → `amount_local` para no romper histórico.
7. RLS: sin cambios (las policies de `01_schema.sql` no tocan pago).

---

## 6. Qué tocar en Mercado Pago

- Hoy: `mp-create-preference` (edge function) arma la preference con `p_amount_ars`. La cuenta es **Mercado Pago Argentina** → **solo liquida ARS**.
- **AR:** actualizar la edge function para tomar `amount_local` cuando `currency='ARS'`. Si hay planes de suscripción/preapproval pre-creados en el panel de MP con montos fijos, actualizarlos a los nuevos valores (Pro ARS 3.900/29.900, Club ARS 12.900/99.000).
- **BR:** MP-AR no cobra BRL. Para cobrar en reales hace falta **Mercado Pago Brasil** (cuenta BR) o **Pix / Stripe BR**. → **BR queda bloqueado para cobro nativo** hasta integrarlo; coherente con que Brasil es fase 3 (`market/prioridad-y-recomendacion.md`). Mientras tanto, no publicar precio BRL como cobrable.
- **ES/DE:** MP no es la vía en Europa. Hace falta **Stripe (tarjeta + SEPA)** y, para clubes DE, factura con adeudo SEPA (`market/contexto-economico.md` §3). → **EU queda bloqueado para cobro** hasta integrar Stripe. La lista de precios EUR se publica; el cobro real llega con Stripe.
- Revisar la comisión: MP crédito ~6,29% + IVA. En tickets bajos (Pro ARS 3.900/mes) se come el margen → **empujar anual** en LatAm.
- Webhook `mp-create-preference` / confirmación de pago: verificar que el `back_url` y el `payment_request_id` sigan mapeando bien tras el cambio de firma de la RPC.

---

## 7. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Deriva del ARS** entre revisiones trimestrales | El precio ARS queda barato o caro vs. el ancla USD | Revisión trimestral anclada a US$20/US$64; comunicar "ajuste trimestral" de antemano; preferir anual (cierra el precio 12 meses) |
| **DE/ES lo leen como subida** (€69 Pro vs. viejo US$45) | Rechazo, mala prensa en comunidad | Framing "precio local + free ilimitado"; no usar la palabra "aumento"; cupón Fundador |
| **BR/EU sin PSP**: se anuncia precio que no se puede cobrar | Frustración, credibilidad | No publicar BR/EU como cobrable hasta Pix/Stripe; landing "disponible pronto en tu país" |
| **Mala detección de banda** (VPN/IP, viajeros) | Usuario ve precio de otra banda | Selector manual de moneda + override por soporte WhatsApp; loguear país detectado |
| **Perder el mid-tier (Pro+)** | Futuro comprador de "solo formación" sin escalón intermedio | Ese análisis ahora suma valor a Pro; si los datos piden un mid-tier, evaluar add-on "Video" suelto (`experimentos.md` bonus) |
| **Fusión de tiers rompe filas/gates legacy** | Usuarios `pro_plus` sin acceso | Mantener `pro_plus` como valor aceptado en enum + resolver que lo trata como `pro`; script UPDATE |
| **Elite real se siente degradado** | Pérdida del único usuario "pago" | Conversación 1-a-1 antes del anuncio; grandfather 12 meses |
| **Strings de precio hardcodeados sueltos** (landing, blog) | Precios inconsistentes entre páginas | Grep exhaustivo (§4.5); centralizar en `PRICE_TABLE` |
| **Bug de cotización ya en prod** (`$1 USD = $1.430` vs 1545) | Desconfianza en el checkout | Se elimina la línea de cotización en AR/BR en el mismo release |
