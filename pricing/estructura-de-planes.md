# Estructura de planes — recomendación

**Foco:** Argentina, Brasil, Alemania, España
**Fecha:** 2026-09-02
**Autor:** agente `analista-precios` (StatzPro)
**Fuentes:** `benchmark/conclusiones.md`, `benchmark/matriz-precios.md`, `benchmark/matriz-features.md`, `market/segmentos.md`, `market/contexto-economico.md`. Estado del producto verificado en `src/features/billing/checkout-dialog.tsx`, `src/features/billing/plans-page.tsx`, `src/lib/use-plan.ts`, `src/components/pro-gate.tsx`.

---

## 1. Estado actual (verificado en código)

| Tier | Precio hoy | Gate en código |
|---|---|---|
| `free` | US$0 — **10 partidos** (`DEFAULT_PLAN_INFO.matchLimit = 10`, `use-plan.ts`) | Modo Rápido + stats básicas + arquero (atajadas) + live |
| `pro` | US$5/mes · US$45/año | `hasCompleteMode` → mapa de tiros, zonas, análisis por jugador/período, PDF, compartir |
| `pro_plus` | US$8/mes · US$75/año | `hasFormationAnalysis` → análisis por formación, evolución de marcador por formación, timeline |
| `club` | US$15/mes · US$144/año (**3 usuarios**) | `hasVideoAndAI` → video sincronizado, compilador de jugadas, YouTube, IA, arquero avanzado, soporte WhatsApp |
| `elite` | A consultar | multi-equipo formativas, usuarios ilimitados, reportes federación, a medida |

Además hay un eje **Entrenador / Jugador** en `plans-page.tsx`: el Jugador ve un Pro más barato (US$3/mes · US$27/año) y solo Free + Pro.

Cobra en **ARS por Mercado Pago** con `USD_TO_ARS = 1545` hardcodeado (`checkout-dialog.tsx`). Beta (`BETA_UNTIL = 2026-08-31`) ya venció: hoy los paywalls están activos y el grueso de los ~74 usuarios está en `free`.

---

## 2. Problemas de la estructura actual

1. **Free de 10 partidos = muro demasiado temprano.** 10 partidos ≈ media temporada amateur. Los competidores directos tienen **free permanente sin tope de partidos** (Steazzi Basic con equipos y partidos ilimitados; SportEasy Basic ≤30 miembros; LongoMatch Basic). En AR/BR, donde la alternativa real es **$0 (papel/Excel)** y hay fricción de pago, el muro corta el hábito antes de que nazca. (`benchmark/conclusiones.md` §2)
2. **Pro+ es un tier de rebanada fina y confunde.** Solo agrega "análisis por formación" + "modo super completo en vivo" + timeline sobre Pro, por +67% de precio (US$45→US$75). El salto Pro→Pro+ no tiene una historia de valor clara y parte el mensaje en dos. El rol del agente pide explícitamente "evaluar si `pro_plus` se justifica o confunde": **no se justifica**.
3. **Club "3 usuarios" se lee mezquino** al lado del estándar "el coach paga, los jugadores entran gratis" (Advanced Metrics, Steazzi). El eje de cobro debería ser *equipos gestionados* + *staff que carga datos*, no *usuarios totales*. (`benchmark/conclusiones.md` §5)
4. **Un solo precio global en USD** deja plata sobre la mesa en Alemania (tolera 2–3× lo de AR) y expulsa usuarios en AR/BR. (`benchmark/conclusiones.md` §7)
5. El `pro-gate` mete "partidos ilimitados (Free tiene 10)" como beneficio de Pro: si el free deja de tener tope, hay que reescribir ese copy y mover el ancla de valor al **análisis** (mapa de calor, arquero, IA, video).

---

## 3. Estructura recomendada: **Free / Pro / Club / Elite** (se elimina Pro+)

