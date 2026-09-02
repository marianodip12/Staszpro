# Experimentos de pricing

**Fecha:** 2026-09-02
**Autor:** agente `analista-precios` (StatzPro)
**Fuentes:** `benchmark/conclusiones.md` §1–3, `market/contexto-economico.md` §5, `market/segmentos.md` §4.

> Contexto: base chica (~74 usuarios, ~0 pagos). Los primeros tests son de **página y framing** (rápidos, no necesitan volumen de conversión), y se corren sobre **nuevos signups**. Los de nivel de precio (test 2) necesitan acumular semanas. Métrica transversal: **ingreso por visita a `/app/plans`** = (checkout iniciado → pagado) × precio.

---

## Test 1 — Límite del Free: ilimitado vs. 30 partidos

- **Qué:** A/B en signups nuevos. Variante A: Modo Rápido **ilimitado**. Variante B: **30 partidos** y luego muro.  (Hoy son 10 — ninguna de las dos es el estado actual; el control es la cohorte pre-cambio.)
- **Hipótesis:** quitar el muro de conteo sube la **activación** (llegar a registrar 2–3 partidos y crear hábito) y el free→pago a 60 días, **sin** canibalizar la conversión, porque el paywall que importa es el **mapa de calor / análisis**, no el nº de partidos. (`benchmark/conclusiones.md` §2)
- **Métrica de éxito:** % de nuevos que abren una vista de análisis (evento "aha") **+ ≥30%**; free→pago a 60 días **igual o mayor** que la cohorte previa. Si B iguala a A en activación, se elige B (algo de escasez sin coste).
- **Duración:** 6–8 semanas o 300 signups/brazo.

---

## Test 2 — Ancla de precio de Pro en España: €29 vs €39 vs €49/año

- **Qué:** 3 celdas de precio para el anual de Pro en la banda ES (el mismo test se replica luego en DE con €59/€69/€89).
- **Hipótesis:** €39 maximiza **ingreso por visita**. €29 sube la conversión pero no lo suficiente para batir a €39 en ingreso; €49 se acerca a Steazzi Premium (€50/equipo) y cae la conversión. (`benchmark/conclusiones.md` §1 y §3: tolerable ES €30–90/año, ancla Advanced Metrics €25 / Steazzi €50)
- **Métrica de éxito:** ingreso por visita a `/app/plans` en la banda ES; se elige la celda ganadora con IC 95%. Vigilar que el precio ganador no dispare el churn a 90 días.
- **Duración:** hasta 60–100 checkouts iniciados por celda (probablemente 2–3 meses; correr en ventana estacional de playoffs).

---

## Test 3 — Framing del anual: "−30%" vs "2 meses gratis" vs precio/mes tachado

- **Qué:** 3 variantes del toggle Mensual/Anual en `plans-page.tsx`. A: badge "−30%" (similar al `-25%` actual). B: "2 meses gratis" + precio/mes equivalente ("€3,25/mes, facturado €39/año"). C: precio mensual tachado junto al anual.
- **Hipótesis:** B sube la **proporción de checkouts anuales**, que mejora caja y baja churn, y en LatAm reduce exposición a comisión de Mercado Pago y a FX. (`benchmark/conclusiones.md` §8, `market/contexto-economico.md` §3)
- **Métrica de éxito:** % de checkouts pagados que son anuales **+10 pp** vs. control, sin caída de la conversión total.
- **Duración:** 4–6 semanas.

---

## Test 4 — Moneda local nativa vs. USD con conversión en el checkout AR/BR

- **Qué:** en el `checkout-dialog` para AR (y BR cuando haya PSP): Variante A: solo **precio local de góndola** ("ARS 29.900/año") + copy "pagás en pesos, sin tarjeta internacional". Variante B: precio USD + línea de conversión (parecido a hoy).
- **Hipótesis:** A convierte más: elimina la fricción psicológica de "esto en dólares se va a poner impagable" y explota la ventaja de cobrar en ARS por Mercado Pago que ningún competidor directo tiene. (`benchmark/conclusiones.md` §6, `market/contexto-economico.md` §1)
- **Métrica de éxito:** `/app/plans` → pago en AR **+20%** en A vs B. (De paso, A elimina el bug de la línea de cotización desincronizada.)
- **Duración:** 6 semanas o 150 checkouts iniciados en AR.

---

## Test 5 — Reencuadre de Club: "3 usuarios" vs "staff hasta 5 + jugadores ilimitados gratis"

- **Qué:** copy y estructura de la card Club. A (actual): "3 cuentas DT/staff". B: "hasta 5 staff que cargan datos · **jugadores ilimitados con acceso gratis a su perfil** · hasta 5 equipos".
- **Hipótesis:** B sube el inicio de checkout de Club y la adopción viral dentro del club, porque iguala el estándar de la competencia ("el coach paga, los jugadores entran gratis" — Advanced Metrics, Steazzi) y quita la lectura de "caro y restrictivo". (`benchmark/conclusiones.md` §5)
- **Métrica de éxito:** tasa de checkout iniciado en Club **+25%**; nº medio de perfiles de jugador activados por cuenta Club (proxy de viralidad) al alza.
- **Duración:** 8 semanas (Club tiene menos tráfico; puede requerir empujarlo con campaña a clubes).

---

## Bonus — Add-on "Video" suelto vs. todo-en-Club

Si tras fusionar Pro+ aparece demanda de un escalón intermedio: ofrecer **"Pro + Video"** como add-on (~+€6/mes ES) sin IA ni multi-staff, contra el Club completo. Hipótesis: captura al entrenador que quiere video pero no es un club. Métrica: ARPU de la banda + canibalización de Club < 20%.
