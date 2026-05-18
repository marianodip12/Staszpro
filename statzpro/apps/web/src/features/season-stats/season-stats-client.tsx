'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, TrendingUp, Target, Shield } from 'lucide-react';
import { computeSeasonAggregates, type MatchRecord } from '@sportiq/analytics';

interface TeamOption { id: string; name: string; color: string; }

interface SeasonStatsClientProps {
  orgSlug:    string;
  orgName:    string;
  seasonName: string | null;
  records:    MatchRecord[];
  teams:      TeamOption[];
}

const RESULT_COLOR: Record<string, string> = {
  W: 'var(--lime-500)',
  D: 'var(--amber-400)',
  L: 'var(--red-400)',
};

export function SeasonStatsClient({
  orgSlug, orgName, seasonName, records, teams,
}: SeasonStatsClientProps) {
  const [myTeam, setMyTeam] = useState<TeamOption>(teams[0] ?? { id: '', name: orgName, color: '#3B82F6' });

  const agg = useMemo(
    () => records.length ? computeSeasonAggregates(records, myTeam.name) : null,
    [records, myTeam.name],
  );

  // Goals per match chart data
  const goalsChartData = agg?.perMatch.map((m, i) => ({
    label: `P${i + 1}`,
    for:    m.goalsFor,
    against:m.goalsAgainst,
    result: m.result,
  })) ?? [];

  // Zone chart data
  const zoneData = Object.entries(agg?.shotsByZone ?? {})
    .map(([zone, count]) => ({ zone, count: count ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
            Estadísticas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {seasonName ?? 'Todos los partidos'} · {records.length} partido{records.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Team picker */}
        {teams.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>EQUIPO</span>
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--surface-border)' }}>
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setMyTeam(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm transition-all"
                  style={{
                    background: myTeam.id === t.id ? 'var(--navy-600)' : 'var(--navy-800)',
                    color:      myTeam.id === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!agg ? (
        <div className="card p-12 text-center">
          <p style={{ color: 'var(--text-muted)' }}>Sin partidos finalizados para mostrar estadísticas.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
            <KpiCard
              icon={Trophy}
              label="Registro"
              value={`${agg.totals.wins}V ${agg.totals.draws}E ${agg.totals.losses}D`}
              sub={`${agg.totals.points} pts`}
              accent={myTeam.color}
            />
            <KpiCard
              icon={Target}
              label="Goles a favor"
              value={String(agg.totals.goalsFor)}
              sub={`${agg.avgGoalsFor} por partido`}
              accent="var(--lime-400)"
            />
            <KpiCard
              icon={Shield}
              label="Goles en contra"
              value={String(agg.totals.goalsAgainst)}
              sub={`${agg.conceded.perMatch} por partido`}
              accent="var(--red-400)"
            />
            <KpiCard
              icon={TrendingUp}
              label="Racha actual"
              value={`${agg.streaks.current.count} ${agg.streaks.current.type === 'W' ? '🟢' : agg.streaks.current.type === 'D' ? '🟡' : '🔴'}`}
              sub={`Mejor invicto: ${agg.streaks.bestUnbeaten}`}
              accent="var(--blue-400)"
            />
          </div>

          {/* Form strip */}
          <div className="card p-4">
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>ÚLTIMOS 5 PARTIDOS</p>
            <div className="flex gap-2">
              {agg.form.map((r, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm"
                  style={{ background: `${RESULT_COLOR[r]}20`, color: RESULT_COLOR[r], border: `1px solid ${RESULT_COLOR[r]}40` }}
                >
                  {r}
                </div>
              ))}
              {agg.form.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin datos suficientes.</p>
              )}
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Goals per match */}
            <div className="card p-4">
              <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>GOLES POR PARTIDO</p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={goalsChartData} barGap={2}>
                    <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                           tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                           tickLine={false} axisLine={false} width={20} />
                    <Tooltip
                      contentStyle={{ background: 'var(--navy-800)', border: '1px solid var(--surface-border)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text-muted)', fontSize: 11 }}
                      itemStyle={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    />
                    <Bar dataKey="for" name="A favor" fill="var(--lime-500)" radius={[2, 2, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="against" name="En contra" fill="var(--red-400)" radius={[2, 2, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Zone heatmap */}
            <div className="card p-4">
              <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>REMATES POR ZONA</p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneData} layout="vertical">
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                           tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="zone" width={90}
                           tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                           tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--navy-800)', border: '1px solid var(--surface-border)', borderRadius: 8 }}
                      itemStyle={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    />
                    <Bar dataKey="count" name="Remates" radius={[0, 2, 2, 0]} maxBarSize={18}>
                      {zoneData.map((_, i) => (
                        <Cell key={i} fill={`rgba(37,99,235,${0.4 + (i / zoneData.length) * 0.5})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top scorers table */}
          {agg.topScorers.length > 0 && (
            <div className="card">
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--surface-border)' }}>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>GOLEADORES DE TEMPORADA</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    {['#', 'Jugador', 'Partidos', 'Goles', 'Remates', 'Efectividad'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agg.topScorers.slice(0, 10).map((s, i) => (
                    <tr key={s.name} className="border-b" style={{ borderColor: 'var(--surface-border)' }}>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono w-6" style={{ color: 'var(--text-muted)' }}>#{s.number}</span>
                          <span style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{s.matchCount}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-bold" style={{ color: 'var(--lime-400)' }}>{s.goals}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{s.shots}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--navy-700)' }}>
                            <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: 'var(--blue-500)' }} />
                          </div>
                          <span className="font-mono text-xs" style={{ color: 'var(--blue-400)' }}>{s.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Conceded by minute */}
          <div className="card p-4">
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>
              GOLES RECIBIDOS POR FRANJA HORARIA · total {agg.conceded.total}
            </p>
            <div className="flex items-end gap-2 h-20">
              {agg.conceded.byMinute.map((b) => {
                const max = Math.max(...agg.conceded.byMinute.map((x) => x.count), 1);
                const h   = max === 0 ? 0 : Math.round((b.count / max) * 100);
                return (
                  <div key={b.rangeLabel} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-mono" style={{ color: 'var(--red-400)' }}>{b.count || ''}</span>
                    <div
                      className="w-full rounded-t transition-all"
                      style={{ height: `${h}%`, minHeight: b.count ? 4 : 0, background: `rgba(239,68,68,${0.2 + (h / 100) * 0.6})` }}
                    />
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: 9 }}>{b.rangeLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
             style={{ background: `${accent}18` }}>
          <Icon size={13} style={{ color: accent }} />
        </div>
      </div>
      <p className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}
