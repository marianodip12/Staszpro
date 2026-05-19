/**
 * EventRail — Vertical list of match events.
 *
 * Click an event → seek the video to that minute → create a clip suggestion.
 * The currently-playing event (based on video time) is highlighted.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import type { HandballEvent } from '@/domain/types';
import { eventToVideoSeconds } from '@/domain/video';

interface EventRailProps {
  events: HandballEvent[];
  homeTeamName: string;
  awayTeamName: string;
  /** Current video playback time in seconds. */
  currentTime: number;
  /** Optional offset (sec) between match minute 0 and video start. */
  videoOffsetSec?: number;
  /** Called when an event is clicked. The parent should seek and optionally create a clip. */
  onEventClick: (event: HandballEvent, videoTime: number) => void;
  /** Optional callback to create a clip around the event. */
  onCreateClip?: (event: HandballEvent, videoTime: number) => void;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  goal:        'Gol',
  miss:        'Errado',
  saved:       'Atajada',
  post:        'Palo',
  turnover:    'Pérdida',
  timeout:     'Tiempo muerto',
  exclusion:   '2 minutos',
  red_card:    'Roja',
  blue_card:   'Azul',
  yellow_card: 'Amarilla',
  half_time:   'Descanso',
};

const eventTypeTone = (type: string): 'goal' | 'danger' | 'warning' | 'primary' => {
  if (type === 'goal') return 'goal';
  if (type === 'red_card' || type === 'exclusion') return 'danger';
  if (type === 'yellow_card' || type === 'blue_card') return 'warning';
  return 'primary';
};

export const EventRail = ({
  events,
  homeTeamName,
  awayTeamName,
  currentTime,
  videoOffsetSec = 0,
  onEventClick,
  onCreateClip,
}: EventRailProps) => {
  // Sort events by minute ascending
  const sorted = useMemo(
    () => [...events].sort((a, b) => a.min - b.min),
    [events],
  );

  // Find the event closest to current time (within ±15s window) for highlighting
  const activeEventId = useMemo(() => {
    let closest: { id: string; dist: number } | null = null;
    for (const e of sorted) {
      const eventSec = eventToVideoSeconds(e.min, videoOffsetSec);
      const dist = Math.abs(eventSec - currentTime);
      if (dist <= 15 && (closest === null || dist < closest.dist)) {
        closest = { id: e.id, dist };
      }
    }
    return closest?.id ?? null;
  }, [sorted, currentTime, videoOffsetSec]);

  if (events.length === 0) {
    return (
      <div className="text-xs text-muted-fg p-4 text-center">
        No hay eventos registrados en este partido.
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
      {sorted.map((e) => {
        const videoSec = eventToVideoSeconds(e.min, videoOffsetSec);
        const isActive = e.id === activeEventId;
        const teamLabel = e.team === 'home' ? homeTeamName : awayTeamName;
        const typeLabel = EVENT_TYPE_LABELS[e.type] ?? e.type;

        return (
          <div
            key={e.id}
            className={cn(
              'group flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors',
              isActive
                ? 'bg-primary/15 border border-primary/40'
                : 'hover:bg-bg-elevated border border-transparent',
            )}
            onClick={() => onEventClick(e, videoSec)}
          >
            {/* Minute */}
            <div className={cn(
              'text-[10px] font-mono font-semibold w-8 text-center shrink-0',
              isActive ? 'text-primary' : 'text-muted-fg',
            )}>
              {String(e.min).padStart(2, '0')}'
            </div>

            {/* Type badge */}
            <Badge tone={eventTypeTone(e.type)} className="shrink-0">
              {typeLabel}
            </Badge>

            {/* Team + details */}
            <div className="flex-1 min-w-0 text-xs">
              <span className="text-fg font-medium truncate">{teamLabel}</span>
              {e.shooter?.name && (
                <span className="text-muted-fg ml-1">· {e.shooter.name}</span>
              )}
            </div>

            {/* Score */}
            <div className="text-[10px] font-mono text-muted-fg shrink-0">
              {e.hScore}-{e.aScore}
            </div>

            {/* Create clip button */}
            {onCreateClip && (
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onCreateClip(e, videoSec);
                }}
                className={cn(
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary hover:bg-primary/30',
                )}
                title="Crear clip de este evento"
              >
                + Clip
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
