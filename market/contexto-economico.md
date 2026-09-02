# Contexto económico — impacto en la decisión de precios

**Foco:** Argentina, Brasil, Alemania, España
**Fecha:** 2026-09-02
**Autor:** agente `analista-mercado` (StatzPro)

> Lo que este documento intenta responder: ¿cuánto puede/quiere pagar realmente un
> entrenador de balonmano amateur en cada país, en qué moneda, por qué medio, y con
> qué riesgo cambiario para StatzPro?

---

## 1. Poder adquisitivo del comprador real (entrenador amateur / club)

### 🇩🇪 Alemania — poder de pago ALTO, estable

- Renta disponible de los hogares **~25 % por encima de la media UE**; Alemania está entre
  los 3 primeros países OCDE en renta disponible per cápita
  ([OCDE / Euronews](https://www.euronews.com/business/2024/08/12/good-news-for-europes-top-economies-as-disposable-income-rises)).
- El entrenador amateur típico es voluntario o cobra vía **Übungsleiterpauschale**: hasta
  **3.000 €/año libres de impuestos** (3.300 € desde 2026), ~250 €/mes
  ([verbandsbuero.de](https://www.verbandsbuero.de/uebungsleiter-ehrenamtspauschale-2025/)).
  No vive de esto, pero un gasto de 5–15 €/mes en una herramienta es irrelevante para su bolsillo.
- **Clave:** el gasto normalmente lo asume el *Verein*, no el individuo → la restricción no
  es "poder de pago" sino "proceso de aprobación del club".
- **Sensibilidad al precio:** baja en valor absoluto; media en "relación calidad/precio"
  (el alemán compara features y soporte con precisión).

### 🇪🇸 España — poder de pago MEDIO, estable

- Renta disponible per cápita claramente por debajo de Alemania pero en zona euro estable;
  España tuvo de las mayores subidas de renta real de hogares de la OCDE en 2024 (+2,2 % en un trimestre)
  ([OCDE / Euronews](https://www.euronews.com/business/2024/08/12/good-news-for-europes-top-economies-as-disposable-income-rises)).
- Entrenador de deporte base: desde **voluntario (0 €)** hasta **60–500 €/mes** según categoría
  (referencia de fútbol base, extrapolable a balonmano — [rutamister.com](https://rutamister.com/blog/cuanto-cobra-entrenador-futbol-base)).
  Un entrenador o instructor deportivo por cuenta ajena empieza en **~750–1.300 €/mes brutos**.
- Un gasto personal de **5–10 €/mes** es asumible para un entrenador motivado; **15–20 €/mes**
  ya necesita que lo cubra el club o que el entrenador lo viva como inversión profesional.
- **Sensibilidad al precio:** media. El free tier y el precio "de entrenador" importan.

### 🇧🇷 Brasil — poder de pago BAJO, moneda volátil

- **Salario mínimo 2025: R$ 1.518/mes** ([Agência Gov](https://agenciagov.ebc.com.br/noticias/202510/ibge-salario-minimo-puxa-aumento-geral-da-renda-no-mercado-de-trabalho)).
  El salario mínimo "rige la renta media en el 81 % de los municipios" y es lo que gana ~1/3 de los ocupados.
- **Renta domiciliaria per cápita 2025: R$ 2.316/mes** ([Agência Brasil / IBGE](https://agenciabrasil.ebc.com.br/economia/noticia/2026-02/renda-domiciliar-capita-chega-r-2316-em-2025-diz-ibge)).
  Rendimiento medio de todas las fuentes: **R$ 3.367/mes** ([IBGE](https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-de-noticias/noticias/46579-rendimento-medio-da-populacao-brasileira-atinge-r-3-367-em-2025)).
- Profesor de Educação Física (el comprador típico en handball escolar): **~R$ 2.700–4.300/mes**
  ([salario.com.br](https://www.salario.com.br/profissao/professor-de-educacao-fisica-do-ensino-fundamental-cbo-231315/)).
- WTP realista para software deportivo personal: **R$ 10–30/mes** (≈ 2–6 USD). Cualquier
  precio fijado en euros se percibe caro y además fluctúa con el cambio.
- **Sensibilidad al precio:** muy alta. Freemium + precio local bajo en BRL es obligatorio.

### 🇦🇷 Argentina — poder de pago BAJO-MEDIO, moneda muy volátil (mejorando)

- Salario promedio sector privado registrado: **~$1.390.000–1.480.000/mes** (marzo–octubre 2025),
  ≈ **USD 1.100–1.300** al cambio oficial/MEP
  ([Infobae](https://www.infobae.com/economia/2025/07/14/el-salario-promedio-del-sector-privado-formal-llego-a-1390000-en-marzo-el-ranking-de-valores-por-provincia/)).
- Muchos entrenadores de club **no cobran o cobran un viático simbólico**; los que cobran,
  poco. El club rara vez financia software.
- WTP realista personal: **USD 3–8/mes** equivalente en ARS, y muy sensible a que el precio
  ARS no se dispare mes a mes por la indexación.
- **Sensibilidad al precio:** alta, y agravada por el reflejo cultural de "esto en dólares se
  va a poner impagable". A favor: 2025 fue el año de menor inflación en 8 años (ver abajo),
  lo que empieza a devolver algo de previsibilidad.

---

## 2. Inflación y riesgo cambiario (afecta a cómo fijar y mantener el precio)

### Argentina — ARS

| Indicador | Valor | Fuente |
|---|---|---|
| Inflación interanual jul-2024 | **263,4 %** | [Infobae / INDEC](https://www.infobae.com/economia/2025/07/14/...) (citado vía búsqueda) |
| Inflación interanual jun-2025 | **39,4 %** | íd. |
| Inflación acumulada 2025 (cierre) | **~31,5 %** (la más baja en 8 años); proyección FMI 35,9 % | [iProfesional](https://www.iprofesional.com/economia/419097-inflacion-indec-2025-argentina-evolucion-mes-a-mes) |
| IPC mensual (mediados 2026) | **~2 %** | [finarg.net](https://finarg.net/indices/inflacion) |

**Implicación para precios:** todavía NO se puede fijar un precio ARS "y olvidarse". Opciones:
(a) precio ancla en USD y débito mensual en ARS al cambio del día (Mercado Pago lo permite),
(b) revisar el precio ARS cada trimestre. La tendencia 2025–2026 es de desaceleración, así que
el riesgo baja, pero sigue siendo el país de mayor riesgo cambiario de los cuatro.

### Brasil — BRL

| Indicador | Valor | Fuente |
|---|---|---|
| IPCA 2024 | **4,83 %** (por encima del techo de 4,5 %) | [InfoMoney](https://www.infomoney.com.br/economia/ipca-o-que-o-estouro-da-meta-da-inflacao-em-2024-significa-para-2025/) |
| Devaluación del real vs USD en 2024 | **−27,4 %** | íd. |
| IPCA 2025 | **~4,3 %**; repuntes puntuales hasta ~5,4 % interanual | [Meu Bolso em Dia](https://meubolsoemdia.com.br/Materias/inflacao-2025) |
| Selic fin 2024 → 2025 | 12,25 % → ~14,25 % | [InfoMoney](https://www.infomoney.com.br/economia/ipca-o-que-o-estouro-da-meta-da-inflacao-em-2024-significa-para-2025/) |

**Implicación:** la inflación interna brasileña es manejable (un ajuste de precio anual basta),
pero el **tipo de cambio BRL/EUR es inestable** (−27 % en un año). Si el precio se fija en euros,
el usuario brasileño sufre saltos bruscos. → **fijar precio nativo en BRL** y cobrar por **Pix**.

### Alemania y España — EUR

- Zona euro: inflación ya normalizada (~2–3 % anual). Sin riesgo cambiario para StatzPro si
  factura en euros. Precio estable multi-anual, ajuste opcional por IPC. **Es el ancla natural
  de la lista de precios**; los demás países se derivan de aquí con paridad de poder adquisitivo.

---

## 3. Medios de pago habituales

| País | Medio dominante para una suscripción SaaS de bajo ticket | Notas |
|---|---|---|
| **Alemania** | Tarjeta, **SEPA-Lastschrift** (domiciliación), PayPal | SEPA es clave para B2B/club: la factura anual con adeudo SEPA es lo esperado. PayPal muy extendido en consumo. |
| **España** | **Tarjeta** (crédito/débito), Bizum en consumo P2P, SEPA para clubes | Tarjeta cubre casi todo el caso "entrenador". Sin fricción. |
| **Brasil** | **Pix** (instantáneo, gratis, camino a ~50 % del e-commerce en 2026), tarjeta con *parcelamento* | [PCMI](https://paymentscmi.com/insights/metodos-de-pago-en-america-latina-brasil-mexico-colombia-argentina-chile-peru/). Pix recurrente ("Pix Automático") ya existe. Tarjeta internacional tiene IOF y baja penetración en el perfil profe de EF. |
| **Argentina** | **Mercado Pago** (billetera + tarjetas + efectivo Rapipago/PagoFácil), débito | [Mercado Pago Suscripciones](https://www.mercadopago.com.ar/herramientas-para-vender/suscripciones) soporta cobro recurrente mensual/anual con tarjeta, débito y saldo. 150 M+ usuarios en la región ([Cronista](https://www.cronista.com/infotechnology/finanzas-digitales/adios-a-las-tarjetas-de-credito-las-5-tendencias-que-cambiaran-para-siempre-la-forma-de-pagar-en-2026/)). Comisión ~6,29 % + IVA por cobro con tarjeta de crédito inmediato. |

**Implicación operativa:** Stripe/tarjeta resuelve DE + ES. Para AR y BR, tarjeta sola deja
fuera a una parte grande del mercado objetivo → hay que integrar **Mercado Pago (AR)** y
**Pix (BR)** o se pierde conversión. Las comisiones locales (MP ~6 % + IVA) comen margen en
tickets bajos: cobrar **anual** en LatAm mejora unit economics y reduce exposición cambiaria.

---

## 4. ¿Los clubes suelen bancar herramientas?

| País | ¿El club paga software para sus equipos? | Comentario |
|---|---|---|
| **Alemania** | **Sí, con frecuencia** | Estructura de *Verein* con presupuesto de sección; cultura de dotar de medios a los equipos. Es la vía de venta preferente. |
| **España** | **A veces** | Clubes de cantera medianos sí; ligas bajas y formativo, no — paga el entrenador. ~50/50. |
| **Brasil** | **Rara vez** | Dependencia de *prefeitura*/patrocinio/*lei de incentivo*. Presupuesto de software casi inexistente salvo ligas estaduales o universidades. |
| **Argentina** | **Casi nunca** (salvo primera división) | Balonmano suele ser sección deficitaria del club de barrio. Paga el entrenador. |

---

## 5. Conclusiones para `analista-precios`

1. **Lista de precios anclada en EUR** (mercado DE/ES), con **precios nativos derivados por PPA**
   en BRL y ARS — no una simple conversión FX.
2. **Dos ejes de producto:** "plan entrenador" (mensual bajo, personal) y "plan club/multi-equipo"
   (anual, factura, SEPA) — el mix cambia por país (DE→club, AR/BR→entrenador, ES→ambos).
3. **Bandas de WTP mensual personal (orden de magnitud, conservador):**
   - Alemania: 8–20 € (y sin problema si lo paga el club: 15–40 €/equipo).
   - España: 5–12 € personal / 10–25 €/equipo si paga el club.
   - Brasil: R$ 10–30 (≈ 2–6 €) — freemium obligatorio.
   - Argentina: equiv. 3–8 USD/mes en ARS — freemium obligatorio, revisión trimestral del precio ARS.
4. **Cobro:** Stripe/tarjeta+SEPA para EU; **Mercado Pago** para AR; **Pix** para BR. Preferir
   **facturación anual en LatAm** (margen + cobertura cambiaria).
5. **Riesgo cambiario:** alto en AR, medio-alto en BR (FX), nulo en EU. No exponer al usuario
   LatAm a saltos de precio en euros.

---

## 6. Fuentes

- OCDE / Euronews – renta disponible de los hogares (Alemania +25 % vs UE; España al alza): https://www.euronews.com/business/2024/08/12/good-news-for-europes-top-economies-as-disposable-income-rises
- Übungsleiter-/Ehrenamtspauschale 2025: https://www.verbandsbuero.de/uebungsleiter-ehrenamtspauschale-2025/
- Rutamister – cuánto cobra un entrenador de fútbol base en España: https://rutamister.com/blog/cuanto-cobra-entrenador-futbol-base
- IBGE – salário mínimo R$ 1.518 / renda: https://agenciagov.ebc.com.br/noticias/202510/ibge-salario-minimo-puxa-aumento-geral-da-renda-no-mercado-de-trabalho
- Agência Brasil / IBGE – renda domiciliar per capita R$ 2.316 (2025): https://agenciabrasil.ebc.com.br/economia/noticia/2026-02/renda-domiciliar-capita-chega-r-2316-em-2025-diz-ibge
- IBGE – rendimento médio R$ 3.367 (2025): https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-de-noticias/noticias/46579-rendimento-medio-da-populacao-brasileira-atinge-r-3-367-em-2025
- Salário Brasil – Professor de Educação Física: https://www.salario.com.br/profissao/professor-de-educacao-fisica-do-ensino-fundamental-cbo-231315/
- iProfesional – inflación Argentina 2025 mes a mes (~31,5 % acumulado): https://www.iprofesional.com/economia/419097-inflacion-indec-2025-argentina-evolucion-mes-a-mes
- finarg.net – IPC Argentina mensual: https://finarg.net/indices/inflacion
- Infobae – salario promedio sector privado registrado Argentina: https://www.infobae.com/economia/2025/07/14/el-salario-promedio-del-sector-privado-formal-llego-a-1390000-en-marzo-el-ranking-de-valores-por-provincia/
- InfoMoney – IPCA 2024 4,83 % y devaluación del real −27,4 %: https://www.infomoney.com.br/economia/ipca-o-que-o-estouro-da-meta-da-inflacao-em-2024-significa-para-2025/
- Meu Bolso em Dia – IPCA 2025: https://meubolsoemdia.com.br/Materias/inflacao-2025
- PCMI – métodos de pago en América Latina (Pix, Mercado Pago): https://paymentscmi.com/insights/metodos-de-pago-en-america-latina-brasil-mexico-colombia-argentina-chile-peru/
- Mercado Pago – suscripciones (cobro recurrente): https://www.mercadopago.com.ar/herramientas-para-vender/suscripciones
- El Cronista – tendencias de pago 2026 / Mercado Pago 150 M usuarios: https://www.cronista.com/infotechnology/finanzas-digitales/adios-a-las-tarjetas-de-credito-las-5-tendencias-que-cambiaran-para-siempre-la-forma-de-pagar-en-2026/
