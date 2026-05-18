'use client';

/**
 * GoalGrid — 3×3 goal quadrant selector with post/out options.
 * Migrated from Handball Pro GoalGrid, unified design system.
 */

import type { GoalQuadrantId, GoalZoneId } from '@sportiq/core/handball';

const QUADRANTS: Array<{ id: GoalQuadrantId; row: number; col: number }> = [
  { id: 'tl', row: 0, col: 0 }, { id: 'tc', row: 0, col: 1 }, { id: 'tr', row: 0, col: 2 },
  { id: 'ml', row: 1, col: 0 }, { id: 'mc', row: 1, col: 1 }, { id: 'mr', row: 1, col: 2 },
  { id: 'bl', row: 2, col: 0 }, { id: 'bc', row: 2, col: 1 }, { id: 'br', row: 2, col: 2 },
];

const CELL = 48;   // px per cell
const PAD  = 6;
const W    = CELL * 3 + PAD * 2;
const H    = CELL * 3 + PAD * 2;

interface GoalGridProps {
  selected?:    GoalZoneId | null;
  counts?:      Partial<Record<GoalZoneId, number>>;
  onSelect?:    (zone: GoalZoneId) => void;
  showMeta?:    boolean;   // show post + out options
  readonly?:    boolean;
  className?:   string;
}

const MAX_INTENSITY = 5;

function cellColor(count: number): string {
  if (!count) return 'transparent';
  const t = Math.min(count / MAX_INTENSITY, 1);
  return `rgba(37,99,235,${0.12 + t * 0.5})`;
}

export function GoalGrid({
  selected, counts = {}, onSelect, showMeta = true, readonly = false, className = '',
}: GoalGridProps) {
  return (
    <div className={`inline-flex flex-col gap-1 items-center ${className}`}>
      {/* Main 3×3 grid */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-label="Cuadrícula del arco">
        {/* Goal frame */}
        <rect x={PAD} y={PAD} width={CELL * 3} height={CELL * 3}
              fill="var(--navy-700)" stroke="var(--slate-500)" strokeWidth="2" rx="2" />

        {/* Grid lines */}
        {[1, 2].map((i) => (
          <g key={i}>
            <line x1={PAD + CELL * i} y1={PAD} x2={PAD + CELL * i} y2={PAD + CELL * 3}
                  stroke="var(--surface-border)" strokeWidth="1" />
            <line x1={PAD} y1={PAD + CELL * i} x2={PAD + CELL * 3} y2={PAD + CELL * i}
                  stroke="var(--surface-border)" strokeWidth="1" />
          </g>
        ))}

        {/* Quadrant cells */}
        {QUADRANTS.map(({ id, row, col }) => {
          const x      = PAD + col * CELL;
          const y      = PAD + row * CELL;
          const isSelected = selected === id;
          const count  = counts[id] ?? 0;

          return (
            <g key={id} onClick={() => !readonly && onSelect?.(id)}
               style={{ cursor: readonly ? 'default' : 'pointer' }}>
              <rect
                x={x + 1} y={y + 1} width={CELL - 2} height={CELL - 2}
                fill={isSelected ? 'rgba(37,99,235,.5)' : cellColor(count)}
                stroke={isSelected ? 'var(--blue-400)' : 'transparent'}
                strokeWidth="1.5"
                rx="2"
                className="transition-all duration-100"
                style={{ filter: isSelected ? 'drop-shadow(0 0 4px rgba(37,99,235,.6))' : 'none' }}
              />
              {/* Hover overlay */}
              {!readonly && (
                <rect x={x + 1} y={y + 1} width={CELL - 2} height={CELL - 2}
                      fill="transparent" rx="2"
                      className="hover:fill-white/5 transition-colors" />
              )}
              {count > 0 && (
                <text x={x + CELL / 2} y={y + CELL / 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="13" fontFamily="var(--font-mono)" fontWeight="700"
                      fill={isSelected ? 'white' : 'var(--blue-300)'}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  {count}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Post + Out meta buttons */}
      {showMeta && (
        <div className="flex gap-2 mt-1">
          {(['post', 'out'] as const).map((meta) => {
            const isSelected = selected === meta;
            const count      = counts[meta] ?? 0;
            return (
              <button
                key={meta}
                onClick={() => !readonly && onSelect?.(meta)}
                disabled={readonly}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all"
                style={{
                  background: isSelected ? 'rgba(37,99,235,.25)' : 'var(--navy-700)',
                  color:      isSelected ? 'var(--blue-300)'      : 'var(--text-muted)',
                  border:     `1px solid ${isSelected ? 'var(--blue-500)' : 'var(--surface-border)'}`,
                }}
              >
                {meta.toUpperCase()}
                {count > 0 && (
                  <span className="opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
