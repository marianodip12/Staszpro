'use client';

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { computeSeasonAggregates, type MatchRecord } from '@sportiq/analytics';
import { seasonTimeline } from '@sportiq/core/handball';

interface TeamOption { id: string; name: string; color: string; }

interface EvolutionClientProps {
  orgSlug:    string;
  seasonName: string | null;
  records:    MatchRecord[];
  teams:      TeamOption[];
}

const RESULT_BG: Record<string, string> = {
  W: 'rgba(132,204,22,.15)',
  D: 'rgba(245,158,11,.12)',
  L: 'rgba(239,68,68,.12)',
};
const RESULT_COLOR: Record<string, string> = {
  W: 'var(--lime-400)',
  D: 'var(--amber-400)',
  L: 'var(--red-400)',
};

export function EvolutionClient({ records, seasonName, teams }: EvolutionClientProps) {
  const [myTeam, setMyTeam] = useState<TeamOption>(teams[0] ?? { id: '', name: '', color: '#3B82F6' });

  const agg = useMemo(
    () => records.length > 0 ? computeSeasonAggregates(records, myTeam.name) : null,
    [records, myTeam.name],
  );

  // Acumulated points chart
  const pointsData = useMemo(() => {
    if (!agg) return [];
    let pts = 0;
    return agg.perMatch.map((m, i) => {
      if (m.result === 'W') pts += 3;
      else if (m.result === 'D') pts += 1;
      return {
        match:       `P${i + 1}`,
        opponent:    m.opponent,
        pts,
        goalsFor:    m.goalsFor,
        goalsAgainst:m.goalsAgainst,
        diff:        m.goalsFor - m.goalsAgainst,
        result:      m.result,
        efficiency:  m.efficiency,
      };
    });
  }, [agg]);

  // Goal differential trend
  const diffData = pointsData.map((d) => ({ match: d.match, diff: d.diff, result: d.result }));

  const trend = useMemo(() => {
    if (pointsData.length < 2) return null;
    const first = pointsData[0]!.efficiency;
    const last  = pointsData[pointsData.length - 1]!.efficiency;
    return last - first;
  }, [pointsData]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
            Evolución
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {seasonName ?? 'Todos los partidos'} · {records.length} partido{records.length !== 1 ? 's' : ''}
          </p>
        </div>

        {teams.length > 1 && (
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--surface-border)' }}>
            {teams.map((t) => (
              <button key={t.id} onClick={() => setMyTeam(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm transition-all"
                      style={{
                        background: myTeam.id === t.id ? 'var(--navy-600)' : 'var(--navy-800)',
                        color:      myTeam.id === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}>
                <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!agg || records.length === 0 ? (
        <div className="card p-12 text-center">
          <p style={{ color: 'var(--text-muted)' }}>Sin partidos finalizados para mostrar evolución.</p>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger">
            <SummaryChip label="Jugados"   value={String(agg.totals.played)} />
            <SummaryChip label="Victorias" value={String(agg.totals.wins)}   color="var(--lime-400)"  />
            <SummaryChip label="Empates"   value={String(agg.totals.draws)}  color="var(--amber-400)" />
            <SummaryChip label="Derrotas"  value={String(agg.totals.losses)} color="var(--red-400)"   />
            <SummaryChip
              label="Tendencia efect."
              value={trend === null ? '—' : `${trend > 0 ? '+' : ''}${trend}%`}
              color={trend === null ? undefined : trend > 0 ? 'var(--lime-400)' : trend < 0 ? 'var(--red-400)' : 'var(--text-muted)'}
              icon={trend === null ? undefined : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus}
            />
          </div>

          {/* Points accumulation */}
          <div className="card p-4">
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>
              PUNTOS ACUMULADOS · {agg.totals.points} pts totales
            </p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pointsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
                  <XAxis dataKey="match"
                         tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                         tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                         tickLine={false} axisLine={false} width={25} />
                  <Tooltip
                    contentStyle={{ background: 'var(--navy-800)', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(v, payload) => {
                      const d = payload?.[0]?.payload;
                      return d ? `${v} vs ${d.opponent}` : v;
                    }}
                    formatter={(v: number, name: string) => [`${v}`, name]}
                  />
                  <Line type="monotone" dataKey="pts" name="Puntos"
                        stroke={myTeam.color} strokeWidth={2.5}
                        dot={(props) => {
                          const d = props.payload;
                          return (
                            <circle key={props.key} cx={props.cx} cy={props.cy} r={5}
                                    fill={RESULT_COLOR[d.result] ?? 'var(--blue-400)'}
                                    stroke="var(--navy-900)" strokeWidth={2} />
                          );
                        }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Goal differential */}
          <div className="card p-4">
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>
              DIFERENCIA DE GOLES POR PARTIDO
            </p>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={diffData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
                  <XAxis dataKey="match"
                         tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                         tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                         tickLine={false} axisLine={false} width={25} />
                  <ReferenceLine y={0} stroke="var(--surface-border)" strokeDasharray="4 3" />
                  <Tooltip
                    contentStyle={{ background: 'var(--navy-800)', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v > 0 ? '+' : ''}${v}`, 'Diferencia']}
                  />
                  <Line type="monotone" dataKey="diff" name="Diferencia"
                        stroke="var(--blue-400)" strokeWidth={2}
                        dot={(props) => {
                          const fill = props.payload.diff >= 0 ? 'var(--lime-500)' : 'var(--red-400)';
                          return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={fill} stroke="var(--navy-900)" strokeWidth={2} />;
                        }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-match table */}
          <div className="card">
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--surface-border)' }}>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>DETALLE PARTIDO A PARTIDO</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    {['P', 'Fecha', 'Rival', 'Resultado', 'GF', 'GC', 'Dif.', 'Efect.'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-mono"
                          style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agg.perMatch.map((m, i) => (
                    <tr key={m.matchId} className="border-b hover:brightness-105 transition-all"
                        style={{ borderColor: 'var(--surface-border)' }}>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {m.date ? new Date(m.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{m.opponent}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                              style={{ background: RESULT_BG[m.result] ?? 'transparent', color: RESULT_COLOR[m.result] }}>
                          {m.result === 'W' ? 'Victoria' : m.result === 'D' ? 'Empate' : 'Derrota'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold" style={{ color: 'var(--lime-400)' }}>{m.goalsFor}</td>
                      <td className="px-4 py-2.5 font-mono font-bold" style={{ color: 'var(--red-400)' }}>{m.goalsAgainst}</td>
                      <td className="px-4 py-2.5 font-mono font-bold"
                          style={{ color: m.goalsFor > m.goalsAgainst ? 'var(--lime-400)' : m.goalsFor < m.goalsAgainst ? 'var(--red-400)' : 'var(--text-muted)' }}>
                        {m.goalsFor - m.goalsAgainst > 0 ? '+' : ''}{m.goalsFor - m.goalsAgainst}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'var(--navy-700)' }}>
                            <div className="h-full" style={{ width: `${m.efficiency}%`, background: 'var(--blue-500)' }} />
                          </div>
                          <span className="text-xs font-mono" style={{ color: 'var(--blue-400)' }}>{m.efficiency}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryChip({ label, value, color, icon: Icon }: {
  label: string; value: string; color?: string; icon?: React.ElementType;
}) {
  return (
    <div className="card p-3">
      <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={14} style={{ color: color ?? 'var(--text-secondary)' }} />}
        <p className="font-mono font-bold text-xl" style={{ color: color ?? 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}
