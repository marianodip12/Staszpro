# Prioridad de mercados y recomendación de secuencia

**Foco:** Argentina, Brasil, Alemania, España
**Fecha:** 2026-09-02
**Autor:** agente `analista-mercado` (StatzPro)

Ver `dimensionamiento.md`, `segmentos.md` y `contexto-economico.md` para el detalle y las fuentes.

---

## 1. Método de ranking

Puntuamos cada país 1–5 (5 = mejor para StatzPro) en 6 criterios, con un peso que refleja
que **esto es un nicho chico donde importa más convertir y retener que el tamaño bruto**:

| Criterio | Peso | Por qué ese peso |
|---|---|---|
| Tamaño del SAM | 20 % | Importa, pero ninguno de los 4 es "grande"; no debe dominar. |
| Poder de pago / estabilidad monetaria | 25 % | Determina ARPU real y previsibilidad de ingresos. El más alto. |
| Competencia (menos = mejor) | 15 % | Hueco abierto vs. incumbentes fuertes. |
| Facilidad de entrada (proceso de venta, pago, localización) | 15 % | Coste de conseguir el primer 1 % del SAM. |
| Idioma / encaje cultural con el fundador (argentino, ES nativo) | 10 % | Afecta velocidad de ejecución y calidad de soporte. |
| Red del fundador / capacidad de *boca a boca* | 15 % | En un nicho conectado, es el canal de adquisición más barato. |

### Puntuaciones

| Criterio (peso) | 🇪🇸 España | 🇩🇪 Alemania | 🇦🇷 Argentina | 🇧🇷 Brasil |
|---|---|---|---|---|
| SAM (20 %) | 4 (600–1.000) | 5 (2.500–4.000) | 2 (200–400) | 2 (200–400) |
| Poder de pago / moneda (25 %) | 4 | 5 | 2 | 2 |
| Competencia — menos es más (15 %) | 4 (hueco relativamente abierto) | 2 (Advanced Metrics, PerformingStats, Handball.AI en DACH) | 4 | 3 |
| Facilidad de entrada (15 %) | 4 (tarjeta/SEPA, sin localización extra) | 2 (venta a Verein lenta, alemán impecable, integración con el ecosistema oficial) | 4 (Mercado Pago, sin localización) | 2 (PT-BR real, Pix, precio muy bajo) |
| Idioma / cultura fundador (10 %) | 5 | 2 | 5 | 3 |
| Red del fundador / boca a boca (15 %) | 3 (algún contacto vía comunidad hispana) | 1 | 5 (red directa) | 2 |
| **Total ponderado** | **≈ 3,95** | **≈ 3,40** | **≈ 3,15** | **≈ 2,30** |

> Las puntuaciones son cualitativas y sirven para ordenar, no como medida exacta. La conclusión
> es robusta a cambios pequeños de peso: **España sale primero en casi cualquier combinación
> razonable**; Alemania y Argentina se alternan el 2º/3º puesto según cuánto peses "tamaño y
> dinero" (favorece a DE) vs. "facilidad de entrada y red" (favorece a AR); **Brasil queda 4º
> de forma consistente** para un horizonte de 12–24 meses.

---

## 2. Ranking final y porqué (una línea cada uno)

1. **🇪🇸 España** — Mejor equilibrio: SAM mediano (~600–1.000 equipos de pago), idioma nativo
   del fundador, pago con tarjeta/SEPA sin localización, competencia local de balonmano escasa
   y moneda estable; es donde el esfuerzo rinde antes.

2. **🇩🇪 Alemania** — El SAM más grande y con más poder de pago (paga el club, moneda estable),
   pero la entrada es cara: exige alemán impecable, soporte en alemán, encaje con el ecosistema
   oficial (Handball4All/handball.net) y competir con incumbentes DACH ya instalados.

3. **🇦🇷 Argentina** — SAM pequeño y poder de pago bajo/volátil (ARS), pero es donde la **red
   directa del fundador** y el idioma/UX convierten con el menor coste de adquisición; rol de
   *beachhead* de producto y de generación de casos y testimonios, no de ingresos.

4. **🇧🇷 Brasil** — Universo escolar enorme (1M+ practicantes) pero SAM pagador chico
   (~200–400 equipos), BRL volátil, presupuestos de club casi inexistentes y necesidad de
   localización real a PT-BR + Pix; alto *upside* a 5 años, bajo retorno a 18 meses.

---

## 3. Secuencia de foco recomendada