Se pasa de 5 a **4 tiers**, alineados con los dos empaques que pide el mercado (`market/segmentos.md` §4): **"plan entrenador"** (Pro, mensual, personal, tarjeta/wallet) y **"plan club / multi-equipo"** (Club, anual, staff, factura).

### 3.1 Qué es cada tier

| Tier | Rol | Comprador | Ciclo dominante |
|---|---|---|---|
| **Free** | Gancho y captación (formativo, escolar, entrenador nuevo) | — | — |
| **Pro** | El caballo de batalla. Todo el análisis para **un** entrenador, un cuerpo técnico chico. Absorbe a Pro+. | Entrenador de su bolsillo (AR, BR, formativo ES) o club chico | Mensual → Anual |
| **Club** | 1 club: staff múltiple, jugadores ilimitados de solo-lectura, **video + IA + multi-equipo**, branding del club | Club con estructura (DE, cantera ES, primera división AR/BR) | Anual (factura / SEPA / Pix) |
| **Elite** | Federaciones y clubes grandes: usuarios ilimitados, reportes de federación, integraciones y features a medida | Federación / club profesional | Anual, contrato |

### 3.2 El free sube: de "10 partidos" a "ilimitado en Modo Rápido"

**Recomendación primaria:** free = **partidos ilimitados**, **hasta 2 equipos**, Modo Rápido completo + stats básicas por jugador + stats de arquero (atajadas) + score/eventos en vivo + compartir por link con marca StatzPro. **El paywall se corre al análisis**, no al conteo. Esto replica a Steazzi Basic ("equipos y partidos ilimitados; análisis avanzado limitado al último partido") y es lo que la conclusión del benchmark pide de forma explícita.

**Variante conservadora** (si más adelante los datos muestran abuso o querés algo de escasez): free = **30 partidos** (≈ temporada completa + playoffs) en vez de ilimitado. 30, no 20–25: que nadie choque el muro dentro de su primera temporada.

En cualquiera de las dos, el número mágico ("aha moment") es **abrir el mapa de calor / el análisis de un partido** → esa es la puerta de Pro.

### 3.3 Mapa de features por tier (mapa de calor, arquero, IA, video, multi-usuario, compartir, export)

| Feature | Free | **Pro** | **Club** | **Elite** |
|---|:--:|:--:|:--:|:--:|
| Modo Rápido (registro en vivo, 2 toques) | ✓ | ✓ | ✓ | ✓ |
| Equipos | 2 | ilimitados | ilimitados | ilimitados |
| Partidos | ilimitados* | ilimitados | ilimitados | ilimitados |
| Stats básicas por jugador | ✓ | ✓ | ✓ | ✓ |
| Stats de arquero — atajadas (básico) | ✓ | ✓ | ✓ | ✓ |
| Score y eventos en vivo | ✓ | ✓ | ✓ | ✓ |
| **Compartir por link** | ✓ (marca StatzPro) | ✓ | ✓ (branding del club) | ✓ (branding) |
| **Mapa de calor / zonas de tiro** | — | ✓ | ✓ | ✓ |
| **Cuadrante del arco + arquero avanzado** | — | ✓ | ✓ | ✓ |
| Análisis por jugador / período / sub-motivos de pérdida | — | ✓ | ✓ | ✓ |
| **Análisis por formación** + evolución de marcador por formación *(ex Pro+)* | — | ✓ | ✓ | ✓ |
| Modo Super Completo en vivo + línea temporal + gráfico de score *(ex Pro+)* | — | ✓ | ✓ | ✓ |
| **Exportar PDF** | — | ✓ | ✓ | ✓ |
| **Exportar CSV / XML** | — | — | ✓ | ✓ |
| **Video sincronizado con eventos** | — | — | ✓ | ✓ |
| **Compilador de jugadas / highlights** | — | — | ✓ | ✓ |
| **Subida a YouTube del club** | — | — | ✓ | ✓ |
| **Análisis con IA / insights** | — | — | ✓ | ✓ |
| **Multi-usuario (staff que carga datos)** | 1 | 1 | **hasta 5** | ilimitado |
| **Jugadores con acceso solo-lectura a su perfil** | — | ilimitados | ilimitados | ilimitados |
| Multi-equipo con vista de club (formativas) | — | — | ~ (hasta 5 equipos) | ✓ ilimitado |
| Reportes para federación | — | — | — | ✓ |
| Capacitación al staff / integraciones a medida | — | — | — | ✓ |
| Soporte | Comunidad / centro de ayuda | Email | **WhatsApp prioritario** | Dedicado + SLA |

