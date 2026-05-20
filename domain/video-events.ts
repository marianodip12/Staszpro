/**
 * Video Analyzer — Event model.
 *
 * Ported 1:1 from the original Handball-analizador project.
 * This is INDEPENDENT from the live-match HandballEvent model:
 *   - Live-match uses simple flat events (goal, miss, saved...) — see domain/types.ts
 *   - Video Analyzer uses this hierarchical 4-level tree
 *
 * Both live in the same DB but in different tables.
 */

// ─── Top-level event types ───────────────────────────────────────────────────

export type EventTipo =
  | 'Gol'
  | 'Gol rival'
  | 'Defensa'
  | 'Ataque'
  | 'Transición'
  | 'Arquero'
  | 'Especiales';

export type EventSubtype  = string | null;
export type EventDetail   = string | null;
export type EventQualifier = 'Positiva' | 'Negativa' | null;
export type EventResult   = 'correcto' | 'incorrecto' | null;

// ─── Event tree (hierarchical) ───────────────────────────────────────────────

export interface EventNode {
  label:    string;
  emoji?:   string;
  children?: EventNode[];
}

export const EVENT_TREE: EventNode[] = [
  { label: 'Gol',        emoji: '🥅' },
  { label: 'Gol rival',  emoji: '😤' },
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

// ─── Visual config per top-level tipo ────────────────────────────────────────

export type EventCategory = 'binary' | 'tree';

export interface EventConfig {
  tipo:        EventTipo;
  category:    EventCategory;
  emoji:       string;
  color:       string;
  bgColor:     string;
  borderColor: string;
  ringColor:   string;
  shortLabel:  string;
}

export const EVENT_CONFIGS: EventConfig[] = [
  { tipo: 'Gol',        category: 'binary', emoji: '🥅', color: 'text-green-400',  bgColor: 'bg-green-500/10 hover:bg-green-500/20',   borderColor: 'border-green-500/40 hover:border-green-400',   ringColor: 'ring-green-500',   shortLabel: 'GOL'        },
  { tipo: 'Gol rival',  category: 'binary', emoji: '😤', color: 'text-red-400',    bgColor: 'bg-red-500/10 hover:bg-red-500/20',       borderColor: 'border-red-500/40 hover:border-red-400',       ringColor: 'ring-red-500',     shortLabel: 'GOL RIVAL'  },
  { tipo: 'Defensa',    category: 'tree',   emoji: '🛡️', color: 'text-cyan-400',   bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20',     borderColor: 'border-cyan-500/40 hover:border-cyan-400',     ringColor: 'ring-cyan-500',    shortLabel: 'DEFENSA'    },
  { tipo: 'Ataque',     category: 'tree',   emoji: '⚔️', color: 'text-orange-400', bgColor: 'bg-orange-500/10 hover:bg-orange-500/20', borderColor: 'border-orange-500/40 hover:border-orange-400', ringColor: 'ring-orange-500',  shortLabel: 'ATAQUE'     },
  { tipo: 'Transición', category: 'tree',   emoji: '🔄', color: 'text-amber-400',  bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',   borderColor: 'border-amber-500/40 hover:border-amber-400',   ringColor: 'ring-amber-500',   shortLabel: 'TRANS.'     },
  { tipo: 'Arquero',    category: 'tree',   emoji: '🧤', color: 'text-sky-400',    bgColor: 'bg-sky-500/10 hover:bg-sky-500/20',       borderColor: 'border-sky-500/40 hover:border-sky-400',       ringColor: 'ring-sky-500',     shortLabel: 'ARQUERO'    },
  { tipo: 'Especiales', category: 'tree',   emoji: '⚖️', color: 'text-violet-400', bgColor: 'bg-violet-500/10 hover:bg-violet-500/20', borderColor: 'border-violet-500/40 hover:border-violet-400', ringColor: 'ring-violet-500',  shortLabel: 'ESPECIALES' },
];

export const getEventConfig = (tipo: EventTipo): EventConfig =>
  EVENT_CONFIGS.find((c) => c.tipo === tipo) ?? EVENT_CONFIGS[0]!;

export const getEventCategory = (tipo: EventTipo): EventCategory =>
  getEventConfig(tipo).category;

export const getEventLabel = (e: Pick<VideoEvent, 'tipo' | 'subtype' | 'detail' | 'qualifier'>): string => {
  const parts: string[] = [e.tipo];
  if (e.subtype)   parts.push(e.subtype);
  if (e.detail)    parts.push(e.detail);
  if (e.qualifier) parts.push(e.qualifier);
  return parts.join(' · ');
};

/**
 * Infer whether an event was "correct" or "incorrect" from our team's POV.
 * Used for visual styling.
 */
export const inferResult = (e: Pick<VideoEvent, 'tipo' | 'subtype' | 'detail' | 'qualifier'>): EventResult => {
  if (e.tipo === 'Gol')       return 'correcto';
  if (e.tipo === 'Gol rival') return 'incorrecto';

  if (e.tipo === 'Defensa') {
    if (e.subtype === 'Recuperación') return 'correcto';
    if (e.subtype === 'Intervención') {
      if (e.detail === 'Ayuda' && e.qualifier === 'Negativa') return 'incorrecto';
      return 'correcto';
    }
    if (e.subtype === 'Infracción') return 'incorrecto';
  }

  if (e.tipo === 'Ataque') {
    if (e.subtype === 'Finalización') {
      if (e.detail === 'Gol') return 'correcto';
      return 'incorrecto';
    }
    if (e.subtype === 'Generación') return 'correcto';
    if (e.subtype === 'Error')      return 'incorrecto';
  }

  if (e.tipo === 'Arquero') {
    if (e.subtype === 'Atajada')      return 'correcto';
    if (e.subtype === 'Gol recibido') return 'incorrecto';
  }

  if (e.tipo === 'Especiales') {
    if (e.subtype === 'Penal') {
      if (e.detail === 'Gol') return 'correcto';
      return 'incorrecto';
    }
    if (e.subtype === 'Duelo') return 'correcto';
  }

  if (e.tipo === 'Transición') return 'correcto';

  return null;
};

// ─── VideoEvent (the stored model) ───────────────────────────────────────────

export interface VideoEvent {
  id:              string;
  user_id:         string;
  match_local_id:  string;
  video_asset_id:  string | null;

  time:            number;        // position in video (seconds)

  // Hierarchical labels
  tipo:            EventTipo;
  subtype:         EventSubtype;
  detail:          EventDetail;
  qualifier:       EventQualifier;
  result:          EventResult;

  // Player attribution
  player_id:       string | null;
  player_name:     string | null;

  // Clip window
  clip_start:      number;
  clip_end:        number;

  video_file_index: number | null;
  created_at:      string;
}

export interface VideoPlayer {
  id:              string;
  user_id:         string;
  match_local_id:  string;
  name:            string;
  number:          string | null;
  created_at:      string;
}

// ─── Drawing / Annotation ────────────────────────────────────────────────────

export type AnnotationTool = 'pen' | 'line' | 'arrow' | 'text';

export interface VideoAnnotation {
  id:              string;
  user_id:         string;
  match_local_id:  string;
  video_asset_id:  string | null;
  event_id:        string | null;
  clip_id:         string | null;

  tool:            AnnotationTool;
  color:           string;
  size:            number;
  points:          Array<{ x: number; y: number }>;   // normalized 0..1
  text:            string | null;

  time_in:         number;        // when annotation becomes visible
  duration:        number;        // how long it stays visible

  created_at:      string;
}

// ─── Timeline project ────────────────────────────────────────────────────────

export interface TimelineSegment {
  /** Clip id from `clips` table. */
  clip_id:    string;
  /** Trim relative to clip's start_sec (0 = full clip). */
  trim_start: number;
  trim_end:   number;
  /** Optional transition into this segment. */
  transition_in?: 'cut' | 'fade' | 'dissolve';
}

export interface VideoTimeline {
  id:             string;
  user_id:        string;
  match_local_id: string;
  name:           string;
  segments:       TimelineSegment[];
  total_duration: number;
  created_at:     string;
  updated_at:     string;
}

// ─── Video source mode ──────────────────────────────────────────────────────

export type VideoMode = 'local' | 'youtube' | null;

// ─── Legacy in-memory annotation (used by AnnotationEditor / ClipEditor) ─────
// This is the lightweight shape the original components pass around in memory.
// It maps to VideoAnnotation when persisted.

export interface Annotation {
  id:       string;
  tool:     AnnotationTool;
  color:    string;
  size:     number;
  points:   Array<{ x: number; y: number }>;
  text?:    string;
  timeIn:   number;
  duration: number;
}

// ─── Default clip window (used when creating an event) ──────────────────────

export const DEFAULT_CLIP_PRE_SEC  = 5;
export const DEFAULT_CLIP_POST_SEC = 3;
