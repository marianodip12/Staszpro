/**
 * Route: /[orgSlug]/matches
 * Server Component — lista todos los partidos de la org.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase';
import { Play, BarChart3, Plus, Clock } from 'lucide-react';
import type { Match } from '@sportiq/core';

interface MatchesPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function MatchesPage({ params }: MatchesPageProps) {
  const { orgSlug } = await params;
  const supabase    = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch org id from slug
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', orgSlug)
    .single();

  if (!org) redirect('/dashboard');

  // Fetch matches
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const live     = matches?.filter((m) => m.status === 'live' || m.status === 'half_time') ?? [];
  const closed   = matches?.filter((m) => m.status === 'closed') ?? [];
  const upcoming = matches?.filter((m) => m.status === 'idle') ?? [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
            Partidos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {matches?.length ?? 0} partidos registrados
          </p>
        </div>
        <Link
          href={`/${orgSlug}/matches/new`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
          style={{ background: 'var(--blue-600)', color: 'white' }}
        >
          <Plus size={16} /> Nuevo partido
        </Link>
      </div>

      {/* Live matches */}
      {live.length > 0 && (
        <Section title="EN VIVO" accent="var(--lime-400)">
          {live.map((m) => (
            <MatchCard key={m.id} match={m as Match} orgSlug={orgSlug} variant="live" />
          ))}
        </Section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Section title="PROGRAMADOS">
          {upcoming.map((m) => (
            <MatchCard key={m.id} match={m as Match} orgSlug={orgSlug} variant="upcoming" />
          ))}
        </Section>
      )}

      {/* Closed / analyzed */}
      {closed.length > 0 && (
        <Section title="FINALIZADOS">
          {closed.map((m) => (
            <MatchCard key={m.id} match={m as Match} orgSlug={orgSlug} variant="closed" />
          ))}
        </Section>
      )}

      {matches?.length === 0 && (
        <div className="text-center py-16">
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sin partidos todavía</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Creá tu primer partido para empezar a registrar eventos y analizar estadísticas.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children, accent }: {
  title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {accent && <div className="live-dot" style={{ background: accent }} />}
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{title}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MatchCard({ match, orgSlug, variant }: {
  match: Match; orgSlug: string; variant: 'live' | 'upcoming' | 'closed';
}) {
  const href = variant === 'upcoming' || variant === 'live'
    ? `/${orgSlug}/matches/${match.id}/live`
    : `/${orgSlug}/matches/${match.id}`;

  return (
    <Link
      href={href}
      className="card flex items-center gap-4 p-4 transition-all hover:scale-[1.005] hover:border-blue-600/40 block"
    >
      {/* Teams */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <TeamChip name={match.home_team_name} color={match.home_team_color} />
        <div className="flex items-center gap-2 font-mono font-bold text-lg"
             style={{ color: 'var(--text-primary)' }}>
          <span>{match.home_score}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>–</span>
          <span>{match.away_score}</span>
        </div>
        <TeamChip name={match.away_team_name} color={match.away_team_color} reverse />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {match.competition && (
          <span className="text-xs px-2 py-0.5 rounded hidden sm:block"
                style={{ background: 'var(--navy-700)', color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }}>
            {match.competition}
          </span>
        )}
        {match.match_date && (
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {new Date(match.match_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
          </span>
        )}

        {/* Status / action icon */}
        {variant === 'live' && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded"
               style={{ background: 'rgba(132,204,22,.12)', border: '1px solid rgba(132,204,22,.3)' }}>
            <div className="live-dot" style={{ width: 6, height: 6 }} />
            <span className="text-xs font-mono" style={{ color: 'var(--lime-400)' }}>VIVO</span>
          </div>
        )}
        {variant === 'upcoming' && (
          <Clock size={16} style={{ color: 'var(--text-muted)' }} />
        )}
        {variant === 'closed' && (
          <BarChart3 size={16} style={{ color: 'var(--text-muted)' }} />
        )}
      </div>
    </Link>
  );
}

function TeamChip({ name, color, reverse }: { name: string; color: string; reverse?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${reverse ? 'flex-row-reverse' : ''}`}>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-sm truncate max-w-[120px]" style={{ color: 'var(--text-secondary)' }}>{name}</span>
    </div>
  );
}

export async function generateMetadata({ params }: MatchesPageProps) {
  const { orgSlug } = await params;
  return { title: `Partidos — ${orgSlug}` };
}
