import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { isSupabaseReady, supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

/**
 * LIGA — tabla de posiciones de la temporada.
 * El usuario configura su liga (equipos y fechas), carga resultados por
 * fecha, y la tabla se calcula con el sistema W=3, E=2, P=1.
 * Persistencia: una fila por usuario en public.leagues (jsonb), con
 * guardado debounced.
 */

interface LeagueResult {
  id: string;
  round: number;
  home: string;
  away: string;
  hs: number;
  as: number;
}

interface League {
  name: string;
  rounds: number;
  teams: string[];
  results: LeagueResult[];
}

interface LeagueViewProps {
  myTeamName: string;
}

export const LeagueView = ({ myTeamName }: LeagueViewProps) => {
  const [league, setLeague] = useState<League | null | 'loading'>('loading');
  const [round, setRound] = useState(1);
  const [tab, setTab] = useState<'table' | 'load'>('table');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cargar liga del server ──
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isSupabaseReady()) { setLeague(null); return; }
      const { data } = await supabase.from('leagues').select('*').maybeSingle();
      if (cancelled) return;
      if (data) {
        setLeague({
          name: data.name,
          rounds: data.rounds,
          teams: (data.teams as string[]) ?? [],
          results: (data.results as LeagueResult[]) ?? [],
        });
      } else {
        setLeague(null);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // ── Guardado debounced ──
  const persist = (next: League) => {
    setLeague(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await supabase.from('leagues').upsert({
          user_id: session.user.id,
          name: next.name,
          rounds: next.rounds,
          teams: next.teams,
          results: next.results,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      })();
    }, 800);
  };

  if (league === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-fg">
        <span className="inline-block w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Cargando liga…
      </div>
    );
  }

  if (league === null) {
    return <LeagueSetup myTeamName={myTeamName} onCreate={persist} />;
  }

  return (
    <div className="space-y-3">
      {/* Header liga */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">🏆 {league.name}</h3>
          <p className="text-[10px] text-muted-fg">
            {league.teams.length} equipos · {league.rounds} fechas · {league.results.length} resultados cargados
          </p>
        </div>
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setTab('table')}
            className={cn('px-3 py-1.5 text-[11px] font-medium transition-colors',
              tab === 'table' ? 'bg-primary/15 text-primary' : 'text-muted-fg hover:text-fg')}
          >
            Tabla
          </button>
          <button
            type="button"
            onClick={() => setTab('load')}
            className={cn('px-3 py-1.5 text-[11px] font-medium transition-colors',
              tab === 'load' ? 'bg-primary/15 text-primary' : 'text-muted-fg hover:text-fg')}
          >
            Cargar resultados
          </button>
        </div>
      </div>

      {tab === 'table'
        ? <StandingsTable league={league} myTeamName={myTeamName} />
        : <ResultsLoader league={league} round={round} setRound={setRound} onChange={persist} />}
    </div>
  );
};

