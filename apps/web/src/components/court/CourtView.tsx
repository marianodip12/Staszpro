'use client';

/**
 * CourtView — Interactive handball court with 10 selectable zones.
 *
 * Migrated from Handball Pro + redesigned for the unified platform.
 * Zones light up on hover, animate on selection.
 * Heatmap mode: zones fill with intensity based on event counts.
 */

import { useCallback } from 'react';
import type { CourtZoneId, ZoneCounts } from '@sportiq/core/handball';

interface Zone {
  id:   CourtZoneId;
  label: string;
  d:    string;        // SVG path
  cx:   number;        // label center x
  cy:   number;        // label center y
}

// SVG viewBox: 0 0 400 240 (half-court, attacking direction left→right)
// Zones are positioned on the attacking half (right side of court)
const ZONES: Zone[] = [
  {
    id: 'extreme_left',
    label: 'EI',
    d: 'M200,0 L200,50 L240,70 L280,50 L280,0 Z',
    cx: 240, cy: 25,
  },
  {
    id: 'lateral_left',
    label: 'LI',
    d: 'M240,70 L200,50 L200,130 L230,140 L260,120 Z',
    cx: 225, cy: 100,
  },
  {
    id: 'center_above',
    label: 'CA',
    d: 'M260,120 L230,140 L230,160 L290,160 L310,120 Z',
    cx: 270, cy: 142,
  },
  {
    id: 'lateral_right',
    label: 'LD',
    d: 'M310,120 L290,160 L290,190 L330,190 L370,150 L370,100 Z',
    cx: 335, cy: 148,
  },
  {
    id: 'extreme_right',
    label: 'ED',
    d: 'M370,100 L370,190 L400,190 L400,100 Z',
    cx: 385, cy: 145,
  },
  {
    id: 'near_left',
    label: 'CI',
    d: 'M230,140 L200,130 L200,200 L240,200 L240,160 Z',
    cx: 220, cy: 175,
  },
  {
    id: 'near_center',
    label: 'PIV',
    d: 'M240,160 L240,200 L290,200 L290,160 Z',
    cx: 265, cy: 182,
  },
  {
    id: 'near_right',
    label: 'CD',
    d: 'M290,160 L290,200 L330,200 L330,190 L310,120 Z',
    cx: 310, cy: 180,
  },
  {
    id: '7m',
    label: '7M',
    d: 'M180,100 L200,100 L200,140 L180,140 Z',
    cx: 190, cy: 120,
  },
  {
    id: 'long_range',
    label: 'LR',
    d: 'M0,0 L200,0 L200,240 L0,240 Z',
    cx: 100, cy: 120,
  },
];

// ─── Intensity color scale ─────────────────────────────────────────────────────

