import { useMemo, useState } from 'react';
import type { HandballEvent, HandballTeam } from '@/domain/types';
import {
  perFormation,
  hasFormationData,
  getFormationTimelines,
  type LineupMode,
  type FormationTimeline,
} from '@/domain/formations';
import { usePlan, hasFormationAnalysis } from '@/lib/use-plan';
import { cn } from '@/lib/cn';

/**
 * 📊 Panel de análisis por formación — v3.
 *
 * Cambios respecto de v2:
 *   - Sin columna "Uso" en la tabla (el uso se ve implícito por orden y por el detalle).
 *   - Filas clickeables: expanden un panel inline debajo con:
 *       • Línea temporal 0-60' mostrando cuándo estuvo activa esa formación.
 *       • Gráfico de score (mi equipo vs rival) durante los tramos activos.
 *   - Sigue el toggle Solo campo / Campo + arquero.
 *
 * En mobile la tabla es scrolleable horizontal (14 columnas); el detalle
 * expandido ocupa el ancho de la fila, con SVGs responsive.
 */
export const FormationAnalysisPanel = ({
  events,
  myTeam,
}: {
  events: HandballEvent[];
  myTeam: HandballTeam | null;
}) => {
  const plan = usePlan();
  const [mode, setMode] = useState<LineupMode>('field');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const has = useMemo(() => hasFormationData(events), [events]);
  const stats = useMemo(() => perFormation(events, mode), [events, mode]);
  const timelines = useMemo(() => getFormationTimelines(events, mode), [events, mode]);

  const nameOf = (num: number) =>
    myTeam?.players.find((p) => p.number === num)?.name ?? `#${num}`;

  const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);

  const toggle = (key: string) =>
    setExpandedKey((prev) => (prev === key ? null : key));

  // Gate por plan: requiere Pro+ (o superior, o beta activa)
  if (!hasFormationAnalysis(plan)) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-fg">📊 Análisis por formación</span>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#7C3AED]/15 text-[#7C3AED] uppercase tracking-wider">Pro +</span>
        </div>
        <p className="text-[11px] text-muted-fg leading-relaxed">
          Ve qué formaciones rindieron mejor: goles a favor y en contra, eficacia ofensiva y defensiva por lineup, y evolución del marcador durante cada tramo. Requiere plan <strong className="text-fg">Pro +</strong> o superior.
        </p>
        <a href="/app/plan" className="inline-block text-[11px] font-medium text-primary hover:underline">Ver planes →</a>
      </section>
    );
  }

  if (!has) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4">
        <h3 className="text-xs font-medium text-fg mb-1.5">📊 Análisis por formación</h3>
        <p className="text-[11px] text-muted-fg leading-relaxed">
          Este partido no tiene datos de formación. Para verlos, durante el partido en vivo
          abrí "🧩 Formación en cancha" y marcá quiénes están jugando. A partir de ahí, cada
          gol queda asociado a la formación que tenías en cancha.
        </p>
      </section>
    );
  }

  // Rango temporal total del partido para el eje X de los mini-gráficos
  const matchLastMin = Math.max(60, ...events.map((e) => e.min));

  return (
    <section className="rounded-lg border border-border bg-surface p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-medium text-fg">📊 Análisis por formación</h3>
        <div className="flex rounded-md border border-border overflow-hidden text-[10px]">
          <button
            type="button"
            onClick={() => { setMode('field'); setExpandedKey(null); }}
            className={cn('px-2.5 py-1 transition-colors', mode === 'field' ? 'bg-primary/15 text-primary' : 'text-muted-fg hover:text-fg')}
          >
            Solo campo (6)
          </button>
          <button
            type="button"
            onClick={() => { setMode('fieldGk'); setExpandedKey(null); }}
            className={cn('px-2.5 py-1 transition-colors border-l border-border', mode === 'fieldGk' ? 'bg-primary/15 text-primary' : 'text-muted-fg hover:text-fg')}
          >
            Campo + arquero
          </button>
        </div>
      </div>

      <p className="text-[9px] text-muted-fg leading-relaxed">
        Tocá una fila para ver la evolución del marcador y cuándo se usó esa formación durante el partido.
      </p>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[11px] whitespace-nowrap">
          <thead>
            <tr className="text-muted-fg border-b border-border">
              <th className="text-left font-medium py-1.5 pr-2 sticky left-0 bg-surface">Formación</th>
              {mode === 'fieldGk' && <th className="text-center font-medium py-1.5 px-1">Arq</th>}
              {/* Ataque */}
              <th className="text-center font-medium py-1.5 px-1.5 border-l border-border/40 text-success">GF</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">Err</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">Ataj</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">Palo</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">Tiros</th>
              <th className="text-center font-medium py-1.5 px-1.5 text-success">%Ef</th>
              {/* Defensa */}
              <th className="text-center font-medium py-1.5 px-1.5 border-l border-border/40 text-danger">GC</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">AtajGK</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">ErrR</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">PaloR</th>
              <th className="text-center font-medium py-1.5 px-1 text-muted-fg">TirosR</th>
              <th className="text-center font-medium py-1.5 px-1.5 text-danger">%Ef</th>
              {/* Balance */}
              <th className="text-center font-medium py-1.5 px-1.5 border-l border-border/40 text-primary">Dif</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const isExpanded = expandedKey === s.key;
              const timeline = timelines.get(s.key);
              const colSpan = 14 + (mode === 'fieldGk' ? 1 : 0);

              return (
                <>
                  <tr
                    key={s.key}
                    className={cn(
                      'border-b border-border/50 last:border-b-0 cursor-pointer transition-colors',
                      isExpanded ? 'bg-surface-2/60' : 'hover:bg-surface-2/40',
                    )}
                    onClick={() => toggle(s.key)}
                  >
                    <td className="py-1.5 pr-2 sticky left-0 bg-surface">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-muted-fg text-[10px] transition-transform', isExpanded && 'rotate-90')}>▶</span>
                        <div className="flex flex-wrap gap-1">
                          {s.field.map((num) => (
                            <span
                              key={num}
                              className="inline-flex items-center gap-0.5 rounded bg-surface-2 px-1 py-0.5 text-[10px]"
                              title={nameOf(num)}
                            >
                              <span className="font-semibold text-success">{num}</span>
                              <span className="text-muted-fg truncate max-w-[60px]">{nameOf(num)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    {mode === 'fieldGk' && (
                      <td className="text-center px-1 text-info font-semibold">
                        {s.goalkeeper == null ? '⊘' : s.goalkeeper}
                      </td>
                    )}
                    {/* Ataque */}
                    <td className="text-center px-1.5 font-mono font-semibold text-success border-l border-border/40">{s.goalsFor}</td>
                    <td className="text-center px-1 font-mono text-muted-fg">{s.missedShots}</td>
                    <td className="text-center px-1 font-mono text-muted-fg">{s.savedShots}</td>
                    <td className="text-center px-1 font-mono text-muted-fg">{s.postedShots}</td>
                    <td className="text-center px-1 font-mono text-muted-fg">{s.shots}</td>
                    <td className="text-center px-1.5 font-mono font-semibold text-success">{pct(s.attackEfficiency)}</td>
                    {/* Defensa */}
                    <td className="text-center px-1.5 font-mono font-semibold text-danger border-l border-border/40">{s.goalsAgainst}</td>
                    <td className="text-center px-1 font-mono text-muted-fg">{s.saves}</td>
                    <td className="text-center px-1 font-mono text-muted-fg">{s.opponentMisses}</td>
                    <td className="text-center px-1 font-mono text-muted-fg">{s.opponentPosts}</td>
                    <td className="text-center px-1 font-mono text-muted-fg">{s.opponentShots}</td>
                    <td className="text-center px-1.5 font-mono font-semibold text-danger">{pct(s.defenseEfficiency)}</td>
                    {/* Balance */}
                    <td className={cn(
                      'text-center px-1.5 font-mono font-semibold border-l border-border/40',
                      s.goalDiff > 0 ? 'text-success' : s.goalDiff < 0 ? 'text-danger' : 'text-muted-fg',
                    )}>
                      {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                    </td>
                  </tr>

                  {isExpanded && timeline && (
                    <tr key={`${s.key}-detail`} className="bg-surface-2/40">
                      <td colSpan={colSpan} className="p-3">
                        <FormationDetail timeline={timeline} matchLastMin={matchLastMin} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[9px] text-muted-fg leading-relaxed space-y-0.5">
        <p>
          <strong className="text-success">Ataque:</strong> GF goles a favor · Err errados · Ataj atajados por GK rival · Palo · Tiros totales · %Ef eficacia (goles/tiros).
        </p>
        <p>
          <strong className="text-danger">Defensa:</strong> GC goles en contra · AtajGK atajadas de mi arquero · ErrR errados del rival · PaloR palos del rival · TirosR tiros totales del rival · %Ef eficacia defensiva (1 − GC/TirosR).
        </p>
      </div>
    </section>
  );
};

// ═════════════════════════════════════════════════════════════════
//   DETALLE EXPANDIBLE — línea temporal + gráfico de score
// ═════════════════════════════════════════════════════════════════

const FormationDetail = ({
  timeline,
  matchLastMin,
}: {
  timeline: FormationTimeline;
  matchLastMin: number;
}) => {
  const { segments, scorePoints, startScore, endScore } = timeline;
  const totalMinutesUsed = segments.reduce((acc, s) => acc + (s.to - s.from), 0);
  const startMin = segments[0]?.from ?? 0;
  const endMin = segments[segments.length - 1]?.to ?? matchLastMin;

  return (
    <div className="space-y-3">
      {/* Resumen chico arriba */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-fg">
        <span>
          <strong className="text-fg">{segments.length}</strong> {segments.length === 1 ? 'tramo' : 'tramos'} en el partido
        </span>
        <span>·</span>
        <span>
          <strong className="text-fg">{totalMinutesUsed}'</strong> minutos totales
        </span>
        <span>·</span>
        <span>
          <strong className="text-success">{startScore.home}-{startScore.away}</strong> al empezar → <strong className="text-primary">{endScore.home}-{endScore.away}</strong> al terminar
        </span>
      </div>

      {/* Línea temporal 0-60' con tramos highlighted */}
      <div>
        <div className="text-[10px] font-medium text-muted-fg mb-1">En qué minutos se usó</div>
        <TimelineBar segments={segments} totalMin={matchLastMin} />
      </div>

      {/* Gráfico de score durante los tramos */}
      <div>
        <div className="text-[10px] font-medium text-muted-fg mb-1">
          Evolución del marcador durante esta formación (min {startMin} → {endMin})
        </div>
        <ScoreChart
          points={scorePoints}
          startMin={startMin}
          endMin={endMin}
          startScore={startScore}
          endScore={endScore}
        />
      </div>
    </div>
  );
};

// ───────────── Línea temporal 0-60' ────────────────────────────────

const TimelineBar = ({
  segments,
  totalMin,
}: {
  segments: { from: number; to: number }[];
  totalMin: number;
}) => {
  const width = 100; // porcentaje, responsive
  const pct = (min: number) => (min / totalMin) * width;

  return (
    <div className="relative h-6 bg-surface-2 rounded overflow-hidden border border-border">
      {/* Marca de medio tiempo (30') */}
      <div
        className="absolute top-0 bottom-0 w-px bg-border"
        style={{ left: `${pct(30)}%` }}
      />
      {/* Tramos activos */}
      {segments.map((seg, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 bg-primary/60 hover:bg-primary/80 transition-colors"
          style={{
            left: `${pct(seg.from)}%`,
            width: `${pct(seg.to - seg.from) || 0.5}%`,
          }}
          title={`Min ${seg.from} → ${seg.to}`}
        />
      ))}
      {/* Marca inicio y fin */}
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[8px] text-muted-fg px-1 pointer-events-none">
        <span>0'</span>
        <span className="opacity-70">30'</span>
        <span>{totalMin}'</span>
      </div>
    </div>
  );
};

// ───────────── Gráfico de score home vs away ───────────────────────

const ScoreChart = ({
  points,
  startMin,
  endMin,
  startScore,
  endScore,
}: {
  points: { minute: number; home: number; away: number; eventType: string; isHome: boolean }[];
  startMin: number;
  endMin: number;
  startScore: { home: number; away: number };
  endScore: { home: number; away: number };
}) => {
  const W = 320;
  const H = 100;
  const P = { top: 8, right: 8, bottom: 16, left: 22 };

  const minRange = Math.max(1, endMin - startMin);
  const maxScore = Math.max(1, endScore.home, endScore.away);

  const xOf = (min: number) => P.left + ((min - startMin) / minRange) * (W - P.left - P.right);
  const yOf = (score: number) => H - P.bottom - (score / maxScore) * (H - P.top - P.bottom);

  // Preparar líneas: agrego el punto inicial en startMin con startScore
  const homePts = [
    { x: xOf(startMin), y: yOf(startScore.home) },
    ...points.map((p) => ({ x: xOf(p.minute), y: yOf(p.home) })),
    { x: xOf(endMin), y: yOf(endScore.home) },
  ];
  const awayPts = [
    { x: xOf(startMin), y: yOf(startScore.away) },
    ...points.map((p) => ({ x: xOf(p.minute), y: yOf(p.away) })),
    { x: xOf(endMin), y: yOf(endScore.away) },
  ];

  const pathOf = (pts: { x: number; y: number }[]) =>
    pts.length === 0 ? '' : `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');

  // Ticks del eje X
  const ticks: number[] = [];
  const step = minRange <= 10 ? 2 : minRange <= 30 ? 5 : 10;
  for (let m = Math.ceil(startMin / step) * step; m <= endMin; m += step) ticks.push(m);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-w-md" role="img" aria-label="Gráfico de evolución del marcador">
      {/* Ejes */}
      <line x1={P.left} y1={H - P.bottom} x2={W - P.right} y2={H - P.bottom} stroke="currentColor" className="text-border" strokeWidth="0.5" />
      <line x1={P.left} y1={P.top} x2={P.left} y2={H - P.bottom} stroke="currentColor" className="text-border" strokeWidth="0.5" />
      {/* Grid horizontal cada gol */}
      {Array.from({ length: maxScore + 1 }, (_, i) => (
        <line
          key={i}
          x1={P.left}
          y1={yOf(i)}
          x2={W - P.right}
          y2={yOf(i)}
          stroke="currentColor"
          className="text-border/40"
          strokeWidth="0.3"
          strokeDasharray="1 2"
        />
      ))}
      {/* Ticks X */}
      {ticks.map((m) => (
        <g key={m}>
          <line x1={xOf(m)} y1={H - P.bottom} x2={xOf(m)} y2={H - P.bottom + 2} stroke="currentColor" className="text-border" strokeWidth="0.5" />
          <text x={xOf(m)} y={H - 4} textAnchor="middle" fontSize="8" fill="currentColor" className="text-muted-fg">{m}'</text>
        </g>
      ))}
      {/* Ticks Y (0, mid, max) */}
      {[0, Math.floor(maxScore / 2), maxScore].map((v) => (
        <text key={v} x={P.left - 3} y={yOf(v) + 3} textAnchor="end" fontSize="8" fill="currentColor" className="text-muted-fg">{v}</text>
      ))}
      {/* Línea home (yo) — verde hardcodeado */}
      <path d={pathOf(homePts)} fill="none" stroke="#22c55e" strokeWidth="1.5" />
      {/* Línea away (rival) — rojo hardcodeado */}
      <path d={pathOf(awayPts)} fill="none" stroke="#ef4444" strokeWidth="1.5" />
      {/* Puntos de goles */}
      {points.filter((p) => p.eventType === 'goal').map((p, i) => (
        <circle
          key={i}
          cx={xOf(p.minute)}
          cy={yOf(p.isHome ? p.home : p.away)}
          r="2"
          fill={p.isHome ? '#22c55e' : '#ef4444'}
        />
      ))}
      {/* Leyenda (sin caja de fondo blanca, solo etiquetas) */}
      <g fontSize="8">
        <line x1={W - P.right - 55} y1={P.top + 4} x2={W - P.right - 46} y2={P.top + 4} stroke="#22c55e" strokeWidth="1.5" />
        <text x={W - P.right - 43} y={P.top + 6} fill="currentColor" className="text-fg">Yo</text>
        <line x1={W - P.right - 25} y1={P.top + 4} x2={W - P.right - 16} y2={P.top + 4} stroke="#ef4444" strokeWidth="1.5" />
        <text x={W - P.right - 13} y={P.top + 6} fill="currentColor" className="text-fg">Rival</text>
      </g>
    </svg>
  );
};
