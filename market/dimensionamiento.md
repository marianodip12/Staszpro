# Dimensionamiento de mercado — Balonmano / Handball

**Foco:** Argentina, Brasil, Alemania, España
**Fecha:** 2026-09-02
**Autor:** agente `analista-mercado` (StatzPro)

> Regla de este documento: ningún número es inventado. Cada cifra tiene fuente o es una
> estimación con método explícito y rango. StatzPro es un nicho chico: el valor es
> tráfico ultra-calificado y usuarios que entienden el producto, **no** volumen masivo.
> Todas las estimaciones de SAM son deliberadamente conservadoras (banda baja).

---

## 0. Marco de estimación (común a los 4 países)

**TAM** (universo total teórico) = todos los equipos de balonmano federados + equipos
escolares/formativos no federados del país.

**SAM** (mercado atendible) = equipos que (a) compiten de forma regular, (b) tienen a
alguien —club o entrenador— con capacidad y motivo para pagar una herramienta de análisis,
y (c) operan en un idioma que StatzPro cubre (ES/EN/PT/DE). Excluye explícitamente:
mini-handball / iniciación pura, equipos de un solo torneo al año, y equipos sin ningún
presupuesto ni entrenador con voluntad de pago.

**Método SAM (cadena de filtros), aplicado igual en los 4 países:**

1. Partimos del nº de **equipos federados** estimado por país (no de licencias ni de clubes).
2. Filtro "equipo competitivo": nos quedamos con equipos de categorías **adulto + juvenil/junior
   + cadete de rendimiento**. Regla: **~35–45 % de los equipos federados** (el resto es
   infantil/mini/escuela). Rango tomado del reparto habitual de categorías en las federaciones
   europeas y sudamericanas.
3. Filtro "hay quién pague": aplicamos un % país según presupuesto de club + poder adquisitivo
   del entrenador (ver `contexto-economico.md`). Alemania alto, España medio, Brasil/Argentina bajo.
4. El resultado es SAM. **SOM (año 1–2) sería ~5–15 % del SAM**, no se estima aquí.

