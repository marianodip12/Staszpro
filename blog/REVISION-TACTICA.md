# Revisión de corrección conceptual — Blog StatzPro

Revisa el agente **entrenador-handball** (criterio deportivo). No se editan los artículos; solo se reporta.

Convención: **[MAL]** = imprecisión que conviene corregir · **[MATIZAR]** = no está mal pero falta contexto o puede inducir a error.

Reglas oficiales usadas como referencia (IHF, edición vigente): partido adulto 2 x 30 min con 10 min de descanso; cancha 40 x 20 m; portería 3 x 2 m; línea de área a 6 m; línea de golpe franco (discontinua) a 9 m; línea de penal a 7 m; exclusión de 2 minutos (la cumple el equipo aunque reciba gol). Fuentes: [IHF – Rules of the Game, Indoor Handball](https://www.ihf.info/sites/default/files/2025-02/09A%20-%20Rules%20of%20the%20Game_Indoor%20Handball_E.pdf) · [Olympics.com – Handball rules](https://www.olympics.com/en/news/handball-game-rules-regulations-how-to-play).

---

## 1. `como-llevar-estadisticas-de-un-partido-de-handball.md` (publicado)

### 1.1 [MAL] Taxonomía de zonas mezclada y redundante

> "**zona de la cancha** desde donde salió (extremo, lateral, central, 6 metros, 9 metros)"

Mezcla dos ejes distintos: puestos (extremo, lateral, central) y líneas de distancia (6 m, 9 m), que se solapan. Un tiro de lateral es casi siempre "desde 9 metros"; un tiro de "6 metros" es el del pivote. El lector que arma su planilla no sabe dónde clasificar un tiro de lateral: ¿"lateral" o "9 metros"?

**Corrección:** nombrar las zonas por puesto y añadir el penal aparte: **extremo izq./der., lateral izq./der., central, pivote (6 m), 7 metros**. "9 metros" queda como sinónimo coloquial de "primera línea", no como categoría de la grilla. Alinear con `GLOSARIO.md` (sección Zonas).

### 1.2 [MAL] "Palo" tratado como resultado excluyente del tiro

> "**resultado** (gol, atajada, error/afuera, palo)"
> "un símbolo para el resultado (por ejemplo: círculo = gol, X = atajada, guion = afuera, P = palo)"

El palo no es un resultado cerrado: un balón al palo puede entrar (gol), salir (afuera) o volver al campo (rebote). Registrarlo como cuarta opción excluyente rompe la suma goles + no-goles y complica el cálculo de eficacia.

**Corrección:** resultados excluyentes = **gol / atajada / afuera (incluye palo que sale) / bloqueado**. "Al palo" puede anotarse como marca secundaria opcional, no como resultado principal.

### 1.3 [MAL] Falta "bloqueado" como categoría de resultado

En toda la guía el tiro tiene tres destinos (gol, atajada, afuera) y nunca aparece el **tiro bloqueado por un defensor**, que es frecuente desde primera línea. Importa para la métrica: si los bloqueos se cuentan como "lanzamiento" sin más, hunden artificialmente la eficacia del lateral y esconden un problema que no es de puntería sino de lectura del bloqueo o de la altura del salto.

**Corrección:** añadir "bloqueado" a los resultados y, en la sección de métricas, recomendar mirar la eficacia de lanzamiento con y sin tiros bloqueados.

### 1.4 [MATIZAR] Comparar eficacia entre zonas sin volumen ni calidad de tiro

> "Si tu eficacia de 9 metros es baja y la de extremo es alta, el plan de juego tiene que buscar más el extremo."

La eficacia de extremo suele ser alta pero con **poco volumen** y muy dependiente del ángulo y del uno-contra-uno con el arquero; la de 9 m es más baja pero sostiene el juego posicional y genera penales y exclusiones. "Buscar más el extremo" a partir de dos porcentajes, sin mirar cuántos tiros son ni cómo se generan, puede llevar a forzar un tiro de peor calidad.

**Matiz:** leer siempre eficacia **junto con volumen de tiro** y con el origen de la ocasión (tiro cómodo vs. forzado). Un 80 % con 3 tiros no es una conclusión.

### 1.5 [MATIZAR] Mapa del arquero por cuadrante con muestra de un partido

> "Atajadas / tiros recibidos, **abierto por cuadrante del arco**. Casi todos los arqueros tienen un lado flojo."

En un partido un arquero recibe del orden de 40-55 tiros; repartidos en 6-9 cuadrantes quedan 4-8 por casilla. Sacar "lado flojo" de eso es ruido. El artículo sí menciona el criterio de 4-6 partidos en la FAQ, pero no lo aplica a la lectura del arquero, que es donde más engaña.

**Matiz:** advertir que el mapa del arquero por cuadrante necesita acumular varios partidos; en un partido solo sirve para ajustes gruesos (mitad alta / mitad baja).

### 1.6 [MATIZAR] "+/- ... a lo largo de la temporada ordena bastante bien quién sostiene al equipo"

> "Es ruidoso en un partido, pero a lo largo de la temporada ordena bastante bien quién sostiene al equipo."

El +/- en handball está muy condicionado por el rol (los especialistas de inferioridad o el arquero-jugador arrastran saldo), por los compañeros de quinteto y por contra quién juega cada tramo. "Ordena bastante bien" es optimista.

**Matiz:** presentarlo como indicador de contexto, no de jerarquía. Complementar con on/off, minutos jugados y con qué quinteto.

### 1.7 [MATIZAR] Motivos de pérdida poco homogéneos

> "**Pérdida** — con un motivo grueso: pase, recepción, pasos, ataque, invasión de área."

"Ataque" como motivo es ambiguo: mezcla falta en ataque (carga), ataque pasivo y mala decisión. Conviene separar al menos **falta en ataque (carga)** de **ataque pasivo** porque se corrigen de forma distinta.

**Matiz:** lista sugerida: pase / recepción / pasos-dobles / falta en ataque (carga) / invasión de área / ataque pasivo / robo del rival en 1c1.

### 1.8 [MATIZAR] Cuadrante del arco "arriba/abajo"

> "a qué parte del arco fue el tiro (arriba/abajo, izquierda/centro/derecha)"

Deja fuera la franja central de altura, que es donde el arquero ataja con piernas y donde se ven muchos goles "por abajo entre las piernas" mal clasificados. El estándar es una grilla de 3 x 3.

**Matiz:** ofrecer la grilla de 9 zonas (alto/medio/bajo x izq./centro/der.) como versión recomendada, y la de 6 como versión mínima.

### 1.9 [MATIZAR] No menciona el juego 7x6 / arquero-jugador

En handball actual (incluido nivel amateur alto) el ataque con **arquero-jugador** (7 contra 6) es habitual y distorsiona dos métricas que el artículo trata como limpias: eficacia (tiros a portería vacía del rival) y pérdidas (pérdida con portería propia desguarnecida = casi gol en contra). No hace falta un apartado, pero sí una línea.

**Matiz:** añadir que las pérdidas y los goles en juego 7x6 conviene marcarlos aparte porque pesan más que una posesión normal.

### Lo que está BIEN y no hay que tocar

- No llama "tarjeta roja" a la exclusión de 2 minutos: usa "exclusión (2 minutos)" de forma correcta.
- No afirma duraciones ni medidas de cancha, así que no hay errores de reglamento.
- El principio "registrá lo que cambia una decisión" y el flujo en vivo / entretiempo / post-partido / semana es sólido y realista para un club amateur.
- La distinción pérdidas forzadas vs. por decisión es correcta y útil.
- "Mirar solo el total del equipo esconde un extremo al 80 % y un lateral al 35 %" es un buen aviso sobre agregación.

---

## 2. Otros artículos en `blog/src/content/posts/`

A la fecha de esta revisión **solo existe** `como-llevar-estadisticas-de-un-partido-de-handball.md`. No hay más `.md` en esa carpeta.

**Pendiente de revisar cuando se publiquen (mismo criterio):**

- `posiciones-en-balonmano` — vigilar: central vs. armador vs. "armador central" según país; no llamar "base" al central (préstamo del básquet); lateral = "armador lateral" en LatAm, no "ala"; extremo ≠ "puntero" solo en algunos países; pivote juega sobre 6 m, no "en el círculo" (no hay círculo).
- `reglas-del-balonmano` — verificar contra IHF: 2 x 30 min adultos (2 x 25 juvenil, 2 x 20 infantil); cancha 40 x 20 m; portería 3 x 2 m; 6 m área, 9 m golpe franco (discontinua), 7 m penal; exclusión de 2 min que el equipo cumple completa aunque reciba gol; tercera exclusión al mismo jugador = descalificación; regla del juego pasivo y aviso de mano alzada; máximo 3 pasos y 3 segundos con el balón.
- `metricas-para-evaluar-un-arquero-de-handball` — vigilar: % de paradas se calcula sobre tiros **a portería** (no sobre todos los lanzamientos, que incluyen afuera y bloqueados); abrir por cuadrante y por zona de origen del tiro (no es lo mismo parar a un extremo que a un lateral); paradas en penal y en contraataque como métricas separadas; el % de paradas depende mucho de la defensa de campo, no atribuirlo entero al arquero; muestra mínima 4-6 partidos para el mapa por cuadrante.

---

## 3. Guía para futuros artículos divulgativos de handball

### Terminología — qué SÍ y qué NO

- **SÍ** fijar el registro LatAm/Argentina del blog (arquero, tiro, cancha, afuera) y dar la equivalencia de España entre paréntesis la primera vez: "armador central (central)". **NO** alternar "portero/arquero" o "balonmano/handball" dentro del mismo artículo sin criterio.
- **NO** llamar "tarjeta roja" ni "expulsión" a la exclusión de 2 minutos. La roja es la **descalificación**; la exclusión es temporal y la cumple el equipo aunque reciba gol.
- **NO** llamar "armador" o "base" al central sin más: en Argentina el organizador es el **armador central**; "armador" a secas suele ser el lateral. "Base" es préstamo del básquet, evitarlo.
- **NO** decir que el pivote juega "en el círculo": no hay círculo, juega sobre la **línea de 6 m**, entre los defensores.
- **NO** tratar "9 metros" y "lateral/central" como categorías paralelas de zona. Zonas por puesto: extremo, lateral, central, pivote, más 7 m.
- **SÍ** decir "línea de golpe franco" para la de 9 m y recordar que es **discontinua**; "penal" o "7 metros" para el tiro directo. **NO** confundir golpe franco (con barrera, desde 9 m) con penal.
- **NO** afirmar medidas ni duraciones de memoria: verificar contra IHF (2 x 30 adultos, 40 x 20 m, portería 3 x 2 m). Aclarar que en juvenil/infantil los tiempos son menores.
- **SÍ** distinguir contraataque (ventaja directa tras recuperar) de **contragol / segunda oleada** (la defensa a medio formar); son fases distintas con lecturas distintas.
- **NO** usar "superioridad" e "inferioridad" como sinónimos de "ir ganando/perdiendo": se refieren a jugar con más o menos jugadores por exclusión.
- **SÍ** nombrar los sistemas con dos puntos y de atrás hacia adelante: 6:0, 5:1, 3:2:1, 4:2. **NO** escribir "6-0" mezclado con resultados.

### Uso de datos y métricas — qué SÍ y qué NO

- **SÍ** acompañar todo porcentaje con su **volumen** (goles/tiros, no solo el %). Un 75 % con 4 tiros no es una conclusión.
- **NO** sacar conclusiones de perfil de jugador o de rival con un solo partido. Mapa del arquero por cuadrante y patrones de un jugador: **4-6 partidos** mínimo.
- **SÍ** separar tiros **bloqueados** y tiros **a portería vacía** (juego 7x6) antes de calcular eficacia o % de paradas.
- **NO** presentar el +/- como ranking de "quién es mejor": es ruidoso y depende del rol y del quinteto. Usarlo como contexto.
- **SÍ** ajustar el ataque por **ritmo/posesiones** cuando se comparan partidos o equipos; 30 goles a ritmo alto no es lo mismo que a ritmo bajo.

### Qué métricas priorizar por rol

- **Equipo:** eficacia ofensiva (goles/posesión), ritmo, pérdidas por tipo (forzadas/no forzadas), balance en superioridad e inferioridad, eficacia de lanzamiento por zona.
- **Jugador de primera línea (central / lateral):** eficacia de lanzamiento por zona y con/sin bloqueos, asistencias, pérdidas por decisión, penales y exclusiones provocadas, +/- con contexto.
- **Extremo:** eficacia por lado y por ángulo, volumen de tiro en contraataque vs. posicional, eficacia en 7 m si los lanza, balones perdidos en recepción de banda.
- **Pivote:** goles y eficacia desde 6 m, faltas y exclusiones provocadas, penales ganados, balones perdidos de espaldas, bloqueos indirectos que liberan tiro (cualitativo).
- **Arquero:** % de paradas sobre tiros a portería, abierto por cuadrante y por zona de origen; paradas en penal y en contraataque por separado; asistencias de contraataque; leer el dato junto al sistema defensivo de campo.