// ─── Setup inicial ─────────────────────────────────────────────────────
const LeagueSetup = ({ myTeamName, onCreate }: {
  myTeamName: string;
  onCreate: (l: League) => void;
}) => {
  const [name, setName] = useState('Mi Liga 2026');
  const [teamCount, setTeamCount] = useState(16);
  const [rounds, setRounds] = useState(15);
  const [teams, setTeams] = useState<string[]>(() => {
    const t = [myTeamName];
    for (let i = 2; i <= 16; i++) t.push(`Equipo ${i}`);
    return t;
  });

  const applyCount = (n: number) => {
    const count = Math.max(2, Math.min(30, n));
    setTeamCount(count);
    setTeams((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push(`Equipo ${next.length + 1}`);
      return next;
    });
  };

  const handleCreate = () => {
    const clean = teams.map((t) => t.trim()).filter(Boolean);
    if (clean.length < 2) return;
    onCreate({ name: name.trim() || 'Mi Liga', rounds: Math.max(1, rounds), teams: clean, results: [] });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-bold">🏆 Configurar tu liga</h3>
          <p className="text-[11px] text-muted-fg mt-0.5">
            Cargá los equipos y las fechas de tu torneo. Después vas cargando los resultados de cada fecha y la tabla se arma sola (G=3 · E=2 · P=1).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-1">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-bg px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-1">Equipos</label>
            <input
              type="number" min={2} max={30}
              value={teamCount}
              onChange={(e) => applyCount(Number(e.target.value))}
              className="w-full h-9 rounded-md border border-border bg-bg px-2.5 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-1">Fechas</label>
            <input
              type="number" min={1} max={60}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="w-full h-9 rounded-md border border-border bg-bg px-2.5 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-1.5">
            Nombres de los equipos
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {teams.map((t, i) => (
              <input
                key={i}
                value={t}
                onChange={(e) => setTeams((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                className={cn(
                  'h-8 rounded-md border bg-bg px-2 text-xs',
                  t.trim() === myTeamName ? 'border-primary/60 text-primary font-semibold' : 'border-border',
                )}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="w-full h-10 rounded-md bg-primary text-primary-fg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Crear liga
        </button>
      </CardContent>
    </Card>
  );
};

// ─── Carga de resultados por fecha ────────────────────────────────────
const ResultsLoader = ({ league, round, setRound, onChange }: {
  league: League;
  round: number;
  setRound: (r: number) => void;
  onChange: (l: League) => void;
}) => {
  const roundResults = league.results.filter((r) => r.round === round);
  const matchesPerRound = Math.floor(league.teams.length / 2);

  const addResult = () => {
    // Equipos que todavía no jugaron en esta fecha
    const used = new Set(roundResults.flatMap((r) => [r.home, r.away]));
    const free = league.teams.filter((t) => !used.has(t));
    const next: LeagueResult = {
      id: `r-${round}-${Date.now()}`,
      round,
      home: free[0] ?? league.teams[0],
      away: free[1] ?? league.teams[1],
      hs: 0,
      as: 0,
    };
    onChange({ ...league, results: [...league.results, next] });
  };

  const updateResult = (id: string, patch: Partial<LeagueResult>) => {
    onChange({
      ...league,
      results: league.results.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const removeResult = (id: string) => {
    onChange({ ...league, results: league.results.filter((r) => r.id !== id) });
  };

  return (
    <div className="space-y-3">
      {/* Selector de fecha */}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: league.rounds }, (_, i) => i + 1).map((r) => {
          const loaded = league.results.filter((x) => x.round === r).length;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRound(r)}
              className={cn(
                'w-9 h-9 rounded-md border text-[11px] font-mono font-semibold transition-colors relative',
                round === r
                  ? 'border-primary bg-primary/15 text-primary'
                  : loaded >= matchesPerRound
                    ? 'border-goal/40 bg-goal/10 text-goal'
                    : loaded > 0
                      ? 'border-warning/40 bg-warning/10 text-warning'
                      : 'border-border bg-surface-2 text-muted-fg hover:border-primary/40',
              )}
              title={`Fecha ${r}: ${loaded}/${matchesPerRound} resultados`}
            >
              {r}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">
              Fecha {round} · {roundResults.length}/{matchesPerRound} partidos
            </p>
            <button
              type="button"
              onClick={addResult}
              disabled={roundResults.length >= matchesPerRound}
              className="px-2.5 py-1 rounded-md bg-primary/15 border border-primary/40 text-primary text-[11px] font-semibold hover:bg-primary/25 transition-colors disabled:opacity-40"
            >
              + Resultado
            </button>
          </div>

          {roundResults.length === 0 && (
            <p className="text-xs text-muted-fg text-center py-4">
              Sin resultados en esta fecha todavía. Tocá «+ Resultado».
            </p>
          )}

          {roundResults.map((r) => (
            <div key={r.id} className="grid grid-cols-[1fr_44px_14px_44px_1fr_24px] items-center gap-1.5">
              <select
                value={r.home}
                onChange={(e) => updateResult(r.id, { home: e.target.value })}
                className="h-8 rounded-md border border-border bg-bg px-1.5 text-[11px] min-w-0"
              >
                {league.teams.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="number" min={0}
                value={r.hs}
                onChange={(e) => updateResult(r.id, { hs: Math.max(0, Number(e.target.value)) })}
                className="h-8 rounded-md border border-border bg-bg text-center text-xs font-mono tabular"
              />
              <span className="text-center text-muted-fg text-xs">–</span>
              <input
                type="number" min={0}
                value={r.as}
                onChange={(e) => updateResult(r.id, { as: Math.max(0, Number(e.target.value)) })}
                className="h-8 rounded-md border border-border bg-bg text-center text-xs font-mono tabular"
              />
              <select
                value={r.away}
                onChange={(e) => updateResult(r.id, { away: e.target.value })}
                className="h-8 rounded-md border border-border bg-bg px-1.5 text-[11px] min-w-0"
              >
                {league.teams.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                type="button"
                onClick={() => removeResult(r.id)}
                className="text-danger/70 hover:text-danger text-sm"
                title="Borrar resultado"
              >
                ✕
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Tabla de posiciones ───────────────────────────────────────────────
const StandingsTable = ({ league, myTeamName }: { league: League; myTeamName: string }) => {
  const rows = useMemo(() => {
    const acc = new Map<string, { team: string; pj: number; pg: number; pe: number; pp: number; gf: number; gc: number }>();
    for (const t of league.teams) acc.set(t, { team: t, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 });

    for (const r of league.results) {
      const h = acc.get(r.home); const a = acc.get(r.away);
      if (!h || !a || r.home === r.away) continue;
      h.pj++; a.pj++;
      h.gf += r.hs; h.gc += r.as;
      a.gf += r.as; a.gc += r.hs;
      if (r.hs > r.as) { h.pg++; a.pp++; }
      else if (r.hs < r.as) { a.pg++; h.pp++; }
      else { h.pe++; a.pe++; }
    }

    return [...acc.values()]
      .map((x) => ({ ...x, dif: x.gf - x.gc, pts: x.pg * 3 + x.pe * 2 + x.pp }))
      .sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf || a.team.localeCompare(b.team));
  }, [league]);

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[9px] uppercase tracking-wider text-muted-fg border-b border-border">
              <th className="px-2.5 py-2 w-7">#</th>
              <th className="px-1 py-2">Equipo</th>
              <th className="px-1.5 py-2 text-right">PJ</th>
              <th className="px-1.5 py-2 text-right">PG</th>
              <th className="px-1.5 py-2 text-right">PE</th>
              <th className="px-1.5 py-2 text-right">PP</th>
              <th className="px-1.5 py-2 text-right">GF</th>
              <th className="px-1.5 py-2 text-right">GC</th>
              <th className="px-1.5 py-2 text-right">DIF</th>
              <th className="px-2.5 py-2 text-right">PTS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const mine = r.team === myTeamName;
              return (
                <tr
                  key={r.team}
                  className={cn(
                    'border-b border-border/40',
                    mine ? 'bg-primary/10' : 'hover:bg-surface-2/40',
                  )}
                >
                  <td className={cn('px-2.5 py-1.5 font-mono tabular', i < 4 ? 'text-goal font-bold' : 'text-muted-fg')}>
                    {i + 1}
                  </td>
                  <td className={cn('px-1 py-1.5 truncate max-w-[110px]', mine && 'font-bold text-primary')}>
                    {r.team}
                  </td>
                  <td className="px-1.5 py-1.5 text-right font-mono tabular">{r.pj}</td>
                  <td className="px-1.5 py-1.5 text-right font-mono tabular text-goal">{r.pg}</td>
                  <td className="px-1.5 py-1.5 text-right font-mono tabular text-warning">{r.pe}</td>
                  <td className="px-1.5 py-1.5 text-right font-mono tabular text-danger">{r.pp}</td>
                  <td className="px-1.5 py-1.5 text-right font-mono tabular">{r.gf}</td>
                  <td className="px-1.5 py-1.5 text-right font-mono tabular">{r.gc}</td>
                  <td className={cn('px-1.5 py-1.5 text-right font-mono tabular', r.dif > 0 ? 'text-goal' : r.dif < 0 ? 'text-danger' : '')}>
                    {r.dif > 0 ? `+${r.dif}` : r.dif}
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-mono tabular font-bold text-primary">{r.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-[9px] text-muted-fg text-center py-2">
          G=3 pts · E=2 pts · P=1 pt · Desempate: DIF, luego GF
        </p>
      </CardContent>
    </Card>
  );
};
