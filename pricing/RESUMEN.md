# RESUMEN — Precios StatzPro (AR / BR / DE / ES)

**Fecha:** 2026-09-02 · agente `analista-precios` · basado en `market/` y `benchmark/`.

## La recomendación en 5 bullets

1. **4 planes, no 5: Free · Pro · Club · Elite.** Se elimina Pro+ (rebanada fina que confunde): su análisis por formación pasa a **Pro**. Pro = "plan entrenador" (todo el análisis, sin video/IA). Club = "plan club" (video + IA + hasta 5 staff + jugadores ilimitados + hasta 5 equipos + branding). (`estructura-de-planes.md`)
2. **El Free sube de 10 partidos a ilimitado en Modo Rápido** (o 30 partidos como variante conservadora). El paywall se corre del *conteo de partidos* al *análisis* (mapa de calor, arquero avanzado, formación, PDF). 10 partidos es media temporada y corta el hábito, sobre todo en AR/BR donde la alternativa es $0 (papel/Excel). (`benchmark/conclusiones.md` §2)
3. **3 bandas de precio con moneda local de góndola**, no una conversión de US$5: LatAm agresivo (AR, BR) · Sur de Europa medio (ES) · DACH pleno (DE). Detección por país/IP/moneda, no por idioma. Pro anual va de ≈US$19 (AR) a US$75 (DE). Todos los precios caen dentro del rango tolerable de su país (`benchmark/conclusiones.md` §3, §7).
4. **Anual con ~30% de descuento** (28–38% según plan/país), presentado como "2 meses gratis". El mensual es puerta de entrada; el anual retiene y, en LatAm, cubre comisión de Mercado Pago y riesgo cambiario. ARS con **revisión trimestral** anclada al USD interno. (`benchmark/conclusiones.md` §8, `market/contexto-economico.md` §3)
5. **Momento ideal para migrar: ~74 usuarios, ~0 pagos recurrentes, beta ya vencida.** Grandfathering al único Elite real (12 meses, charla 1-a-1) + cupón "Fundador" −30% para los veteranos de la beta. En código: reemplazar `PLAN_INFO`/`USD_TO_ARS` por una `PRICE_TABLE` por moneda, quitar Pro+ y subir `matchLimit` del free. **Cobro real bloqueado** en BR (falta Pix/MP-BR) y EU (falta Stripe+SEPA) hasta integrar PSP; AR ya funciona por Mercado Pago. (`plan-de-migracion.md`)

---

## Tabla de precios final (condensada)

**Moneda local de góndola. El equivalente USD es interno, no se muestra en checkout AR/BR.**
FX solo para referencia: 1 USD = 1.545 ARS = 5,40 BRL · 1 EUR = 1,09 USD.

### PRO — plan entrenador (todo el análisis; sin video ni IA)

| País | Mensual | Anual | ≈ USD/año | Desc. anual |
|---|--:|--:|--:|--:|
| 🇦🇷 Argentina | ARS 3.900 | **ARS 29.900** | US$19 | −36% |
| 🇧🇷 Brasil | R$ 19,90 | **R$ 149** | US$28 | −38% |
| 🇪🇸 España | € 4,99 | **€ 39** | US$43 | −35% |
| 🇩🇪 Alemania | € 7,99 | **€ 69** | US$75 | −28% |

### CLUB — plan club (Pro + video + IA + 5 staff + jugadores ilimitados + 5 equipos)

| País | Mensual | Anual | ≈ USD/año | Desc. anual |
|---|--:|--:|--:|--:|
| 🇦🇷 Argentina | ARS 12.900 | **ARS 99.000** | US$64 | −36% |
| 🇧🇷 Brasil | R$ 69,90 | **R$ 549** | US$102 | −35% |
| 🇪🇸 España | € 13,99 | **€ 119** | US$130 | −29% |
| 🇩🇪 Alemania | € 19,99 | **€ 169** | US$184 | −30% |

### FREE / ELITE / PRO JUGADOR

| Plan | 🇦🇷 AR | 🇧🇷 BR | 🇪🇸 ES | 🇩🇪 DE |
|---|--:|--:|--:|--:|
| **Free** | 0 | 0 | 0 | 0 |
| **Elite** (anual, a consultar — piso) | desde ARS 300.000 | desde R$ 1.900 | desde € 390 | desde € 590 |
| **Pro Jugador** (anual) | ARS 18.900 | R$ 99 | € 25 | € 45 |

**Free incluye:** Modo Rápido ilimitado, 2 equipos, stats básicas por jugador, arquero (atajadas), live, compartir por link (marca StatzPro).
**Anclas del benchmark:** Advanced Metrics €25/año (el más barato, "precio mental"), Steazzi €50–200/equipo, SportEasy €69/equipo, LongoMatch €150/año, Hudl US$400/equipo (techo). StatzPro Pro queda por encima de Advanced Metrics (prima por IA+video+offline+web) y por debajo de Steazzi/SportEasy; Club queda muy por debajo de Steazzi Max y Hudl.
