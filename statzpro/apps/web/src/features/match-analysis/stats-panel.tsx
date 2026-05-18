'use client';

/**
 * analysis sub-panels: StatsPanel, EventListPanel, ScoreTimeline
 * Migrated from Handball Pro, redesigned for unified platform.
 */

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import type { Match } from '@sportiq/core';
import type {
  HandballEvent, MatchFilter, FilteredSummary,
  ShooterSummary, GoalkeeperSummary,
} from '@sportiq/core/handball';
import { scoreTimeline, keyMoments } from '@sportiq/core/handball';

// ═══════════════════════════════════════════════════════════════
// STATS PANEL
// ═══════════════════════════════════════════════════════════════

interface StatsPanelProps {
  summary:  FilteredSummary;
  shooters: ShooterSummary[];
  keepers:  GoalkeeperSummary[];
  match:    Match;
}

export function StatsPanel({ summary, shooters, keepers, match }: StatsPanelProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">

      {/* Summary grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Goles"       value={summary.goals}   accent="var(--lime-400)"  />
        <StatCard label="Remates"     value={summary.shots}   accent="var(--blue-400)"  />
        <StatCard label="Efectividad" value={`${summary.pct}%`} accent="var(--text-primary)" />
        <StatCard label="Atajados"    value={summary.saved}   accent="var(--blue-300)"  />
        <StatCard label="Errados"     value={summary.miss}    accent="var(--red-400)"   />
        <StatCard label="Palos"       value={summary.post}    accent="var(--amber-400)" />
      </div>

      {/* Scorers */}
      {shooters.length > 0 && (
        <Section title="GOLEADORES">
          <div className="space-y-1">
            {shooters.slice(0, 8).map((s) => (
              <ShooterRow key={s.key} shooter={s} match={match} />
            ))}
          </div>
        </Section>
      )}

      {/* GK */}
      {keepers.length > 0 && (
        <Section title="ARQUEROS">
          <div className="space-y-1">
            {keepers.map((gk) => (
              <GKRow key={gk.key} gk={gk} match={match} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="card p-3 flex flex-col gap-1">
      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="stat-value" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function ShooterRow({ shooter, match }: { shooter: ShooterSummary; match: Match }) {
  const teamName = shooter.team === 'home' ? match.home_team_name : match.away_team_name;
  const color    = shooter.team === 'home' ? match.home_team_color : match.away_team_color;
  const maxGoals = 10; // for bar width
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded" style={{ background: 'var(--surface-raised)' }}>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs font-mono w-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
        #{shooter.number}
      </span>
      <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
        {shooter.name}
      </span>
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1 rounded overflow-hidden" style={{ background: 'var(--navy-700)' }}>
          <div className="h-full rounded" style={{
            width: `${Math.min(shooter.goals / maxGoals, 1) * 100}%`,
            background: 'var(--lime-500)',
          }} />
        </div>
        <span className="text-xs font-mono w-4 text-right" style={{ color: 'var(--lime-400)' }}>
          {shooter.goals}
        </span>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          /{shooter.shots}
        </span>
      </div>
    </div>
  );
}

function GKRow({ gk, match }: { gk: GoalkeeperSummary; match: Match }) {
  const color = gk.team === 'home' ? match.home_team_color : match.away_team_color;
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded" style={{ background: 'var(--surface-raised)' }}>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs font-mono w-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
        #{gk.number}
      </span>
      <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
        {gk.name}
      </span>
      <span className="text-xs font-mono" style={{ color: 'var(--blue-400)' }}>{gk.pct}%</span>
      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
        {gk.saved}/{gk.faced}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>{title}</p>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EVENT LIST PANEL
// ═══════════════════════════════════════════════════════════════

const EVENT_LABEL: Record<string, string> = {
  goal: 'Gol', miss: 'Errado', saved: 'Atajado', post: 'Palo',
  exclusion: 'Exclusión', timeout: 'Tiempo', turnover: 'Pérdida',
  half_time: 'Descanso', red_card: 'Roja', yellow_card: 'Amarilla',
};
const EVENT_CLASS: Record<string, string> = {
  goal: 'event-goal', miss: 'event-miss', saved: 'event-saved',
  exclusion: 'event-exclusion', turnover: 'event-turnover',
};

interface EventListPanelProps {
  events:         HandballEvent[];
  match:          Match;
  selectedId:     string | null;
  onSelect:       (id: string | null) => void;
  filter:         MatchFilter;
  onFilterChange: (f: MatchFilter) => void;
}

export function EventListPanel({
  events, match, selectedId, onSelect,
}: EventListPanelProps) {
  return (
    <div className="h-full overflow-y-auto">
      {events.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin eventos con el filtro activo.</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b sticky top-0" style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>
              {['Min', 'Equipo', 'Tipo', 'Jugador', 'Zona', 'Resultado'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-mono"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => {
              const isSelected = ev.id === selectedId;
              const teamName   = ev.team === 'home' ? match.home_team_name : match.away_team_name;
              const teamColor  = ev.team === 'home' ? match.home_team_color : match.away_team_color;
              return (
                <tr
                  key={ev.id}
                  onClick={() => onSelect(isSelected ? null : ev.id)}
                  className="border-b cursor-pointer transition-colors hover:brightness-110"
                  style={{
                    borderColor: 'var(--surface-border)',
                    background:  isSelected ? 'var(--navy-700)' : 'transparent',
                  }}
                >
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{ev.min}'</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: teamColor }} />
                      <span className="text-xs truncate max-w-[80px]" style={{ color: 'var(--text-secondary)' }}>{teamName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold border ${EVENT_CLASS[ev.type] ?? ''}`}>
                      {EVENT_LABEL[ev.type] ?? ev.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {ev.shooter ? `#${ev.shooter.number} ${ev.shooter.name}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {ev.zone ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                    {ev.hScore}–{ev.aScore}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCORE TIMELINE
// ═══════════════════════════════════════════════════════════════

interface ScoreTimelineProps {
  events: HandballEvent[];
  match:  Match;
}

export function ScoreTimeline({ events, match }: ScoreTimelineProps) {
  const timeline = useMemo(() => scoreTimeline(events), [events]);
  const moments  = useMemo(() => keyMoments(events), [events]);

  const chartData = timeline.filter((_, i) => i % 2 === 0); // sample every 2 min for perf

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">

      {/* Key moments */}
      <div>
        <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>MOMENTOS CLAVE</p>
        <div className="grid grid-cols-4 gap-2">
          {moments.map((m) => (
            <div key={m.minute} className="card p-3 text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
              <p className="font-mono font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {m.home}–{m.away}
              </p>
              <p className="text-xs font-mono mt-0.5" style={{
                color: m.diff > 0 ? 'var(--lime-400)' : m.diff < 0 ? 'var(--red-400)' : 'var(--text-muted)',
              }}>
                {m.diff > 0 ? `+${m.diff}` : m.diff === 0 ? 'Empate' : m.diff}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Score evolution chart */}
      <div>
        <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>EVOLUCIÓN DEL MARCADOR</p>
        <div className="card p-4" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis
                dataKey="minute"
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                tickLine={false} axisLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                tickLine={false} axisLine={false}
              />
              <Tooltip
                contentStyle={{ background: 'var(--navy-800)', border: '1px solid var(--surface-border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
                itemStyle={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                labelFormatter={(v) => `Min ${v}`}
              />
              <ReferenceLine x={30} stroke="var(--surface-border)" strokeDasharray="4 3" />
              <Line
                type="stepAfter" dataKey="home" name={match.home_team_name}
                stroke={match.home_team_color} strokeWidth={2} dot={false}
              />
              <Line
                type="stepAfter" dataKey="away" name={match.away_team_name}
                stroke={match.away_team_color} strokeWidth={2} dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
