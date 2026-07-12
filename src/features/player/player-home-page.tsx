import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getMyPersonalStats,
  hasAnyPersonalData,
  getMyRecentMatchesSummary,
} from '@/lib/personal-profile-api';
import { useProfileType } from '@/lib/use-profile-type';

export const PlayerHomePage = () => {
  const navigate = useNavigate();
  const { isPreviewActive } = useProfileType();

  const dataQ = useQuery({
    queryKey: ['personal-has-data'],
    queryFn: hasAnyPersonalData,
  });

  const statsQ = useQuery({
    queryKey: ['personal-stats'],
    queryFn: getMyPersonalStats,
    enabled: dataQ.data === true,
  });

  const recentQ = useQuery({
    queryKey: ['personal-recent'],
    queryFn: () => getMyRecentMatchesSummary(5),
    enabled: dataQ.data === true,
  });

  if (dataQ.isLoading) {
    return (
      <div className="p-8 text-center text-muted-fg text-sm">Cargando…</div>
    );
  }

  if (!dataQ.data) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        {isPreviewActive && <PreviewNotice />}
        <div className="text-5xl mb-4">🥅</div>
        <h1 className="text-2xl font-bold mb-2">Bienvenido</h1>
        <p className="text-sm text-muted-fg mb-6 leading-relaxed">
          Todavía no registraste ningún partido. Arrancá cargando tu primer partido personal.
        </p>
        <button
          type="button"
          onClick={() => navigate('/app/player/load')}
          className="px-6 py-2.5 rounded-md bg-primary text-primary-fg font-semibold text-sm hover:bg-primary/90"
        >
          Cargar mi primer partido
        </button>
      </div>
    );
  }

  const s = statsQ.data;
  const recent = recentQ.data ?? [];

  return (
    <div className="space-y-6">
      {isPreviewActive && <PreviewNotice />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1">Mis estadísticas</h1>
          <p className="text-xs text-muted-fg">Resumen histórico personal</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/app/player/load')}
          className="px-4 py-2 rounded-md bg-primary text-primary-fg font-semibold text-xs hover:bg-primary/90 whitespace-nowrap"
        >
          + Cargar partido
        </button>
      </div>

      {!s ? (
        <p className="text-sm text-muted-fg">Cargando stats…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Partidos"     value={s.matches_played} />
          <StatCard label="Ganados"      value={s.wins}   accent="goal" />
          <StatCard label="Empatados"    value={s.draws} />
          <StatCard label="Perdidos"     value={s.losses} accent="danger" />
          <StatCard label="Goles"        value={s.goals}  accent="primary" />
          <StatCard label="Tiros"        value={s.total_shots} />
          <StatCard label="Efectividad"  value={fmtPct(s.shot_efficiency)} />
          <StatCard label="Asistencias"  value={s.assists} />
          <StatCard label="Pérdidas"     value={s.turnovers} />
          <StatCard label="Exclusiones"  value={s.exclusions} />
          <StatCard label="Amarillas"    value={s.yellows} />
          <StatCard label="Rojas"        value={s.reds} accent="danger" />
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-fg mb-3">
            Últimos partidos
          </h2>
          <div className="space-y-2">
            {recent.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => navigate(`/app/player/match/${m.id}`)}
                className="w-full text-left flex items-center justify-between rounded-md border border-border bg-surface p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">vs {m.opponent}</div>
                  <div className="text-[11px] text-muted-fg">
                    {m.match_date}
                    {m.competition && <> · {m.competition}</>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <ResultBadge result={m.result} />
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold">
                      {m.my_score} · {m.opp_score}
                    </div>
                    <div className="text-[10px] text-muted-fg">
                      {m.my_goals}g · {fmtPct(m.my_efficiency)}
                    </div>
                  </div>
                  <span className="text-muted-fg text-lg">›</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-fg pt-4">
        Registro de partidos y análisis detallado — próximamente.
      </p>
    </div>
  );
};

const PreviewNotice = () => (
  <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-500/90">
    🛡️ Estás viendo esta pantalla como <strong>jugador</strong> desde el modo admin.
  </div>
);

const StatCard = ({
  label, value, accent,
}: {
  label: string;
  value: number | string;
  accent?: 'primary' | 'goal' | 'danger';
}) => {
  const color =
    accent === 'primary' ? 'text-primary' :
    accent === 'goal'    ? 'text-goal'    :
    accent === 'danger'  ? 'text-danger'  : 'text-fg';
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="text-[9px] uppercase tracking-widest text-muted-fg">
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold font-mono ${color}`}>
        {value}
      </div>
    </div>
  );
};

const ResultBadge = ({ result }: { result: 'W' | 'D' | 'L' | '-' }) => {
  const cls =
    result === 'W' ? 'bg-goal/15 text-goal border-goal/40' :
    result === 'L' ? 'bg-danger/15 text-danger border-danger/40' :
    result === 'D' ? 'bg-amber-500/15 text-amber-500 border-amber-500/40' :
                     'bg-surface-2 text-muted-fg border-border';
  const label = result === 'W' ? 'G' : result === 'L' ? 'P' : result === 'D' ? 'E' : '—';
  return (
    <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 ${cls}`}>
      {label}
    </span>
  );
};

const fmtPct = (x: number | null): string =>
  x == null ? '—' : `${Math.round(x * 100)}%`;