### Fase 1 (0–9 meses) — Validar y monetizar en casa: **España + Argentina en paralelo**

- **España = motor comercial de la fase.** Empujar en clubes de cantera y amateur competitivo
  de Cataluña, Madrid, C. Valenciana, Andalucía, País Vasco/Navarra. Plan "entrenador" mensual
  + plan "club" anual. Objetivo: primeros cientos de equipos de pago y un puñado de clubes
  multi-equipo como referencia.
- **Argentina = beachhead de producto y prueba social.** Usar la red del fundador (FeMeBal,
  Córdoba, Cuyo) para uso intensivo, feedback rápido y testimonios en vídeo/casos. Monetización
  suave (freemium + precio bajo en ARS vía Mercado Pago, revisión trimestral). No se le exige
  ingreso relevante; se le exige *aprendizaje* y *credibilidad*.
- Entregable de fin de fase: métricas de activación/retención por segmento, 8–15 casos
  documentados, pricing validado en EUR y ARS.

### Fase 2 (9–20 meses) — Escalar al mercado grande: **Alemania**

- Localización completa a alemán (producto + soporte + web + material de venta).
- Estrategia de canal: acuerdos con uno o dos *Landesverbände* o ligas regionales; entrada por
  la *Jugendarbeit* (formación de canteras) que es donde el discurso "datos + evolución
  individual" pega más fuerte.
- Pricing "por club / multi-equipo" anual con adeudo SEPA como oferta principal; plan
  entrenador como puerta de entrada.
- Prerrequisito para entrar: tener ya los casos de Fase 1 traducidos y un roadmap de
  integración / coexistencia con el ecosistema oficial.

### Fase 3 (20+ meses) — Apuesta de volumen a largo plazo: **Brasil**

- Solo tras localización PT-BR real y cobro por Pix (idealmente Pix Automático).
- Modelo: freemium agresivo apoyado en el canal **escolar / profesores de Educação Física**
  y ligas estaduales fuertes (SP, RS, PR, SC, MG). Programa de embajadores.
- Expectativa realista: muchos usuarios free, conversión baja, ARPU muy bajo en BRL; el valor
  es comunidad, datos y opción a futuro, no caja a corto plazo.

### Transversal a todas las fases

- Mantener **una sola lista de precios coherente** anclada en EUR, con precios nativos por PPA
  en ARS y BRL (no conversión FX directa).
- El pico de conversión es **estacional** (semanas previas a playoffs/ascensos/Nacionales de
  cada liga): concentrar campañas ahí en cada país.
- Revisar el ranking cuando `benchmark` cierre el mapa de competencia y `analista-precios`
  cierre la WTP por segmento — pueden mover el 2º/3º puesto.

---

## 4. Fuentes

Consolidadas en los otros tres documentos de `market/`. Referencias principales:

- DHB – estructura (4.200 clubes / 21.000 equipos / 790.000 miembros): https://www.vereinsticket.de/neuigkeiten/der-deutsche-handball-aufbau-und-strukturen
- Wikipedia – RFEBM (924 clubes / 99.185 federados, 2019): https://es.wikipedia.org/wiki/Real_Federaci%C3%B3n_Espa%C3%B1ola_de_Balonmano
- ADESP – licencias federadas España 2023 (balonmano 2,4 %): https://adesp.es/el-numero-total-de-licencias-federadas-deportivas-en-2023-crece-hasta-los-4-271-300/
- Wikipedia – Handebol no Brasil: https://pt.wikipedia.org/wiki/Handebol_no_Brasil
- Confederación Argentina de Deportes – CAH (31 provinciales / 526 instituciones / 36.000+ federados): https://cad.org.ar/portfolio/confederacion-argentina-de-handball/
- Handball Argentina – FeMeBal (68 instituciones / 682 equipos / 10.000 jugadores, 2013): http://www.handballargentina.org/escuela/2013/09/17/la-femebal-llego-a-los-10-mil-jugadores/
- Competencia DACH: https://www.performingstats.de/ · https://advanced-metrics.com/ · https://handball.ai/pricing/
- iProfesional – inflación Argentina 2025 (~31,5 %): https://www.iprofesional.com/economia/419097-inflacion-indec-2025-argentina-evolucion-mes-a-mes
- InfoMoney – IPCA 2024 y devaluación del real: https://www.infomoney.com.br/economia/ipca-o-que-o-estouro-da-meta-da-inflacao-em-2024-significa-para-2025/
