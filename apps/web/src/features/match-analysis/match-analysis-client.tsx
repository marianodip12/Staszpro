'use client';

/**
 * MatchAnalysisClient — análisis completo de un partido.
 *
 * Layout: tres columnas en desktop.
 *  LEFT:   CourtView + GoalGrid (crossfilter visual)
 *  CENTER: VideoPlayer + lista de eventos sincronizada
 *  RIGHT:  Stats panel (scorers, GK, totals)
 *
 * El filtro actúa globalmente: click en zona → filtra eventos,
 * scorers y goal grid simultáneamente (crossfilter pattern de Handball Pro).
 */

import { useState, useCallback, useMemo } from 'react';
import { BarChart3, Video as VideoIcon, List, TrendingUp, X } from 'lucide-react';
import type { Match } from '@sportiq/core';
import type {
  HandballEvent, CourtZoneId, GoalQuadrantId, MatchFilter,
} from '@sportiq/core/handball';
import {
  EMPTY_FILTER, applyFilter, summarize, perShooter,
  perGoalkeeper, perZone, perQuadrant, toggleZone, toggleQuadrant,
} from '@sportiq/core/handball';
import { CourtView } from '@/components/court/CourtView';
import { GoalGrid } from '@/components/court/GoalGrid';
import { VideoPanel } from '@/features/match-analysis/video-panel';
import { EventListPanel } from '@/features/match-analysis/event-list-panel';
import { StatsPanel } from '@/features/match-analysis/stats-panel';
import { ScoreTimeline } from '@/features/match-analysis/score-timeline';

// ─── Props ────────────────────────────────────────────────────────────────────

interface VideoAssetSummary {
  id: string; status: string; duration: number | null; original_name: string | null; created_at: string;
}

