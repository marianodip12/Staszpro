import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { buildMinutesPlayed } from '@/domain/stats';
import type { HandballEvent, HandballTeam } from '@/domain/types';

interface Props {
  events: HandballEvent[];
  /** Equipo local (los snapshots de formación son solo de 'home'). */
  homeTeam: HandballTeam | null;
  homeColor: string;
  /** Minuto final del partido (para cerrar el último intervalo). */
  endMinute?: number;
}

/**
 * Minutos en cancha por jugador — solo aparece si el partido se cargó en
 * Modo Super Completo (hay snapshots de formación). Si no, devuelve null.
 */
export const MinutesPlayedPanel = ({ events, homeTeam, homeColor, endMinute }: Props) => {
  const rows = useMemo(() => buildMinutesPlayed(events, endMinute), [events, endMinute]);
  if (rows.length === 0) return null;

  const nameOf = (num: number) =>
    homeTeam?.players.find((p) => p.number === num)?.name ?? `#${num}`;
  const max = rows[0]?.minutes || 1;

  return (
    <section>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-xs font-medium text-fg">⏱️ Minutos en cancha</h3>
        <span className="text-[10px] text-muted-fg">{homeTeam?.name ?? 'Local'}</span>
      </div>
      <Card>
        <CardContent className="p-3">
          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li key={r.number} className="flex items-center gap-2 text-[11px]">
                <span className="tabular text-muted-fg w-6 flex-shrink-0">#{r.number}</span>
                <span className="flex-1 min-w-0 truncate text-fg">{nameOf(r.number)}</span>
                <div className="w-24 h-2 rounded-sm bg-surface-2 overflow-hidden flex-shrink-0">
                  <div className="h-full rounded-sm" style={{ width: `${(r.minutes / max) * 100}%`, background: homeColor }} />
                </div>
                <span className="tabular font-semibold text-fg w-10 text-right flex-shrink-0">{r.minutes}′</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-fg mt-2 leading-relaxed">
            Estimado a partir de los cambios de formación registrados. El tiempo previo
            al primer cambio cargado no se cuenta.
          </p>
        </CardContent>
      </Card>
    </section>
  );
};
