import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { MaxWidthContainer, ResponsiveGrid, Stack } from '@/components/ui/responsive-grid';
import { computeScore } from '@/domain/events';
import { selectHomeTeam, useMatchStore } from '@/lib/store';
import { deleteMatchFromServer } from '@/lib/sync';
import { useT } from '@/lib/i18n';
import { usePlan, hasVideoAndAI } from '@/lib/use-plan';
import { isClubReadOnly } from '@/lib/club-context';
import { LiveBanner, MatchCard } from './match-cards';
import { NewMatchDialog, type NewMatchValues } from './new-match-dialog';
import { SeasonSummary } from './season-summary';

export const MatchesPage = () => {
  const navigate = useNavigate();
  const [showNewMatch, setShowNewMatch] = useState(false);
  const t = useT();
  const planInfo = usePlan();
  const { plan, matchCount, matchLimit } = planInfo;
  const isFreeAtLimit = plan === 'free' && matchLimit > 0 && matchCount >= matchLimit;
  const videoAccess = hasVideoAndAI(planInfo);

  const teams       = useMatchStore((s) => s.teams);
  const homeTeam    = useMatchStore(selectHomeTeam);
  const status      = useMatchStore((s) => s.status);
  const liveMatch   = useMatchStore((s) => s.liveMatch);
  const liveEvents  = useMatchStore((s) => s.liveEvents);
  const completed   = useMatchStore((s) => s.completed);
  const startLive   = useMatchStore((s) => s.startLive);
  const removeCompleted = useMatchStore((s) => s.removeCompleted);
  const syncing = useMatchStore((s) => s.syncing);

  // 👁️ Contexto de club con rol solo lectura: sin crear ni borrar
  const readOnlyClub = isClubReadOnly();

  const myTeamName = homeTeam?.name ?? 'Mi equipo';
  const liveScore = useMemo(() => computeScore(liveEvents), [liveEvents]);
  const seasonYear = new Date().getFullYear();

  const handleStartMatch = (v: NewMatchValues) => {
    const team = teams.find((tm) => tm.id === v.teamId);
    if (!team) return;
    startLive({
      home: team.name,
      away: v.awayName,
      homeColor: team.color,
      awayColor: '#64748B',
      competition: v.competition,
      round: v.round || null,
      date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
    });
    setShowNewMatch(false);
    navigate('/app/live');
  };

  const handleDelete = (id: string) => {
    if (readOnlyClub) return;
    if (window.confirm(t.common_delete_match)) {
      removeCompleted(id);
      // Also delete from Supabase so it doesn't come back on refresh
      deleteMatchFromServer(id);
    }
  };

  return (
    <MaxWidthContainer>
      <Stack gap="lg" className="pb-4">
        <header className="flex items-start justify-between flex-col md:flex-row md:gap-4">
          <div>
            <div className="text-[10px] font-semibold tracking-[3px] uppercase text-primary mb-1">
              StatzPro
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">{t.matches_title}</h1>
            <p className="text-xs text-muted-fg mt-1">{t.matches_season} {seasonYear}</p>
          </div>
          {status === 'idle' && !readOnlyClub && (
            teams.length === 0 ? (
              <Button size="sm" variant="secondary" onClick={() => navigate('/app/teams')}>
                {t.matches_load_team}
              </Button>
            ) : isFreeAtLimit ? (
              <Button size="sm" onClick={() => navigate('/app/plans')} className="bg-amber-600 hover:bg-amber-700 text-white">
                ⚡ Pasate a Pro
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowNewMatch(true)}>
                <PlusIcon /> {t.matches_new}
              </Button>
            )
          )}
        </header>

        {/* Free plan limit banner */}
        {plan === 'free' && matchLimit > 0 && (
          <FreePlanBanner
            count={matchCount}
            limit={matchLimit}
            atLimit={isFreeAtLimit}
            onUpgrade={() => navigate('/app/plans')}
          />
        )}

        {completed.length > 0 && (
          <SeasonSummary completedMatches={completed} myTeamName={myTeamName} />
        )}

        {status === 'live' && (
          <LiveBanner
            home={liveMatch.home}
            away={liveMatch.away}
            homeScore={liveScore.h}
            awayScore={liveScore.a}
            onResume={() => navigate('/app/live')}
          />
        )}

        {syncing && completed.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-fg">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Sincronizando tus partidos…
          </div>
        )}

        {!syncing && status === 'idle' && completed.length === 0 && (
          teams.length === 0 ? (
            <EmptyState
              icon={<BallIcon />}
              title={t.teams_empty_title}
              description={t.teams_empty_desc}
              action={<Button onClick={() => navigate('/app/teams')}>{t.common_go_teams}</Button>}
            />
          ) : (
            <EmptyState
              icon={<BallIcon />}
              title={t.matches_empty_title}
              description={t.matches_empty_desc}
              action={
                <Button onClick={() => setShowNewMatch(true)}>
                  <PlusIcon /> {t.matches_new_match}
                </Button>
              }
            />
          )
        )}

        {completed.length > 0 && (
          <section>
            <div className="text-[10px] font-semibold tracking-[2px] uppercase text-muted-fg mb-3">
              {t.matches_history}
            </div>
            <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap="md">
              {completed.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  myTeamName={myTeamName}
                  onAnalyze={() => navigate(`/app/analysis/${m.id}`)}
                  onViewEvolution={() => navigate(`/app/evolution?match=${m.id}`)}
                  onVideo={() => {
                    if (videoAccess) {
                      navigate(`/app/video/${m.id}`);
                    } else {
                      navigate('/app/plans');
                    }
                  }}
                  hasVideoAccess={videoAccess}
                  onDelete={() => handleDelete(m.id)}
                />
              ))}
            </ResponsiveGrid>
          </section>
        )}

        <NewMatchDialog
          open={showNewMatch}
          onClose={() => setShowNewMatch(false)}
          teams={teams}
          onStart={handleStartMatch}
        />
      </Stack>
    </MaxWidthContainer>
  );
};

// ─── Inline icons (no emoji per design system) ────────────────────────
const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const BallIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
  </svg>
);

// ─── Banner del plan Free ──────────────────────────────────────
const FreePlanBanner = ({
  count, limit, atLimit, onUpgrade,
}: {
  count: number;
  limit: number;
  atLimit: boolean;
  onUpgrade: () => void;
}) => {
  const remaining = Math.max(0, limit - count);
  const percentage = Math.min(100, (count / limit) * 100);

  if (atLimit) {
    return (
      <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-4 flex items-center gap-3">
        <div className="text-2xl">⚠</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-300">Llegaste al límite del plan Free</p>
          <p className="text-xs text-amber-200/80 mt-0.5">
            Ya registraste {count} de {limit} partidos. Pasate a Pro para registrar partidos ilimitados.
          </p>
        </div>
        <Button size="sm" onClick={onUpgrade} className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap">
          Ver planes →
        </Button>
      </div>
    );
  }

  // Solo mostramos el banner si está cerca del límite (3 o menos restantes)
  if (remaining > 3) return null;

  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
      <div className="flex items-center gap-3">
        <div className="text-lg">⚡</div>
        <div className="flex-1">
          <p className="text-xs font-medium text-yellow-300">
            Te quedan {remaining} partidos en el plan Free
          </p>
          <div className="h-1.5 mt-1.5 bg-yellow-500/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onUpgrade}
          className="text-xs text-yellow-300 hover:text-yellow-200 font-medium whitespace-nowrap"
        >
          Pasate a Pro →
        </button>
      </div>
    </div>
  );
};