interface MatchAnalysisClientProps {
  match:            Match;
  events:           HandballEvent[];
  videoAssets:      VideoAssetSummary[];
  cachedAnalytics:  unknown;
  orgSlug:          string;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'video' | 'events' | 'stats' | 'evolution';

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: 'video',     label: 'Video',      icon: VideoIcon  },
  { id: 'events',    label: 'Eventos',    icon: List       },
  { id: 'stats',     label: 'Estadísticas', icon: BarChart3  },
  { id: 'evolution', label: 'Evolución',  icon: TrendingUp },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function MatchAnalysisClient({
  match, events, videoAssets, orgSlug,
}: MatchAnalysisClientProps) {
  const [filter,      setFilter]      = useState<MatchFilter>(EMPTY_FILTER);
  const [activeTab,   setActiveTab]   = useState<Tab>('video');
  const [activeTeam,  setActiveTeam]  = useState<'home' | 'away' | 'both'>('both');
  const [selectedEvt, setSelectedEvt] = useState<string | null>(null);

  // ── Derived data (memoized) ────────────────────────────────────────────────

  const teamFilter = useMemo((): MatchFilter => ({
    ...filter,
    team: activeTeam === 'both' ? null : activeTeam,
  }), [filter, activeTeam]);

  const filtered = useMemo(() => applyFilter(events, teamFilter), [events, teamFilter]);
  const summary  = useMemo(() => summarize(filtered), [filtered]);
  const shooters = useMemo(() => perShooter(events, teamFilter), [events, teamFilter]);
  const keepers  = useMemo(() => perGoalkeeper(events, teamFilter), [events, teamFilter]);
  const zoneCts  = useMemo(() => perZone(events, teamFilter), [events, teamFilter]);
  const quadCts  = useMemo(() => perQuadrant(events, teamFilter), [events, teamFilter]);

  // ── Filter handlers ────────────────────────────────────────────────────────

  const handleZoneClick = useCallback((zone: CourtZoneId) => {
    setFilter((f) => toggleZone(f, zone));
  }, []);

  const handleQuadrantClick = useCallback((q: GoalQuadrantId) => {
    setFilter((f) => toggleQuadrant(f, q));
  }, []);

  const clearFilter = useCallback(() => {
    setFilter(EMPTY_FILTER);
    setActiveTeam('both');
  }, []);

  const hasFilter = filter.zone != null || filter.quadrant != null ||
                    filter.shooterKey != null || filter.types.length > 0 || activeTeam !== 'both';

  return (
    <div className="flex flex-col h-full">

      {/* ── Match header ───────────────────────────────────────────────── */}
      <MatchHeader match={match} />

      {/* ── Team filter toggle ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b"
           style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>

        {(['both', 'home', 'away'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTeam(t)}
            className="px-3 py-1 rounded text-xs font-mono font-bold transition-all"
            style={{
              background: activeTeam === t ? 'var(--blue-600)' : 'var(--navy-700)',
              color:      activeTeam === t ? 'white' : 'var(--text-muted)',
              border:     '1px solid var(--surface-border)',
            }}
          >
            {t === 'both' ? 'AMBOS' : t === 'home' ? match.home_team_name.slice(0, 8).toUpperCase() : match.away_team_name.slice(0, 8).toUpperCase()}
          </button>
        ))}

        {hasFilter && (
          <button
            onClick={clearFilter}
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{ color: 'var(--amber-400)', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)' }}
          >
            <X size={10} /> Limpiar filtro
          </button>
        )}

        {/* Summary chips */}
        <div className="ml-auto flex items-center gap-3 text-xs font-mono">
          <Chip label="Goles"    value={summary.goals}  color="var(--lime-400)"  />
          <Chip label="Remates"  value={summary.shots}  color="var(--blue-400)"  />
          <Chip label="Efectividad" value={`${summary.pct}%`} color="var(--text-secondary)" />
        </div>
      </div>

      {/* ── Main layout ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* LEFT: Court crossfilter (always visible on desktop) */}
        <aside className="hidden lg:flex flex-col gap-4 w-64 xl:w-72 flex-shrink-0 p-4 border-r overflow-y-auto"
               style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>

          <div>
            <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>MAPA DE ZONA</p>
            <CourtView
              selectedZone={filter.zone}
              onZoneClick={handleZoneClick}
              heatCounts={zoneCts}
              heatmapMode={!filter.zone}
              size="sm"
            />
          </div>

          <div>
            <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>ARCO RIVAL</p>
            <GoalGrid
              selected={filter.quadrant}
              counts={quadCts}
              onSelect={(z) => {
                const q = ['tl','tc','tr','ml','mc','mr','bl','bc','br'];
                if (q.includes(z)) handleQuadrantClick(z as GoalQuadrantId);
              }}
              showMeta={false}
            />
          </div>
        </aside>

        {/* CENTER + RIGHT */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Tabs */}
          <div className="flex-shrink-0 flex border-b"
               style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all relative"
                  style={{ color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  <Icon size={14} />
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5"
                          style={{ background: 'var(--blue-500)' }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'video' && (
              <VideoPanel
                match={match}
                videoAssets={videoAssets}
                events={filtered}
                selectedEventId={selectedEvt}
                onEventSelect={setSelectedEvt}
                orgSlug={orgSlug}
              />
            )}
            {activeTab === 'events' && (
              <EventListPanel
                events={filtered}
                match={match}
                selectedId={selectedEvt}
                onSelect={setSelectedEvt}
                filter={filter}
                onFilterChange={setFilter}
              />
            )}
            {activeTab === 'stats' && (
              <StatsPanel
                summary={summary}
                shooters={shooters}
                keepers={keepers}
                match={match}
              />
            )}
            {activeTab === 'evolution' && (
              <ScoreTimeline events={events} match={match} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MatchHeader ──────────────────────────────────────────────────────────────

function MatchHeader({ match }: { match: Match }) {
  return (
    <div className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between"
         style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>
      <div className="flex items-center gap-4">
        <TeamBadge name={match.home_team_name} color={match.home_team_color} score={match.home_score} />
        <div className="text-center">
          <div className="text-xs font-mono mb-0.5" style={{ color: 'var(--text-muted)' }}>VS</div>
          {match.match_date && (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {new Date(match.match_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
            </div>
          )}
        </div>
        <TeamBadge name={match.away_team_name} color={match.away_team_color} score={match.away_score} reverse />
      </div>
      {match.competition && (
        <span className="text-xs px-2 py-1 rounded font-mono"
              style={{ background: 'var(--navy-700)', color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }}>
          {match.competition}
        </span>
      )}
    </div>
  );
}

function TeamBadge({ name, color, score, reverse }: {
  name: string; color: string; score: number; reverse?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${reverse ? 'flex-row-reverse' : ''}`}>
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{name}</span>
      <span className="score-display" style={{ fontSize: '2rem' }}>{score}</span>
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
