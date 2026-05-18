/**
 * @sportiq/core — Handball sport types.
 *
 * Migrated from: Handball-Pro-main/src/domain/types.ts
 * Extended with: Analizador EVENT_TREE (4-level hierarchy for tactical tagging)
 *
 * These types are specific to handball. Other sports will live in
 * src/sports/soccer/, src/sports/basketball/, etc.
 */

// ─── Court zones ──────────────────────────────────────────────────────────────
// 10 selectable zones on the handball court.

export type CourtZoneId =
  | 'extreme_left'   // Extremo izquierdo
  | 'lateral_left'   // Lateral izquierdo (6–9m)
  | 'center_above'   // Centro (6–9m)
  | 'lateral_right'  // Lateral derecho (6–9m)
  | 'extreme_right'  // Extremo derecho
  | 'near_left'      // Cerca izquierdo (<6m)
  | 'near_center'    // Pivote
  | 'near_right'     // Cerca derecho
  | '7m'             // Penal
  | 'long_range';    // Arco-a-arco

// ─── Goal grid ────────────────────────────────────────────────────────────────
// 9 quadrants inside the goal (3×3 grid) + meta-regions.

export type GoalQuadrantId =
  | 'tl' | 'tc' | 'tr'
  | 'ml' | 'mc' | 'mr'
  | 'bl' | 'bc' | 'br';

export type GoalZoneId = GoalQuadrantId | 'post' | 'out';

export const GOAL_QUADRANT_ORDER: readonly GoalQuadrantId[] = [
  'tl', 'tc', 'tr',
  'ml', 'mc', 'mr',
  'bl', 'bc', 'br',
] as const;

// ─── Event types ──────────────────────────────────────────────────────────────
// Primary categorization used by Handball Pro (stat-focused).

export type HandballEventType =
  | 'goal'
  | 'miss'
  | 'saved'
  | 'post'
  | 'turnover'
  | 'timeout'
  | 'exclusion'   // 2 minutes
  | 'red_card'
  | 'blue_card'
  | 'yellow_card'
  | 'half_time';

export const SHOT_EVENTS: readonly HandballEventType[] = [
  'goal', 'miss', 'saved', 'post',
] as const;

export const isShotEvent = (t: HandballEventType): boolean =>
  (SHOT_EVENTS as readonly string[]).includes(t);

// ─── Tactical event tree ──────────────────────────────────────────────────────
// From Analizador — 4-level hierarchy for deep tactical tagging.
// These map to MatchEvent.type / subtype / detail / qualifier columns.

export type TacticalCategory =
  | 'Gol'
  | 'Gol rival'
  | 'Defensa'
  | 'Ataque'
  | 'Transición'
  | 'Arquero'
  | 'Especiales';

export interface EventNode {
  label:     string;
  emoji?:    string;
  children?: EventNode[];
}

/**
 * Handball tactical event tree.
 * Level 1 → MatchEvent.subtype
 * Level 2 → MatchEvent.detail
 * Level 3 → MatchEvent.qualifier
 */
export const HANDBALL_EVENT_TREE: EventNode[] = [
  { label: 'Gol',       emoji: '🥅' },
  { label: 'Gol rival', emoji: '😤' },
  {
    label: 'Defensa', emoji: '🛡️',
    children: [
      { label: 'Recuperación', children: [
        { label: 'Robo' },
        { label: 'Robo de pique' },
        { label: 'Corte' },
      ]},
      { label: 'Intervención', children: [
        { label: 'Anticipación' },
        { label: 'Relevo' },
        { label: 'Ayuda', children: [
          { label: 'Positiva' },
          { label: 'Negativa' },
        ]},
      ]},
      { label: 'Infracción', children: [
        { label: 'Falta' },
      ]},
    ],
  },
  {
    label: 'Ataque', emoji: '⚔️',
    children: [
      { label: 'Finalización', children: [
        { label: 'Gol' },
        { label: 'Lanzamiento fallado' },
        { label: 'Atajado' },
      ]},
      { label: 'Generación', children: [
        { label: 'Asistencia' },
      ]},
      { label: 'Error', children: [
        { label: 'Pérdida' },
        { label: 'Error de pase' },
        { label: 'Error de recepción' },
        { label: 'Error técnico' },
      ]},
    ],
  },
  {
    label: 'Transición', emoji: '🔄',
    children: [
      { label: 'Transición rápida' },
    ],
  },
  {
    label: 'Arquero', emoji: '🧤',
    children: [
      { label: 'Atajada', children: [
        { label: '6m' },
        { label: '9m' },
        { label: 'Contra' },
        { label: 'Contraataque' },
      ]},
      { label: 'Gol recibido' },
    ],
  },
  {
    label: 'Especiales', emoji: '⚖️',
    children: [
      { label: 'Penal', children: [
        { label: 'Gol' },
        { label: 'Atajado' },
        { label: 'Errado' },
      ]},
      { label: 'Duelo', children: [
        { label: 'Ganado ataque' },
        { label: 'Ganado defensa' },
      ]},
    ],
  },
];

// ─── Context qualifiers ───────────────────────────────────────────────────────

export type Situation  = 'igualdad' | 'superioridad' | 'inferioridad';
export type ThrowType  = 'salto' | 'habilidad' | 'finta' | 'penetracion' | 'otro';

// ─── Person reference (denormalized snapshot in events) ───────────────────────

export interface PersonRef {
  name:   string;
  number: number;
}

// ─── Handball match event (in-memory shape) ───────────────────────────────────
// Mapped from MatchEvent DB rows via events.ts mappers.

export interface HandballEvent {
  id:         string;
  min:        number;
  team:       'home' | 'away';
  type:       HandballEventType;

  zone?:      CourtZoneId | null;
  goalZone?:  GoalZoneId  | null;
  situation?: Situation   | null;
  throwType?: ThrowType   | null;

  shooter?:    PersonRef | null;
  goalkeeper?: PersonRef | null;
  sanctioned?: PersonRef | null;

  /** Score snapshot when event was logged */
  hScore:    number;
  aScore:    number;

  quickMode: boolean;
  completed: boolean;

  /** Media bridge — optional link to a video timestamp */
  videoAssetId?: string | null;
  clipStart?:    number | null;
  clipEnd?:      number | null;
}

// ─── In-memory match summary (for lists / season views) ───────────────────────

export interface MatchSummary {
  id:          string;
  home:        string;
  away:        string;
  hs:          number;
  as:          number;
  date:        string | null;
  competition: string | null;
  homeColor:   string;
  awayColor:   string;
  events:      HandballEvent[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Flatten the event tree into a lookup map: label → path.
 * Useful for displaying breadcrumb labels from stored type/subtype/detail.
 */
export function flattenEventTree(
  nodes: EventNode[],
  path: string[] = [],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const node of nodes) {
    const nodePath = [...path, node.label];
    map.set(node.label, nodePath);
    if (node.children) {
      const childMap = flattenEventTree(node.children, nodePath);
      childMap.forEach((v, k) => map.set(k, v));
    }
  }
  return map;
}