function intensityColor(count: number, maxCount: number): string {
  if (maxCount === 0 || count === 0) return 'rgba(37,99,235,0)';
  const t = Math.min(count / maxCount, 1);
  // Blue → Lime gradient
  const r = Math.round(37  + t * (132 - 37));
  const g = Math.round(99  + t * (204 - 99));
  const b = Math.round(235 + t * (22  - 235));
  return `rgba(${r},${g},${b},${0.15 + t * 0.55})`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CourtViewProps {
  /** Currently selected zone (null = no selection) */
  selectedZone?:   CourtZoneId | null;
  /** Callback when a zone is clicked */
  onZoneClick?:    (zone: CourtZoneId) => void;
  /** Heat counts for heatmap rendering */
  heatCounts?:     ZoneCounts;
  /** If true, renders in read-only heatmap mode */
  heatmapMode?:    boolean;
  /** Visual size */
  size?:           'sm' | 'md' | 'lg';
  /** Which team's half to emphasize */
  team?:           'home' | 'away';
  className?:      string;
}

export function CourtView({
  selectedZone,
  onZoneClick,
  heatCounts    = {},
  heatmapMode   = false,
  size          = 'md',
  team          = 'home',
  className     = '',
}: CourtViewProps) {
  const maxCount = Math.max(...Object.values(heatCounts).map(Number), 1);

  const handleZoneClick = useCallback((zoneId: CourtZoneId) => {
    if (!heatmapMode) onZoneClick?.(zoneId);
  }, [heatmapMode, onZoneClick]);

  const sizeClass = size === 'sm' ? 'max-w-xs' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  return (
    <div className={`w-full ${sizeClass} ${className}`}>
      <svg
        viewBox="0 0 400 240"
        className="w-full h-auto"
        style={{ overflow: 'visible' }}
        aria-label="Cancha de balonmano — seleccioná una zona"
      >
        {/* Court background */}
        <rect width="400" height="240" rx="4"
              fill="var(--navy-700)" stroke="var(--surface-border)" strokeWidth="1" />

        {/* Center line */}
        <line x1="200" y1="0" x2="200" y2="240"
              stroke="var(--surface-border)" strokeWidth="1.5" strokeDasharray="4 3" />

        {/* Goal area arc (6m) */}
        <path d="M200,80 A80,80 0 0,1 200,160"
              fill="none" stroke="rgba(37,99,235,.3)" strokeWidth="1" />

        {/* 9m line */}
        <path d="M200,40 A140,140 0 0,1 200,200"
              fill="none" stroke="rgba(37,99,235,.15)" strokeWidth="1" strokeDasharray="5 4" />

        {/* Goal (right side) */}
        <rect x="394" y="95" width="6" height="50" rx="1"
              fill="var(--navy-500)" stroke="var(--slate-400)" strokeWidth="1" />
        <line x1="394" y1="95" x2="380" y2="95" stroke="var(--slate-500)" strokeWidth="1" />
        <line x1="394" y1="145" x2="380" y2="145" stroke="var(--slate-500)" strokeWidth="1" />

        {/* Zones */}
        {ZONES.map((zone) => {
          const isSelected = selectedZone === zone.id;
          const count      = heatCounts[zone.id] ?? 0;
          const heatColor  = heatmapMode ? intensityColor(count, maxCount) : 'transparent';

          return (
            <g
              key={zone.id}
              onClick={() => handleZoneClick(zone.id)}
              style={{ cursor: heatmapMode ? 'default' : 'pointer' }}
              role={heatmapMode ? undefined : 'button'}
              aria-label={`Zona ${zone.label}${count > 0 ? ` — ${count} eventos` : ''}`}
            >
              <path
                d={zone.d}
                fill={
                  isSelected
                    ? 'rgba(37,99,235,.35)'
                    : heatmapMode
                      ? heatColor
                      : 'transparent'
                }
                stroke={isSelected ? 'var(--blue-500)' : 'rgba(255,255,255,.06)'}
                strokeWidth={isSelected ? 1.5 : 1}
                className="transition-all duration-150"
                style={{
                  filter: isSelected ? 'drop-shadow(0 0 6px rgba(37,99,235,.5))' : 'none',
                }}
              />

              {/* Hover fill (non-heatmap) */}
              {!heatmapMode && (
                <path
                  d={zone.d}
                  fill="transparent"
                  className="hover:fill-blue-500/10 transition-colors duration-100"
                />
              )}

              {/* Zone label */}
              <text
                x={zone.cx} y={zone.cy}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={zone.id === 'long_range' ? '10' : '9'}
                fontFamily="var(--font-mono)"
                fontWeight="700"
                fill={isSelected ? 'var(--blue-300)' : 'rgba(255,255,255,.3)'}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {zone.label}
              </text>

              {/* Count badge in heatmap mode */}
              {heatmapMode && count > 0 && (
                <text
                  x={zone.cx} y={zone.cy + 12}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="8"
                  fontFamily="var(--font-mono)"
                  fill="rgba(255,255,255,.7)"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}

        {/* Team label */}
        <text x="100" y="228" textAnchor="middle"
              fontSize="9" fontFamily="var(--font-mono)"
              fill="var(--text-muted)" style={{ userSelect: 'none' }}>
          PROPIO
        </text>
        <text x="300" y="228" textAnchor="middle"
              fontSize="9" fontFamily="var(--font-mono)"
              fill="var(--text-muted)" style={{ userSelect: 'none' }}>
          ATAQUE
        </text>
      </svg>
    </div>
  );
}