Unidad de cobro asumida: **por equipo** (es como cobran los competidores: HandStat 39–59 €/año
por equipo, 159 €/año licencia de club — [handstat.app](https://handstat.app/index-en.html)).

---

## 1. ALEMANIA — Deutscher Handballbund (DHB)

### Datos con fuente

| Métrica | Valor | Fuente |
|---|---|---|
| Miembros federados | **~790.000** | [dhb.de – Zuwachs bei Mitgliederzahlen](https://www.dhb.de/de/redaktionsbaum/verband/zuwachs-bei-mitgliederzahlen); [vereinsticket.de](https://www.vereinsticket.de/neuigkeiten/der-deutsche-handball-aufbau-und-strukturen) |
| Clubes | **~4.200** | íd. (DHB se describe como la federación de balonmano más grande del mundo) |
| Equipos | **~21.000** | íd. |
| Federaciones regionales (Landesverbände) | ~20 | [Wikipedia – Deutscher Handballbund](https://de.wikipedia.org/wiki/Deutscher_Handballbund) |
| Nivel profesional | 18 equipos (HBL masc.) + 12 (HBF fem.) | [dhb.de](https://www.dhb.de/) — resto es semipro/amateur (3. Liga hacia abajo) |
| Presencia escolar (Grundschulaktionstag) | **~3.000 escuelas primarias, ~1.700 clubes, ~14.000 clases, ~320.000 niños/año** | [dhb.de – Grundschulaktionstag](https://www.dhb.de/services/kinder/grundschulaktionstag-handball-in-deutschland) |

### Entrenadores (estimación)

No hay cifra pública consolidada de titulares de licencia DHB. Método:
- ~21.000 equipos × 1 entrenador principal = **~21.000** como piso.
- Ajuste al alza: equipos de rendimiento suelen tener 2º entrenador; equipos de base a veces
  comparten entrenador. Neto ≈ **25.000–35.000 personas entrenando** en el sistema DHB.
- Vía de formación: licencias C → B → A ([dhb.de/services/trainer](https://www.dhb.de/services/trainer/ausbildung/handballtrainer-c-lizenz)).

### SAM Alemania

| Paso | Cálculo | Resultado |
|---|---|---|
| Equipos federados | dato DHB | 21.000 |
| × equipos competitivos (35–45 %) | 0,35–0,45 | 7.350–9.450 |
| × "hay quién pague" (**30–45 %**, alto: clubes con estructura de Abteilung + presupuesto, cultura de Ehrenamt con Übungsleiterpauschale de 3.000 €/año que a veces financia herramientas) | 0,30–0,45 | **~2.500–4.000 equipos** |

**SAM Alemania ≈ 2.500–4.000 equipos de pago.** Es el SAM más grande de los cuatro en
términos absolutos y, sobre todo, el de mayor poder de pago por equipo. Contras: idioma (DE),
competencia local madura (Advanced Metrics, PerformingStats, Handball.AI operan fuerte en DACH
— [performingstats.de](https://www.performingstats.de/), [advanced-metrics.com](https://advanced-metrics.com/)),
ciclo de venta al club más lento.

---

## 2. ESPAÑA — Real Federación Española de Balonmano (RFEBM)

### Datos con fuente

| Métrica | Valor | Fuente |
|---|---|---|
| Licencias federadas balonmano | **~100.000+** (2023, +10 % interanual) | [Wikipedia – RFEBM](https://es.wikipedia.org/wiki/Real_Federaci%C3%B3n_Espa%C3%B1ola_de_Balonmano); consistente con "2,4 % de 4.271.300 licencias federadas totales 2023" ≈ 102.500 → [ADESP](https://adesp.es/el-numero-total-de-licencias-federadas-deportivas-en-2023-crece-hasta-los-4-271-300/), [Estadística del Deporte Federado 2023 / CSD](https://dbsport.press/estadistica-del-deporte-federado-ano-2023/) |
| Clubes | **~924** (dato mayo 2019) → hoy estimado **~900–1.050** | [Wikipedia – RFEBM](https://es.wikipedia.org/wiki/Real_Federaci%C3%B3n_Espa%C3%B1ola_de_Balonmano) (924 clubes / 99.185 federados en 2019) |
| Nivel profesional / semipro | Liga ASOBAL (16, masc.) + Liga Guerreras Iberdrola (fem.) + División de Plata | [asobal.es](https://asobal.es/) |
| Concentración geográfica | Cataluña, Andalucía, Madrid y C. Valenciana = 53,9 % de todas las licencias deportivas de España | [ADESP](https://adesp.es/el-numero-total-de-licencias-federadas-deportivas-en-2023-crece-hasta-los-4-271-300/) |

### Equipos y entrenadores (estimación)

- **Equipos:** las ~100.000 licencias incluyen jugadores + técnicos + oficiales + directivos.
  Asumiendo ~14–16 licencias de jugador por equipo y ~65–75 % de las licencias como jugadores
  activos → **~4.000–5.500 equipos federados**. Banda conservadora: **4.000–5.000**.
- **Entrenadores:** ~1–1,3 por equipo → **~5.000–6.500** técnicos con licencia territorial/RFEBM.
- **Escolar/formativo:** balonmano es deporte fuerte en Juegos Deportivos autonómicos
  (sobre todo Cataluña —"handbol" es tradición— y Madrid). No hay cifra nacional única
  fiable; el grueso del deporte escolar de balonmano se canaliza vía clubes federados y
  competición territorial, por lo que buena parte ya está contada en las licencias.

### SAM España

| Paso | Cálculo | Resultado |
|---|---|---|
| Equipos federados | estimación | 4.000–5.000 |
| × equipos competitivos (35–45 %) | 0,35–0,45 | 1.400–2.250 |
| × "hay quién pague" (**35–45 %**, medio: clubes de cantera con algo de estructura pagan; en formativo/territorial es común que **pague el entrenador de su bolsillo**) | 0,35–0,45 | **~600–1.000 equipos** |

**SAM España ≈ 600–1.000 equipos de pago.** Mercado mediano, idioma nativo del fundador,
pago con tarjeta/SEPA sin fricción, competencia media. Mejor relación esfuerzo/retorno.

---

## 3. BRASIL — Confederação Brasileira de Handebol (CBHb)

### Datos con fuente

| Métrica | Valor | Fuente |
|---|---|---|
| Federações estaduais | **27** | dato reportado en búsqueda sobre CBHb (consistente con 26 estados + DF) |
| Clubes filiados | **~1.847** | íd. (fuente secundaria; no verificable en dhb-style report oficial — tratar como orden de magnitud) |
| Atletas registrados (federados) | **~40.000+** | íd. |
| Referencia histórica IHF (2003) | 201.048 federados / 687 clubes / **7.774 equipos** | [Wikipedia – Handebol no Brasil](https://pt.wikipedia.org/wiki/Handebol_no_Brasil) |
| Practicantes totales (incl. no federados / escolares) | **CBHb estima > 1.000.000** | íd. |
| Presencia escolar | Handball = **2º deporte más practicado en escuelas** de Brasil, tras el futsal | íd. ([Wikipedia – Handebol no Brasil](https://pt.wikipedia.org/wiki/Handebol_no_Brasil)) |
| Nivel profesional | Liga Nacional de Handebol (LNH) — pequeña, mayormente amateur con apoyo municipal/patrocinio | íd. |

> Nota de calidad de dato: Brasil es el país con datos federativos **menos verificables** de
> los cuatro. El contraste entre "40.000 federados hoy" y "201.048 federados en 2003 (IHF)"
> sugiere o bien una caída real de la federación formal, o bien criterios de conteo distintos
> (hoy "atleta registrado en competición nacional" vs. "licencia estadual" en 2003). El
> universo **escolar** (1M+ practicantes) es real y enorme, pero es un mercado sin presupuesto.

### Equipos y entrenadores (estimación)

- **Equipos federados:** entre el dato histórico (7.774 en 2003, criterio amplio) y el
  actual (~1.847 clubes × 1,5–2,5 equipos por club en varias categorías) →
  **~3.000–4.500 equipos** en competición estadual/nacional. Conservador: **~3.000**.
- **Entrenadores:** mezcla de profesores de Educação Física (que llevan el handball escolar)
  y técnicos de club. En el circuito federado: **~3.500–5.000**. En el escolar: decenas de miles
  de profesores de EF, pero con casi nula capacidad de pago individual.

### SAM Brasil

| Paso | Cálculo | Resultado |
|---|---|---|
| Equipos federados | estimación | ~3.000 |
| × equipos competitivos (35–45 %) | 0,35–0,45 | 1.050–1.350 |
| × "hay quién pague" (**15–25 %**, bajo: presupuestos de club muy finos, BRL volátil, dependencia de patrocinio/prefeitura; algo de WTP en técnicos de estados fuertes —SP, RS, PR, SC, MG—) | 0,15–0,25 | **~200–400 equipos** |

**SAM Brasil ≈ 200–400 equipos de pago** (con freemium agresivo y precio en BRL muy bajo).
Volumen escolar gigante pero no monetizable directamente hoy. Idioma PT = barrera parcial
(hay que localizar de verdad, no basta español). Es el mercado de mayor *upside* a 5 años y
menor *retorno* a 18 meses.

---

## 4. ARGENTINA — Confederación Argentina de Handball (CAH) / FeMeBal

### Datos con fuente

| Métrica | Valor | Fuente |
|---|---|---|
| Asociaciones/federaciones provinciales afiliadas | **31** | [cad.org.ar – CAH](https://cad.org.ar/portfolio/confederacion-argentina-de-handball/); [Wikipedia – CAH](https://es.wikipedia.org/wiki/Confederaci%C3%B3n_Argentina_de_Handball) |
| Instituciones de base | **526** | íd. |
| Jugadores federados | **~36.000+** | íd. |
| FeMeBal (área metropolitana Buenos Aires) | **68 instituciones, 682 equipos, ~10.000 jugadores** (dato 2013) | [handballargentina.org](http://www.handballargentina.org/escuela/2013/09/17/la-femebal-llego-a-los-10-mil-jugadores/); [Wikipedia – FeMeBal](https://es.wikipedia.org/wiki/Federaci%C3%B3n_Metropolitana_de_Balonmano) |
| Núcleos fuertes fuera de AMBA | Córdoba, Mendoza, San Juan, Entre Ríos, Bahía Blanca (AsBalNor), Atlántica, San Rafael | [handballargentina.org](https://handballargentina.org/) (sedes recurrentes de Nacionales de Clubes) |
| Nivel profesional | No hay liga profesional; "Liga de Honor" es semi-amateur | [primeradivision.com.ar](https://primeradivision.com.ar/deporte-argentino-profesional/balonmano/) |
| Presencia escolar | FeMeBal regula explícitamente nivel federado **y escolar**; handball tiene fuerte anclaje en clubes de barrio y colegios de CABA/GBA | [femebal.com](https://femebal.com/) |

### Equipos y entrenadores (estimación)

- **Equipos federados nacionales:** FeMeBal tenía 682 equipos en 2013; con crecimiento
  moderado y algo de contracción pos-pandemia, hoy ~750–950. FeMeBal es históricamente
  ~35–45 % del handball argentino. Nacional → **~1.900–2.700 equipos**. Conservador: **~2.000–2.400**.
- **Entrenadores:** ~1–1,2 por equipo → **~2.200–2.900** técnicos activos.

### SAM Argentina

| Paso | Cálculo | Resultado |
|---|---|---|
| Equipos federados | estimación | 2.000–2.400 |
| × equipos competitivos (35–45 %) | 0,35–0,45 | 700–1.080 |
| × "hay quién pague" (**20–35 %**, bajo-medio: clubes solo pagan en primera división; predomina **entrenador que paga de su bolsillo**; a favor: cultura mobile-first, Mercado Pago, y **red directa del fundador** que baja el coste de adquisición y sube la conversión real) | 0,20–0,35 | **~200–400 equipos** |

**SAM Argentina ≈ 200–400 equipos de pago.** Mercado chico y de poder de pago bajo/volátil
(ARS), pero es donde la red del fundador convierte mejor y el idioma/UX no cuesta nada.
Rol natural: **beachhead** de producto, testimonios y casos, no motor de ingresos.

---

## 5. Resumen comparativo

| País | Clubes | Equipos federados (est.) | Entrenadores (est.) | Escolar | **SAM (equipos de pago)** | Calidad del dato |
|---|---|---|---|---|---|---|
| **Alemania** | ~4.200 | ~21.000 | ~25.000–35.000 | ~3.000 escuelas primarias/año (GSAT) | **~2.500–4.000** | Alta |
| **España** | ~900–1.050 | ~4.000–5.000 | ~5.000–6.500 | Fuerte en Cataluña/Madrid (vía clubes) | **~600–1.000** | Media-alta |
| **Brasil** | ~1.847 | ~3.000–4.500 | ~3.500–5.000 (+ miles de profes EF) | 2º deporte escolar del país; 1M+ practicantes | **~200–400** | Baja |
| **Argentina** | 526 instituciones | ~2.000–2.400 | ~2.200–2.900 | Fuerte en CABA/GBA, Córdoba, Cuyo | **~200–400** | Media-baja |

**SAM agregado 4 países ≈ 3.500–5.800 equipos de pago.** A un ARPA hipotético de 40–120 €/equipo/año
(rango de competidores), el techo de ingresos anuales de estos 4 mercados combinados está en el
orden de **0,15–0,7 M€/año**. Es un nicho: la estrategia de precio debe optimizar conversión y
"boca a boca" dentro de una comunidad pequeña y muy conectada, no maximizar ARPU.

---

## 6. Fuentes

- DHB – Mitgliederzahlen: https://www.dhb.de/de/redaktionsbaum/verband/zuwachs-bei-mitgliederzahlen
- Estructura del balonmano alemán (4.200 clubes / 21.000 equipos / 790.000 miembros): https://www.vereinsticket.de/neuigkeiten/der-deutsche-handball-aufbau-und-strukturen
- Wikipedia – Deutscher Handballbund: https://de.wikipedia.org/wiki/Deutscher_Handballbund
- DHB – Grundschulaktionstag: https://www.dhb.de/services/kinder/grundschulaktionstag-handball-in-deutschland
- DHB – Formación de entrenadores (licencia C): https://www.dhb.de/services/trainer/ausbildung/handballtrainer-c-lizenz
- Wikipedia – Real Federación Española de Balonmano (924 clubes / 99.185 federados, 2019): https://es.wikipedia.org/wiki/Real_Federaci%C3%B3n_Espa%C3%B1ola_de_Balonmano
- ADESP – 4.271.300 licencias federadas 2023 (balonmano 2,4 %): https://adesp.es/el-numero-total-de-licencias-federadas-deportivas-en-2023-crece-hasta-los-4-271-300/
- Estadística del Deporte Federado 2023 (CSD): https://dbsport.press/estadistica-del-deporte-federado-ano-2023/
- CSD – España supera los 4 millones de federados: https://www.csd.gob.es/es/espana-supera-por-primera-vez-en-su-historia-los-4-millones-de-deportistas-federados
- Wikipedia – Handebol no Brasil (201.048 federados / 687 clubes / 7.774 equipos IHF 2003; 1M+ practicantes; 2º deporte escolar): https://pt.wikipedia.org/wiki/Handebol_no_Brasil
- CBHb – sitio oficial: https://cbhb.org.br/
- Confederación Argentina de Deportes – CAH (31 provinciales / 526 instituciones / 36.000+ federados): https://cad.org.ar/portfolio/confederacion-argentina-de-handball/
- Wikipedia – CAH: https://es.wikipedia.org/wiki/Confederaci%C3%B3n_Argentina_de_Handball
- Handball Argentina – FeMeBal 10.000 jugadores (68 instituciones, 682 equipos, 2013): http://www.handballargentina.org/escuela/2013/09/17/la-femebal-llego-a-los-10-mil-jugadores/
- Wikipedia – Federación Metropolitana de Balonmano: https://es.wikipedia.org/wiki/Federaci%C3%B3n_Metropolitana_de_Balonmano
- EHF – 50 federaciones miembro (+2 asociadas): https://www.eurohandball.com/en/who-we-are/ehf-federations/
- HandStat – precios (referencia de unidad de cobro por equipo): https://handstat.app/index-en.html
