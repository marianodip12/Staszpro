import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TURNOVER_REASONS } from '@/domain/constants';
import { buildTurnoverBreakdown, type TurnoverReasonKey } from '@/domain/stats';
import type { HandballEvent, Team } from '@/domain/types';

const REASON_LABEL: Record<TurnoverReasonKey, string> = {
  steal: TURNOVER_REASONS.steal.label,
  bad_pass: TURNOVER_REASONS.bad_pass.label,
  bad_reception: TURNOVER_REASONS.bad_reception.label,
  steps: TURNOVER_REASONS.steps.label,
  offensive_foul: TURNOVER_REASONS.offensive_foul.label,
  unknown: 'Sin especificar',
};
const REASON_ICON: Record<TurnoverReasonKey, string> = {
  steal: TURNOVER_REASONS.steal.icon,
  bad_pass: TURNOVER_REASONS.bad_pass.icon,
  bad_reception: TURNOVER_REASONS.bad_reception.icon,
  steps: TURNOVER_REASONS.steps.icon,
  offensive_foul: TURNOVER_REASONS.offensive_foul.icon,
  unknown: '❓',
};

interface Props {
  events: HandballEvent[];
  home: string;
  away: string;
  homeColor: string;
  awayColor: string;
  /** Si está seteado, la lista por jugador se limita a ese equipo. */
  teamFilter: Team | null;
}

export const TurnoverReasonBreakdown = ({
  events, home, away, homeColor, awayColor, teamFilter,
}: Props) => {
  const bd = useMemo(() => buildTurnoverBreakdown(events), [events]);

  if (bd.homeTotal === 0 && bd.awayTotal === 0) {
    return <p className="text-center text-xs text-muted-fg py-4">Sin pérdidas registradas</p>;
  }

  const players = teamFilter
    ? bd.byPlayer.filter((p) => p.team === teamFilter)
    : bd.byPlayer;

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        {/* Por motivo, ambos equipos */}
        <div className="space-y-1.5">
          {bd.order.map((r) => {
            const h = bd.home[r];
            const a = bd.away[r];
            if (h === 0 && a === 0) return null;
            const max = Math.max(bd.homeTotal, bd.awayTotal, 1);
            return (
              <div key={r} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[11px]">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="h-2 rounded-sm" style={{ width: `${(h / max) * 60}px`, background: homeColor, opacity: h ? 1 : 0.15 }} />
                  <span className="tabular text-fg w-4 text-right">{h}</span>
                </div>
                <span className="text-muted-fg whitespace-nowrap px-1">
                  {REASON_ICON[r]} {REASON_LABEL[r]}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="tabular text-fg w-4">{a}</span>
                  <div className="h-2 rounded-sm" style={{ width: `${(a / max) * 60}px`, background: awayColor, opacity: a ? 1 : 0.15 }} />
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-fg pt-1 border-t border-border">
            <span className="text-right truncate">{home} · {bd.homeTotal}</span>
            <span className="px-1">Total</span>
            <span className="truncate">{away} · {bd.awayTotal}</span>
          </div>
        </div>

        {/* Por jugador */}
        {players.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">Por jugador</div>
            <ul className="divide-y divide-border">
              {players.map((p) => (
                <li key={`${p.name}:${p.number}`} className="flex items-center gap-2 py-1.5 text-[11px]">
                  <span className="tabular text-muted-fg w-6">#{p.number}</span>
                  <span className="flex-1 min-w-0 truncate text-fg">{p.name}</span>
                  <span className="flex items-center gap-1 text-muted-fg">
                    {bd.order.map((r) =>
                      p.byReason[r] > 0 ? (
                        <span key={r} title={REASON_LABEL[r]} className="whitespace-nowrap">
                          {REASON_ICON[r]}{p.byReason[r]}
                        </span>
                      ) : null,
                    )}
                  </span>
                  <span className="tabular font-semibold text-fg w-5 text-right">{p.total}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
