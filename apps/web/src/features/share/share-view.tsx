'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';
import type { Match } from '@sportiq/core';
import type { HandballEvent } from '@sportiq/core/handball';
import type { MatchStats } from '@sportiq/core/handball';

interface ShareViewProps {
  match:  Match;
  events: HandballEvent[];
  stats:  MatchStats;
}

const EVENT_LABELS: Record<string, string> = {
  goal: 'Gol', miss: 'Errado', saved: 'Atajado', post: 'Palo',
  exclusion: 'Exclusión', timeout: 'Tiempo muerto', turnover: 'Pérdida',
  half_time: 'Descanso',
};
const EVENT_CLASSES: Record<string, string> = {
  goal: 'event-goal', miss: 'event-miss', saved: 'event-saved',
  exclusion: 'event-exclusion', turnover: 'event-turnover',
};

export function ShareView({ match, events, stats }: ShareViewProps) {
  const goals = events.filter((e) => e.type === 'goal');

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy-950)' }}>

      {/* Minimal header */}
      <header className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--blue-600)' }}>
            <Zap size={12} className="text-white" />
          </div>
          <span className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>SportIQ</span>
        </Link>
        <span className="text-xs px-2 py-1 rounded font-mono"
              style={{ background: 'var(--navy-700)', color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }}>
          Vista pública
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fade-up">

        {/* Scoreboard */}
        <div className="card p-6 text-center space-y-4">
          {match.competition && (
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{match.competition}</p>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-2 mb-2">
                <span className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {match.home_team_name}
                </span>
                <div className="w-3 h-3 rounded-full" style={{ background: match.home_team_color }} />
              </div>
              <p className="score-display">{match.home_score}</p>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>–</span>
              <span className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{ background: 'var(--navy-700)', color: 'var(--text-muted)', fontSize: 10 }}>
                {match.status === 'closed' ? 'FINAL' : match.status.toUpperCase()}
              </span>
            </div>

            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: match.away_team_color }} />
                <span className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {match.away_team_name}
                </span>
              </div>
              <p className="score-display">{match.away_score}</p>
            </div>
          </div>

          {match.match_date && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {new Date(match.match_date).toLocaleDateString('es-AR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <StatPair home={stats.homeGoals}   away={stats.awayGoals}   label="Goles"        />
          <StatPair home={stats.homeShots}   away={stats.awayShots}   label="Remates"      />
          <StatPair home={`${stats.homePct}%`} away={`${stats.awayPct}%`} label="Efectividad" />
          <StatPair home={stats.homeSaved}   away={stats.awaySaved}   label="Atajados"     />
          <StatPair home={stats.homeExcl}    away={stats.awayExcl}    label="Exclusiones"  />
          <StatPair home={stats.homeTurnover} away={stats.awayTurnover} label="Pérdidas"   />
        </div>

        {/* Goal scorers */}
        {goals.length > 0 && (
          <div className="card">
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--surface-border)' }}>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>GOLEADORES</p>
            </div>
            <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as any}>
              {goals.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 px-4 py-2.5"
                     style={{ borderColor: 'var(--surface-border)' }}>
                  <span className="text-xs font-mono w-8 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {ev.min}'
                  </span>
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                       style={{ background: ev.team === 'home' ? match.home_team_color : match.away_team_color }} />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {ev.shooter ? `#${ev.shooter.number} ${ev.shooter.name}` : '—'}
                  </span>
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                    {ev.hScore}–{ev.aScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full event feed */}
        {events.length > 0 && (
          <div className="card">
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--surface-border)' }}>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                CRONOLOGÍA · {events.length} eventos
              </p>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 px-4 py-2"
                     style={{ borderColor: 'var(--surface-border)' }}>
                  <span className="text-xs font-mono w-8 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {ev.min}'
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold border flex-shrink-0 ${EVENT_CLASSES[ev.type] ?? ''}`}>
                    {EVENT_LABELS[ev.type] ?? ev.type}
                  </span>
                  <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {ev.team === 'home' ? match.home_team_name : match.away_team_name}
                    {ev.shooter ? ` · #${ev.shooter.number} ${ev.shooter.name}` : ''}
                    {ev.zone ? ` · ${ev.zone}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Compartido con{' '}
            <Link href="/" className="hover:underline" style={{ color: 'var(--blue-400)' }}>
              SportIQ
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function StatPair({ home, away, label }: { home: number | string; away: number | string; label: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-base" style={{ color: 'var(--text-primary)' }}>{home}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>–</span>
        <span className="font-mono font-bold text-base" style={{ color: 'var(--text-primary)' }}>{away}</span>
      </div>
    </div>
  );
}
