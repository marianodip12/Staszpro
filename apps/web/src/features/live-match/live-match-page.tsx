'use client';

/**
 * LiveMatchPage — Real-time match recording.
 *
 * Integrates:
 *  - Scoreboard (home/away score, timer, phase)
 *  - Event buttons (4-level hierarchy from Analizador EVENT_TREE)
 *  - CourtView (zone selection)
 *  - useEventSync (optimistic → Supabase drain)
 *  - useLiveMatchStore
 *
 * Aesthetic: dark precision dashboard — like a broadcast control room.
 */

import { useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play, Square, Coffee, CheckCircle, AlertCircle,
  RotateCcw, ChevronRight, Clock, Wifi, WifiOff,
} from 'lucide-react';
import type { Match, Team } from '@sportiq/core';
import type { HandballEvent, HandballEventType } from '@sportiq/core/handball';
import { HANDBALL_EVENT_TREE, type EventNode } from '@sportiq/core/handball';
import { CourtView } from '@/components/court/CourtView';
import { GoalGrid } from '@/components/court/GoalGrid';
import { useEventSync } from '@/hooks/useEventSync';
import {
  useLiveMatchStore, useAllEvents, usePendingCount,
} from '@/stores/live-match.store';
import type { CourtZoneId, GoalZoneId } from '@sportiq/core/handball';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LiveMatchPageProps {
  match:   Match;
  orgSlug: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type EventTeam = 'home' | 'away';

interface EventDraft {
  team:      EventTeam;
  type:      HandballEventType | null;
  subtype:   string | null;
  detail:    string | null;
  qualifier: string | null;
  zone:      CourtZoneId | null;
  goalZone:  GoalZoneId  | null;
}

const EMPTY_DRAFT: EventDraft = {
  team: 'home', type: null, subtype: null,
  detail: null, qualifier: null, zone: null, goalZone: null,
};

// Map event tree labels → HandballEventType
const LABEL_TO_TYPE: Record<string, HandballEventType> = {
  'Gol':         'goal',
  'Gol rival':   'goal',
  'Atajada':     'saved',
  'Gol recibido':'goal',
  'Penal':       'goal',
};

// Which top-level categories need zone selection
const NEEDS_ZONE = new Set(['Gol', 'Gol rival', 'Ataque', 'Arquero', 'Especiales']);
const NEEDS_GOAL_GRID = new Set(['Gol', 'Gol rival', 'Ataque']);

// ─── Main component ───────────────────────────────────────────────────────────

export function LiveMatchPage({ match, orgSlug }: LiveMatchPageProps) {
  const router = useRouter();

  // Store
  const phase      = useLiveMatchStore((s) => s.phase);
  const homeScore  = useLiveMatchStore((s) => s.homeScore);
  const awayScore  = useLiveMatchStore((s) => s.awayScore);
  const timerMs    = useLiveMatchStore((s) => s.timerMs);
  const { setPhase, startTimer, stopTimer, addEvent, endSession } = useLiveMatchStore.getState();
  const allEvents  = useAllEvents();
  const pendingCount = usePendingCount();

  // Sync hook
  const { errorCount, retryErrors } = useEventSync();

  // Local draft state
  const [draft, setDraft]       = useState<EventDraft>(EMPTY_DRAFT);
  const [step, setStep]         = useState<'team' | 'category' | 'zone' | 'goal' | 'confirm'>('team');
  const [treePath, setTreePath] = useState<EventNode[]>([]);

  // Timer display
  const minutes = Math.floor(timerMs / 60000);
  const seconds = Math.floor((timerMs % 60000) / 1000);
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // ── Phase control ──────────────────────────────────────────────────────────

  const handlePhaseAction = useCallback(() => {
    if (phase === 'idle') {
      setPhase('first_half');
      startTimer();
    } else if (phase === 'first_half') {
      setPhase('half_time');
      stopTimer();
    } else if (phase === 'half_time') {
      setPhase('second_half');
      startTimer();
    } else if (phase === 'second_half') {
      setPhase('finished');
      stopTimer();
    }
  }, [phase, setPhase, startTimer, stopTimer]);

  // ── Event recording ────────────────────────────────────────────────────────

  const selectTeam = useCallback((team: EventTeam) => {
    setDraft({ ...EMPTY_DRAFT, team });
    setStep('category');
    setTreePath([]);
  }, []);

  const selectNode = useCallback((node: EventNode) => {
    const newPath = [...treePath, node];
    setTreePath(newPath);

    // Map top-level to EventType
    const topLabel = newPath[0]?.label ?? '';
    const type     = LABEL_TO_TYPE[topLabel] ?? inferTypeFromTree(newPath);

    const updatedDraft: EventDraft = {
      ...draft,
      type,
      subtype:   newPath[1]?.label ?? null,
      detail:    newPath[2]?.label ?? null,
      qualifier: newPath[3]?.label ?? null,
    };

    if (!node.children || node.children.length === 0) {
      // Leaf node — decide next step
      setDraft(updatedDraft);
      if (NEEDS_ZONE.has(topLabel)) {
        setStep('zone');
      } else {
        setStep('confirm');
      }
    } else {
      setDraft(updatedDraft);
      // Stay in category step with deeper tree
    }
  }, [draft, treePath]);

  const selectZone = useCallback((zone: CourtZoneId) => {
    const topLabel = treePath[0]?.label ?? '';
    if (NEEDS_GOAL_GRID.has(topLabel)) {
      setDraft((d) => ({ ...d, zone }));
      setStep('goal');
    } else {
      setDraft((d) => ({ ...d, zone }));
      setStep('confirm');
    }
  }, [treePath]);

  const selectGoalZone = useCallback((goalZone: GoalZoneId) => {
    setDraft((d) => ({ ...d, goalZone }));
    setStep('confirm');
  }, []);

  const confirmEvent = useCallback(() => {
    if (!draft.type) return;

    const id    = crypto.randomUUID();
    const min   = minutes;

    const event: HandballEvent = {
      id,
      min,
      team:       draft.team,
      type:       draft.type,
      zone:       draft.zone,
      goalZone:   draft.goalZone,
      hScore:     homeScore,
      aScore:     awayScore,
      quickMode:  false,
      completed:  true,
    };

    addEvent(event);

    // Reset
    setDraft(EMPTY_DRAFT);
    setStep('team');
    setTreePath([]);
  }, [draft, minutes, homeScore, awayScore, addEvent]);

  const cancelDraft = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setStep('team');
    setTreePath([]);
  }, []);

  const goBack = useCallback(() => {
    if (step === 'confirm') {
      setStep(NEEDS_GOAL_GRID.has(treePath[0]?.label ?? '') ? 'goal' : 'zone');
    } else if (step === 'goal') setStep('zone');
    else if (step === 'zone') {
      setStep('category');
      setTreePath((p) => p.slice(0, -1));
    } else if (step === 'category') {
      if (treePath.length > 1) setTreePath((p) => p.slice(0, -1));
      else { setStep('team'); setTreePath([]); }
    }
  }, [step, treePath]);

  // Active tree nodes at current depth
  const currentNodes = treePath.length === 0
    ? HANDBALL_EVENT_TREE
    : treePath[treePath.length - 1]?.children ?? [];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--navy-950)' }}>

      {/* ── Scoreboard ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">

            {/* Home team */}
            <TeamScore
              name={match.home_team_name}
              score={homeScore}
              color={match.home_team_color}
              side="home"
              isHome
            />

            {/* Center: timer + phase */}
            <div className="flex flex-col items-center gap-2 min-w-0">
              {/* Live indicator */}
              {(phase === 'first_half' || phase === 'second_half') && (
                <div className="flex items-center gap-1.5">
                  <div className="live-dot" />
                  <span className="text-xs font-mono" style={{ color: 'var(--lime-400)' }}>
                    {phase === 'first_half' ? '1ER TIEMPO' : '2DO TIEMPO'}
                  </span>
                </div>
              )}
              {phase === 'half_time' && (
                <span className="text-xs font-mono" style={{ color: 'var(--amber-400)' }}>DESCANSO</span>
              )}
              {phase === 'idle' && (
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>ANTES DEL PARTIDO</span>
              )}
              {phase === 'finished' && (
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARTIDO FINALIZADO</span>
              )}

              {/* Timer */}
              <div className="score-display" style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>
                {timeStr}
              </div>

              {/* Phase button */}
              <PhaseButton phase={phase} onClick={handlePhaseAction} />
            </div>

            {/* Away team */}
            <TeamScore
              name={match.away_team_name}
              score={awayScore}
              color={match.away_team_color}
              side="away"
            />
          </div>
        </div>
      </div>

      {/* ── Sync status bar ────────────────────────────────────────────── */}
      {(pendingCount > 0 || errorCount > 0) && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 text-xs"
          style={{
            background:  errorCount > 0 ? 'rgba(239,68,68,.08)' : 'rgba(37,99,235,.06)',
            borderBottom: '1px solid var(--surface-border)',
          }}
        >
          {errorCount > 0 ? (
            <>
              <WifiOff size={12} style={{ color: 'var(--red-400)' }} />
              <span style={{ color: 'var(--red-400)' }}>
                {errorCount} evento{errorCount > 1 ? 's' : ''} sin sincronizar
              </span>
              <button onClick={retryErrors} className="underline" style={{ color: 'var(--red-300)' }}>
                Reintentar
              </button>
            </>
          ) : (
            <>
              <Wifi size={12} className="animate-pulse" style={{ color: 'var(--blue-400)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                Sincronizando {pendingCount} evento{pendingCount > 1 ? 's' : ''}…
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Main: Event recording UI ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">

          {/* Breadcrumb trail */}
          {step !== 'team' && (
            <div className="flex items-center gap-1 text-xs">
              <button onClick={cancelDraft} style={{ color: 'var(--text-muted)' }} className="hover:text-white transition-colors">
                Cancelar
              </button>
              {treePath.map((node, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: i === treePath.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {node.label}
                  </span>
                </span>
              ))}
              {step === 'zone'   && <> <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} /><span style={{ color: 'var(--text-muted)' }}>Zona</span></>}
              {step === 'goal'   && <> <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} /><span style={{ color: 'var(--text-muted)' }}>Cuadrante</span></>}
              {step === 'confirm'&& <> <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} /><span style={{ color: 'var(--text-muted)' }}>Confirmar</span></>}
            </div>
          )}

          {/* STEP: Team selection */}
          {step === 'team' && (
            <div className="grid grid-cols-2 gap-3 stagger">
              <TeamButton
                name={match.home_team_name}
                color={match.home_team_color}
                onClick={() => selectTeam('home')}
                label="Nuestro equipo"
              />
              <TeamButton
                name={match.away_team_name}
                color={match.away_team_color}
                onClick={() => selectTeam('away')}
                label="Rival"
              />
            </div>
          )}

          {/* STEP: Event category tree */}
          {step === 'category' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 stagger">
              {currentNodes.map((node) => (
                <button
                  key={node.label}
                  onClick={() => selectNode(node)}
                  className="flex items-center gap-2 p-3 rounded-lg text-left transition-all hover:scale-[1.02]"
                  style={{
                    background:   'var(--surface-raised)',
                    border:       '1px solid var(--surface-border)',
                    color:        'var(--text-primary)',
                  }}
                >
                  {node.emoji && <span className="text-lg flex-shrink-0">{node.emoji}</span>}
                  <span className="text-sm font-medium flex-1">{node.label}</span>
                  {node.children && <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />}
                </button>
              ))}
              <button onClick={goBack}
                      className="flex items-center gap-2 p-3 rounded-lg text-sm"
                      style={{ background: 'transparent', border: '1px dashed var(--surface-border)', color: 'var(--text-muted)' }}>
                ← Volver
              </button>
            </div>
          )}

          {/* STEP: Zone selection */}
          {step === 'zone' && (
            <div className="space-y-3 animate-fade-up">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Seleccioná la zona del campo</p>
              <CourtView
                selectedZone={draft.zone}
                onZoneClick={selectZone}
                size="md"
              />
              <button onClick={goBack} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                ← Volver
              </button>
            </div>
          )}

          {/* STEP: Goal grid */}
          {step === 'goal' && (
            <div className="space-y-3 animate-fade-up">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>¿A dónde fue el tiro?</p>
              <GoalGrid
                selected={draft.goalZone}
                onSelect={selectGoalZone}
                showMeta
              />
              <button onClick={goBack} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                ← Volver
              </button>
            </div>
          )}

          {/* STEP: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-3 animate-fade-up">
              <div className="card p-4 space-y-2">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Resumen del evento</p>
                <div className="space-y-1.5 text-sm">
                  <Row label="Equipo"   value={draft.team === 'home' ? match.home_team_name : match.away_team_name} />
                  <Row label="Categoría" value={treePath.map((n) => n.label).join(' › ')} />
                  {draft.zone      && <Row label="Zona"       value={draft.zone} />}
                  {draft.goalZone  && <Row label="Cuadrante"  value={draft.goalZone} />}
                  <Row label="Minuto" value={`${minutes}'`} />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={confirmEvent}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all hover:brightness-110"
                  style={{ background: 'var(--blue-600)', color: 'white' }}
                >
                  <CheckCircle size={16} />
                  Confirmar evento
                </button>
                <button
                  onClick={cancelDraft}
                  className="px-4 py-3 rounded-lg text-sm transition-all"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Recent events feed */}
          {allEvents.length > 0 && step === 'team' && (
            <div className="mt-4">
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>
                EVENTOS RECIENTES
              </p>
              <div className="space-y-1">
                {[...allEvents].reverse().slice(0, 8).map((ev) => (
                  <EventRow key={ev.id} event={ev}
                            homeName={match.home_team_name}
                            awayName={match.away_team_name} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TeamScore({ name, score, color, side, isHome }: {
  name: string; score: number; color: string;
  side: 'home' | 'away'; isHome?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 min-w-0 ${side === 'away' ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-sm font-medium truncate max-w-[120px]" style={{ color: 'var(--text-secondary)' }}>
          {name}
        </span>
      </div>
      <div className="score-display">{score}</div>
    </div>
  );
}

function TeamButton({ name, color, onClick, label }: {
  name: string; color: string; onClick: () => void; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="card p-4 text-left transition-all hover:scale-[1.02] hover:glow-border"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{name}</p>
    </button>
  );
}

function PhaseButton({ phase, onClick }: { phase: string; onClick: () => void }) {
  const config: Record<string, { label: string; icon: React.ElementType; bg: string }> = {
    idle:        { label: 'Iniciar',      icon: Play,    bg: 'var(--lime-600)'  },
    first_half:  { label: 'Descanso',    icon: Coffee,  bg: 'var(--amber-500)' },
    half_time:   { label: '2do tiempo',  icon: Play,    bg: 'var(--blue-600)'  },
    second_half: { label: 'Finalizar',   icon: Square,  bg: 'var(--red-500)'   },
    finished:    { label: 'Finalizado',  icon: CheckCircle, bg: 'var(--navy-600)' },
  };
  const c = config[phase] ?? config.idle!;
  const Icon = c.icon;
  return (
    <button
      onClick={onClick}
      disabled={phase === 'finished'}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all hover:brightness-110 disabled:opacity-50"
      style={{ background: c.bg, color: 'white' }}
    >
      <Icon size={12} />
      {c.label}
    </button>
  );
}

function EventRow({ event, homeName, awayName }: {
  event: HandballEvent; homeName: string; awayName: string;
}) {
  const typeClass: Record<string, string> = {
    goal: 'event-goal', miss: 'event-miss', saved: 'event-saved',
    exclusion: 'event-exclusion', turnover: 'event-turnover',
  };
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded"
         style={{ background: 'var(--surface-raised)' }}>
      <span className="text-xs font-mono w-8 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
        {event.min}'
      </span>
      <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold border ${typeClass[event.type] ?? ''}`}>
        {event.type.toUpperCase()}
      </span>
      <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
        {event.team === 'home' ? homeName : awayName}
        {event.zone && ` · ${event.zone}`}
      </span>
      <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
        {event.hScore}–{event.aScore}
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-20 flex-shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function inferTypeFromTree(path: EventNode[]): HandballEventType {
  const leaf = path[path.length - 1]?.label ?? '';
  if (/gol|goal/i.test(leaf))       return 'goal';
  if (/fallado|miss/i.test(leaf))    return 'miss';
  if (/atajado|saved/i.test(leaf))   return 'saved';
  if (/pérdida|turnover/i.test(leaf))return 'turnover';
  if (/falta|exclusion/i.test(leaf)) return 'exclusion';
  return 'turnover';
}