\* o 30 partidos si se elige la variante conservadora.

**Racional del reparto:**
- **Pro concentra los diferenciales "de análisis":** mapa de calor, cuadrante de arco, arquero avanzado, análisis por formación (ex Pro+), PDF, compartir. Es lo que separa a StatzPro de "una app de contar goles" y de la planilla de Excel. Pro **no** regala video ni IA. (`benchmark/conclusiones.md` §4)
- **Club concentra los diferenciales "de equipo/producción":** video sincronizado, IA, compilador, YouTube, CSV/XML, staff múltiple, jugadores ilimitados, branding. Es el paquete que un club paga una vez al año. Frente a Steazzi (video solo en el plan Max €200/equipo) y a Hudl (US$400/equipo), Club sigue siendo barato y específico de balonmano. (`benchmark/matriz-precios.md` §C)
- **Elite** es el escaparate/credibilidad (`market/segmentos.md` §1: la elite ya usa Advanced Metrics / PerformingStats / analista dedicado; no es el ICP) — se vende a medida y sirve de tope de la lista.
- **"Jugadores gratis" resuelve la objeción de packaging** del benchmark §5: el eje de cobro pasa a ser staff + equipos, no headcount.

### 3.4 Eje Entrenador / Jugador

Se mantiene el toggle actual. El **"Pro Jugador"** es un Pro individual recortado (seguimiento personal, sin gestión de equipo) a **~55–65% del precio de Pro Entrenador** por país (ver `precios-por-pais.md`, fila secundaria). Free y Elite no cambian por audiencia; Club es solo Entrenador.

---

## 4. Descuento anual y prueba

- **Anual con ~30% de descuento** (rango 28–38% según plan/país; ver `precios-por-pais.md`). Todos los competidores directos venden anual (Steazzi, Advanced Metrics, LongoMatch, Nacsport); el mensual es puerta de entrada, el anual es donde se retiene. (`benchmark/conclusiones.md` §8)
- Mostrar el anual como **"2 meses gratis"** + precio/mes equivalente, no solo "-30%" (ver `experimentos.md`, test 3).
- **Prueba:** Pro 7 días, Club 14 días (como hoy). En LatAm, además, el free generoso ya hace de prueba infinita del núcleo del producto.
- En LatAm, empujar **anual** en el mensaje: mejora unit economics (comisión Mercado Pago ~6% + IVA se paga una vez) y cubre riesgo cambiario. (`market/contexto-economico.md` §3)

---

## 5. Resumen de cambios vs. hoy

| Cambio | De | A |
|---|---|---|
| Tiers | free / pro / **pro_plus** / club / elite | free / pro / club / elite |
| Free | 10 partidos | Partidos ilimitados + 2 equipos (o 30 partidos) |
| Análisis por formación | Pro+ (US$75/año) | incluido en Pro |
| Club | "3 usuarios" | "hasta 5 staff + jugadores ilimitados + hasta 5 equipos" |
| Precio | único en USD, ARS por FX fijo | 3 bandas, moneda local de góndola (ver `precios-por-pais.md`) |
| Ancla de valor del mensaje | "estadísticas" | IA + video + offline + mapa de calor (`benchmark/conclusiones.md` §4) |
