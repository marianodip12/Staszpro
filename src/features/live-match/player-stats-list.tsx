import { useMemo } from 'react';
import type { HandballEvent, Team } from '@/domain/types';
import { cn } from '@/lib/cn';

interface PlayerStat {
  name: string;
  number: number | null;
  goals: number;
  shots: number;
  saves: number;     // si es arquero
  goalsAg: number;   // goles recibidos (si es arquero)
  pct: number;       // % efectividad goleador
  savePct: number;   // % atajadas
  isGK: boolean;
}

const SHOT_TYPES = new Set(['goal', 'miss', 'saved', 'post']);

interface PlayerStatsListProps {
  events: HandballEvent[];
  team: Team;
  teamName: string;
  teamColor: string;
}

/**
 * Lista de stats por jugador — para el equipo seleccionado.
 * Muestra eficacia, goles/tiros para tiradores, y % atajadas para arqueros.
 */
export const PlayerStatsList = ({ events, team, teamName, teamColor }: PlayerStatsListProps) => {
  const stats = useMemo(() => computePlayerStats(events, team), [events, team]);

  const shooters = stats.filter((s) => !s.isGK && s.shots > 0).sort((a, b) => b.goals - a.goals || b.shots - a.shots);
  const goalkeepers = stats.filter((s) => s.isGK).sort((a, b) => b.saves - a.saves);

  if (shooters.length === 0 && goalkeepers.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">
          Stats por jugador
        </p>
        <span className="text-[10px] text-muted-fg flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: teamColor }} />
          {teamName}
        </span>
      </div>

      {/* Goleadores */}
      {shooters.length > 0 && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="px-3 py-1.5 bg-surface-2/40 text-[10px] uppercase tracking-widest text-muted-fg font-semibold">
            ⚽ Goleadores
          </div>
          <div className="divide-y divide-border/50">
            {shooters.map((p) => (
              <PlayerRow key={`sh-${p.name}-${p.number}`} player={p} mode="shooter" />
            ))}
          </div>
        </div>
      )}

      {/* Arqueros */}
      {goalkeepers.length > 0 && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="px-3 py-1.5 bg-surface-2/40 text-[10px] uppercase tracking-widest text-muted-fg font-semibold">
            🧤 Arqueros
          </div>
          <div className="divide-y divide-border/50">
            {goalkeepers.map((p) => (
              <PlayerRow key={`gk-${p.name}-${p.number}`} player={p} mode="goalkeeper" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const PlayerRow = ({ player, mode }: { player: PlayerStat; mode: 'shooter' | 'goalkeeper' }) => {
  const pct = mode === 'shooter' ? player.pct : player.savePct;
  const pctColor =
    pct >= 60 ? 'text-green-400' :
    pct >= 40 ? 'text-yellow-400' :
    'text-red-400';

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="w-7 h-7 rounded-full bg-surface-2 grid place-items-center text-[11px] font-bold tabular border border-border shrink-0">
        {player.number ?? '?'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{player.name}</p>
        {mode === 'shooter' ? (
          <p className="text-[10px] text-muted-fg">
            {player.goals}/{player.shots} tiros
          </p>
        ) : (
          <p className="text-[10px] text-muted-fg">
            {player.saves} atajadas · {player.goalsAg} goles recibidos
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={cn('font-mono font-bold text-sm tabular', pctColor)}>
          {pct}%
        </p>
        <p className="text-[9px] text-muted-fg uppercase tracking-wider">
          {mode === 'shooter' ? 'Efic.' : 'Atajadas'}
        </p>
      </div>
    </div>
  );
};

// ─── Cómputo ──────────────────────────────────────────────────────
function computePlayerStats(events: HandballEvent[], team: Team): PlayerStat[] {
  const map = new Map<string, PlayerStat>();
  const upsert = (key: string, ref: { name: string; number: number | null }, isGK: boolean) => {
    if (!map.has(key)) {
      map.set(key, {
        name: ref.name,
        number: ref.number,
        goals: 0,
        shots: 0,
        saves: 0,
        goalsAg: 0,
        pct: 0,
        savePct: 0,
        isGK,
      });
    }
    return map.get(key)!;
  };

  for (const ev of events) {
    if (!SHOT_TYPES.has(ev.type)) continue;

    // Stats del shooter (si tira el equipo seleccionado)
    if (ev.team === team && ev.shooter?.name) {
      const key = `sh-${ev.shooter.name}-${ev.shooter.number ?? 0}`;
      const p = upsert(key, ev.shooter, false);
      p.shots += 1;
      if (ev.type === 'goal') p.goals += 1;
    }

    // Stats del arquero (si recibe tiro del equipo contrario)
    if (ev.team !== team && ev.goalkeeper?.name) {
      const key = `gk-${ev.goalkeeper.name}-${ev.goalkeeper.number ?? 0}`;
      const p = upsert(key, ev.goalkeeper, true);
      if (ev.type === 'saved') p.saves += 1;
      if (ev.type === 'goal') p.goalsAg += 1;
    }
  }

  // Calcular porcentajes
  for (const p of map.values()) {
    if (p.shots > 0) p.pct = Math.round((p.goals / p.shots) * 100);
    const totalGK = p.saves + p.goalsAg;
    if (totalGK > 0) p.savePct = Math.round((p.saves / totalGK) * 100);
  }

  return Array.from(map.values());
}
