/**
 * Route: /[orgSlug]/dashboard
 * Server Component — métricas de temporada activa.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { Play, BarChart3, TrendingUp, Users, Plus, ChevronRight, Trophy } from 'lucide-react';
import { seasonTotals } from '@sportiq/core/handball';
import type { Match, MatchSummary } from '@sportiq/core';

interface DashboardProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function DashboardPage({ params }: DashboardProps) {
  const { orgSlug } = await params;
  const supabase    = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, plan, sport_type')
    .eq('slug', orgSlug)
    .single();
  if (!org) redirect('/dashboard');

  // Fetch last 5 closed matches
  const { data: recentMatches } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, home_score, away_score, match_date, status, home_team_color, away_team_color, competition')
    .eq('org_id', org.id)
    .eq('status', 'closed')
    .order('match_date', { ascending: false })
    .limit(5);

  // Fetch live match if any
  const { data: liveMatches } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, home_score, away_score, status')
    .eq('org_id', org.id)
    .in('status', ['live', 'half_time'])
    .limit(1);

  // Fetch active season
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('org_id', org.id)
    .eq('is_active', true)
    .maybeSingle();

  // Fetch team count
  const { count: teamCount } = await supabase
    .from('teams')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id);

  // Season totals (compute from closed matches)
  const summaries: MatchSummary[] = (recentMatches ?? []).map((m) => ({
    id: m.id, home: m.home_team_name, away: m.away_team_name,
    hs: m.home_score, as: m.away_score,
    date: m.match_date, competition: m.competition ?? null,
    homeColor: m.home_team_color, awayColor: m.away_team_color, events: [],
  }));

  const liveMatch = liveMatches?.[0] ?? null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-fade-up">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {org.name}
            {activeSeason && (
              <span style={{ color: 'var(--text-muted)' }}> · {activeSeason.name}</span>
            )}
          </p>
        </div>
        <Link
          href={`/${orgSlug}/matches/new`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
          style={{ background: 'var(--blue-600)', color: 'white' }}
        >
          <Plus size={15} /> Nuevo partido
        </Link>
      </div>

      {/* ── Live match banner ───────────────────────────────────────── */}
      {liveMatch && (
        <Link href={`/${orgSlug}/matches/${liveMatch.id}/live`}
              className="card flex items-center gap-4 p-4 transition-all hover:brightness-105"
              style={{ borderColor: 'rgba(132,204,22,.4)', background: 'rgba(132,204,22,.04)' }}>
          <div className="flex items-center gap-2">
            <div className="live-dot" />
            <span className="text-xs font-mono font-bold" style={{ color: 'var(--lime-400)' }}>EN VIVO</span>
          </div>
          <span className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {liveMatch.home_team_name} {liveMatch.home_score} – {liveMatch.away_score} {liveMatch.away_team_name}
          </span>
          <ChevronRight size={16} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
        </Link>
      )}

      {/* ── Quick stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        <QuickStat
          label="Partidos jugados"
          value={recentMatches?.length ?? 0}
          icon={Play}
          href={`/${orgSlug}/matches`}
        />
        <QuickStat
          label="Equipos"
          value={teamCount ?? 0}
          icon={Users}
          href={`/${orgSlug}/teams`}
        />
        <QuickStat
          label="Temporada activa"
          value={activeSeason?.name ?? '—'}
          icon={Trophy}
          href={`/${orgSlug}/stats`}
          isText
        />
        <QuickStat
          label="Plan"
          value={org.plan.toUpperCase()}
          icon={BarChart3}
          href={`/${orgSlug}/settings`}
          isText
        />
      </div>

      {/* ── Main content grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent matches (2/3 width) */}
        <div className="lg:col-span-2">
          <SectionHeader title="ÚLTIMOS PARTIDOS" href={`/${orgSlug}/matches`} />
          {(recentMatches?.length ?? 0) === 0 ? (
            <EmptyState
              message="Sin partidos finalizados todavía."
              action={{ label: 'Crear primer partido', href: `/${orgSlug}/matches/new` }}
            />
          ) : (
            <div className="space-y-2">
              {recentMatches!.map((m) => (
                <RecentMatchCard key={m.id} match={m as Match} orgSlug={orgSlug} />
              ))}
            </div>
          )}
        </div>

        {/* Quick actions (1/3 width) */}
        <div className="space-y-3">
          <SectionHeader title="ACCESOS RÁPIDOS" />
          <div className="space-y-2">
            {[
              { icon: Play,       label: 'Registrar partido',  desc: 'Iniciá un nuevo partido en vivo',    href: `/${orgSlug}/matches/new`        },
              { icon: BarChart3,  label: 'Ver estadísticas',   desc: 'Análisis de la temporada actual',    href: `/${orgSlug}/stats`              },
              { icon: TrendingUp, label: 'Evolución',          desc: 'Progreso partido a partido',         href: `/${orgSlug}/evolution`          },
              { icon: Users,      label: 'Gestionar equipos',  desc: 'Jugadores y plantillas',             href: `/${orgSlug}/teams`              },
            ].map((item) => (
              <QuickAction key={item.label} {...item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuickStat({ label, value, icon: Icon, href, isText }: {
  label: string; value: number | string; icon: React.ElementType;
  href: string; isText?: boolean;
}) {
  return (
    <Link href={href} className="card p-4 flex flex-col gap-3 transition-all hover:brightness-110 hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <Icon size={14} style={{ color: 'var(--text-muted)' }} />
      </div>
      <span className={isText ? 'text-lg font-bold font-display' : 'stat-value'}
            style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </Link>
  );
}

function RecentMatchCard({ match, orgSlug }: { match: Match; orgSlug: string }) {
  return (
    <Link href={`/${orgSlug}/matches/${match.id}`}
          className="card flex items-center gap-3 p-3 transition-all hover:brightness-110 hover:scale-[1.005]">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: match.home_team_color }} />
        <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{match.home_team_name}</span>
      </div>
      <div className="flex items-center gap-1.5 font-mono font-bold text-base flex-shrink-0"
           style={{ color: 'var(--text-primary)' }}>
        <span>{match.home_score}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>–</span>
        <span>{match.away_score}</span>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{match.away_team_name}</span>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: match.away_team_color }} />
      </div>
      {match.match_date && (
        <span className="text-xs font-mono flex-shrink-0 hidden sm:block" style={{ color: 'var(--text-muted)' }}>
          {new Date(match.match_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
        </span>
      )}
      <BarChart3 size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </Link>
  );
}

function QuickAction({ icon: Icon, label, desc, href }: {
  icon: React.ElementType; label: string; desc: string; href: string;
}) {
  return (
    <Link href={href}
          className="card flex items-center gap-3 p-3 transition-all hover:brightness-110 hover:scale-[1.01]">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ background: 'var(--navy-700)' }}>
        <Icon size={15} style={{ color: 'var(--blue-400)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </Link>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{title}</p>
      {href && (
        <Link href={href} className="text-xs flex items-center gap-0.5 hover:opacity-80"
              style={{ color: 'var(--blue-400)' }}>
          Ver todos <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: { label: string; href: string } }) {
  return (
    <div className="card p-8 text-center space-y-3">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
      {action && (
        <Link href={action.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm"
              style={{ background: 'var(--navy-700)', color: 'var(--blue-400)', border: '1px solid var(--surface-border)' }}>
          <Plus size={13} /> {action.label}
        </Link>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: DashboardProps) {
  const { orgSlug } = await params;
  return { title: `Dashboard — ${orgSlug}` };
}
