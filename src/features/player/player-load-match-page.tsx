/**
 * PlayerLoadMatchPage — Carga de partido personal (jugador).
 *
 * v2 (etapa 1.1):
 * - Cancha y arco con ancho máximo (max-w-md) para que no ocupen toda la pantalla.
 * - Al seleccionar cuadrante Y zona → abre POPUP con GOL / ATAJADO / ERRADO / PALO.
 * - Otros eventos: PÉRDIDA con sub-selector inline (mal pase / mala recepción /
 *   robo / falta en ataque) que se guarda en `situation`.
 * - Se agrega TARJETA AZUL. Se sacan ASISTENCIA y FALTA (los pidió el user).
 * - Página con max-w-2xl centrada para consistencia visual.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoalGrid } from '@/components/handball/goal-grid';
import { CourtView } from '@/components/handball/court-view';
import { cn } from '@/lib/cn';
import {
  upsertPersonalMatch,
  upsertPersonalEvent,
  type PersonalEventType,
} from '@/lib/personal-profile-api';
import { useQueryClient } from '@tanstack/react-query';
import type { CourtZoneId, GoalZoneId, GoalQuadrantId } from '@/domain/types';

// ─── Draft model ──────────────────────────────────────────────────────────

interface DraftEvent {
  local_id: string;
  minute: number;
  type: PersonalEventType;
  zone: string | null;
  goal_section: string | null;
  situation: string | null;   // sub-motivo (ej. turnover_reason: "mal_pase")
  quick_mode: boolean;
}

interface DraftMatch {
  local_id: string;
  opponent: string;
  match_date: string;
  competition: string | null;
  opp_score: number;
  events: DraftEvent[];
  started: boolean;
}

const DRAFT_KEY = 'statzpro_player_draft_match';

const uid = (): string =>
  crypto.randomUUID ? crypto.randomUUID() :
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyDraft = (): DraftMatch => ({
  local_id: uid(),
  opponent: '',
  match_date: todayISO(),
  competition: null,
  opp_score: 0,
  events: [],
  started: false,
});

const loadDraft = (): DraftMatch => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as DraftMatch;
    if (!parsed.local_id || !Array.isArray(parsed.events)) return emptyDraft();
    return parsed;
  } catch { return emptyDraft(); }
};

const saveDraft = (d: DraftMatch): void => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* quota */ }
};

const clearDraft = (): void => {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
};

const myScoreFromEvents = (events: DraftEvent[]): number =>
  events.filter((e) => e.type === 'goal').length;

// ─── Component ────────────────────────────────────────────────────────────

type Mode = 'full' | 'quick';

/** Selección en curso en Modo Completo. */
interface Pending {
  goal_section: GoalQuadrantId | null;
  zone: CourtZoneId | null;
  /** Si el user tocó 'post' (palo) directamente en el arco. */
  isPostZone: boolean;
  /** Si el user tocó 'out' (afuera) directamente en el arco. */
  isOutZone: boolean;
}

const EMPTY_PENDING: Pending = {
  goal_section: null, zone: null, isPostZone: false, isOutZone: false,
};

// ─── Turnover reasons ─────────────────────────────────────────────────────

const TURNOVER_REASONS = [
  { value: 'mal_pase',       label: 'Mal pase' },
  { value: 'mala_recepcion', label: 'Mala recepción' },
  { value: 'robo',           label: 'Robo del rival' },
  { value: 'falta_ataque',   label: 'Falta en ataque' },
] as const;

type TurnoverReason = typeof TURNOVER_REASONS[number]['value'];

// ─── Component ────────────────────────────────────────────────────────────

export const PlayerLoadMatchPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<DraftMatch>(() => loadDraft());
  const [mode, setMode] = useState<Mode>('full');
  const [pending, setPending] = useState<Pending>(EMPTY_PENDING);
  const [manualMinute, setManualMinute] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Sub-selector abierto para pérdida. Cuando != null, se muestra el picker inline. */
  const [turnoverPickerOpen, setTurnoverPickerOpen] = useState(false);

  /**
   * Popup outcome del tiro. Se abre automáticamente al tener cuadrante + zona.
   * Si el user toca 'post' o 'out' del arco no abre popup — auto-registra.
   */
  const outcomeOpen =
    pending.goal_section !== null &&
    pending.zone !== null &&
    !pending.isPostZone &&
    !pending.isOutZone;

  useEffect(() => {
    if (!draft.started && draft.events.length === 0 && !draft.opponent) return;
    saveDraft(draft);
  }, [draft]);

  const myScore = myScoreFromEvents(draft.events);

  // ── Actions ──

  const startLoading = () => {
    if (!draft.opponent.trim()) { setError('Ingresá el nombre del oponente'); return; }
    setError(null);
    setDraft((d) => ({ ...d, started: true }));
  };

  const addEvent = (
    type: PersonalEventType,
    zone: string | null,
    goal_section: string | null,
    quick_mode: boolean,
    situation: string | null = null,
  ) => {
    const ev: DraftEvent = {
      local_id: uid(),
      minute: manualMinute,
      type,
      zone,
      goal_section,
      situation,
      quick_mode,
    };
    setDraft((d) => ({ ...d, events: [...d.events, ev] }));
    setPending(EMPTY_PENDING);
    setTurnoverPickerOpen(false);
  };

  const removeEvent = (localId: string) => {
    setDraft((d) => ({ ...d, events: d.events.filter((e) => e.local_id !== localId) }));
  };

  // ── Manejo de zonas (Modo Completo) ──

  const handleGoalTap = (z: GoalZoneId | null) => {
    if (z === null) { setPending(EMPTY_PENDING); return; }
    if (z === 'post') {
      // 'palo del arco' → si ya hay zona, auto-registra type='post'. Sino queda pendiente.
      if (pending.zone !== null) {
        addEvent('post', pending.zone, null, false);
      } else {
        setPending({ goal_section: null, zone: null, isPostZone: true, isOutZone: false });
      }
      return;
    }
    if (z === 'out') {
      if (pending.zone !== null) {
        addEvent('miss', pending.zone, null, false);
      } else {
        setPending({ goal_section: null, zone: null, isPostZone: false, isOutZone: true });
      }
      return;
    }
    // Cuadrante normal (tl..br)
    setPending((p) => ({ ...p, goal_section: z as GoalQuadrantId, isPostZone: false, isOutZone: false }));
  };

  const handleCourtTap = (z: CourtZoneId | null) => {
    if (z === null) { setPending((p) => ({ ...p, zone: null })); return; }
    if (pending.isPostZone) { addEvent('post', z, null, false); return; }
    if (pending.isOutZone)  { addEvent('miss', z, null, false); return; }
    setPending((p) => ({ ...p, zone: z }));
  };

  const commitOutcome = (type: 'goal' | 'saved' | 'miss' | 'post') => {
    if (pending.goal_section === null || pending.zone === null) return;
    addEvent(type, pending.zone, pending.goal_section, false);
  };

  const cancelOutcome = () => setPending(EMPTY_PENDING);

  // ── Turnover con sub-motivo ──

  const commitTurnover = (reason: TurnoverReason) => {
    addEvent('turnover', null, null, false, reason);
  };

  // ── Persistencia final ──

  const finish = async () => {
    if (draft.events.length === 0 && myScore === 0 && draft.opp_score === 0) {
      if (!window.confirm('No cargaste ningún evento. ¿Guardar igual?')) return;
    }
    setSaving(true);
    setError(null);
    try {
      const matchId = await upsertPersonalMatch({
        local_id: draft.local_id,
        opponent: draft.opponent,
        match_date: draft.match_date,
        competition: draft.competition,
        my_score: myScore,
        opp_score: draft.opp_score,
        status: 'finished',
      });

      for (const e of draft.events) {
        await upsertPersonalEvent({
          local_id: e.local_id,
          personal_match_id: matchId,
          minute: e.minute,
          type: e.type,
          zone: e.zone,
          goal_section: e.goal_section,
          situation: e.situation,
          quick_mode: e.quick_mode,
          completed: true,
        });
      }

      clearDraft();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['personal-stats'] }),
        qc.invalidateQueries({ queryKey: ['personal-has-data'] }),
        qc.invalidateQueries({ queryKey: ['personal-recent'] }),
      ]);
      navigate('/app/player/home', { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setError(`No pudimos guardar el partido: ${msg}`);
      setSaving(false);
    }
  };

  const discard = () => {
    if (draft.events.length > 0 || draft.opponent) {
      if (!window.confirm('¿Descartar el partido cargado? Se pierden los eventos.')) return;
    }
    clearDraft();
    navigate('/app/player/home', { replace: true });
  };

  // ── Counts derivados para overlays ──

  const goalCountsBySection = useMemo(() => {
    const m: Partial<Record<GoalQuadrantId, number>> = {};
    for (const e of draft.events) {
      if (e.goal_section && (e.type === 'goal' || e.type === 'miss' || e.type === 'saved')) {
        const k = e.goal_section as GoalQuadrantId;
        m[k] = (m[k] ?? 0) + 1;
      }
    }
    return m;
  }, [draft.events]);

  const courtCountsByZone = useMemo(() => {
    const m: Partial<Record<CourtZoneId, number>> = {};
    for (const e of draft.events) {
      if (e.zone) {
        const k = e.zone as CourtZoneId;
        m[k] = (m[k] ?? 0) + 1;
      }
    }
    return m;
  }, [draft.events]);

  // ═══════════════════ RENDER ═══════════════════

  // Setup screen
  if (!draft.started) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div>
          <h1 className="text-2xl font-bold mb-1">Nuevo partido</h1>
          <p className="text-xs text-muted-fg">Ingresá los datos del partido y arrancá a cargar.</p>
        </div>

        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-fg mb-1.5">Oponente</label>
            <input
              type="text"
              value={draft.opponent}
              onChange={(e) => setDraft((d) => ({ ...d, opponent: e.target.value }))}
              placeholder="ej. Ferro"
              className="w-full px-3 py-2.5 rounded-md bg-bg border border-border text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-fg mb-1.5">Fecha</label>
            <input
              type="date"
              value={draft.match_date}
              onChange={(e) => setDraft((d) => ({ ...d, match_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-md bg-bg border border-border text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-fg mb-1.5">Competición (opcional)</label>
            <input
              type="text"
              value={draft.competition ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, competition: e.target.value || null }))}
              placeholder="ej. FEMEBAL Apertura"
              className="w-full px-3 py-2.5 rounded-md bg-bg border border-border text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/app/player/home')}
            className="flex-1 px-4 py-2.5 rounded-md border border-border bg-surface text-sm font-medium text-muted-fg hover:text-fg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={startLoading}
            className="flex-1 px-4 py-2.5 rounded-md bg-primary text-primary-fg font-semibold text-sm hover:bg-primary/90"
          >
            Empezar carga
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════ Loading UI ═══════════════════

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-4">
      {/* Header */}
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-fg">Cargando partido</div>
            <div className="text-lg font-semibold truncate">vs {draft.opponent}</div>
            <div className="text-[11px] text-muted-fg mt-0.5">
              {draft.match_date}
              {draft.competition && <> · {draft.competition}</>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center">
              <div className="text-[9px] uppercase text-muted-fg">Yo</div>
              <div className="text-2xl font-mono font-bold text-primary tabular-nums">{myScore}</div>
            </div>
            <div className="text-muted-fg">·</div>
            <div className="text-center">
              <div className="text-[9px] uppercase text-muted-fg">Opp</div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, opp_score: Math.max(0, d.opp_score - 1) }))}
                  className="w-6 h-6 rounded border border-border text-muted-fg hover:text-fg text-xs"
                >−</button>
                <span className="text-2xl font-mono font-bold tabular-nums w-8 text-center">{draft.opp_score}</span>
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, opp_score: d.opp_score + 1 }))}
                  className="w-6 h-6 rounded border border-border text-muted-fg hover:text-fg text-xs"
                >+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Minuto manual */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-fg">Minuto:</span>
        <input
          type="number"
          min={0}
          max={60}
          value={manualMinute}
          onChange={(e) => setManualMinute(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
          className="w-16 px-2 py-1 rounded bg-bg border border-border text-sm font-mono"
        />
        <span className="text-muted-fg">/ 60</span>
        <span className="ml-auto text-muted-fg text-[10px]">Se aplica al próximo evento</span>
      </div>

      {/* Toggle Completo / Rápido */}
      <div className="rounded-lg border border-border bg-surface p-1 flex gap-0.5">
        {(['full', 'quick'] as const).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setPending(EMPTY_PENDING); setTurnoverPickerOpen(false); }}
              className={cn(
                'flex-1 h-9 text-xs font-medium rounded-md transition-colors',
                active ? 'bg-primary/15 border border-primary/40 text-primary' : 'text-muted-fg hover:text-fg',
              )}
            >
              {m === 'full' ? 'Completo' : 'Rápido'}
            </button>
          );
        })}
      </div>

      {mode === 'full' ? (
        <>
          {/* Cuadrante del arco — max-w-md para no ocupar toda la pantalla */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary grid place-items-center text-[10px] font-bold">1</span>
              ¿A qué cuadrante fue?
            </h3>
            <div className="max-w-md mx-auto">
              <GoalGrid
                selected={
                  pending.goal_section ??
                  (pending.isPostZone ? 'post' as GoalZoneId :
                   pending.isOutZone  ? 'out'  as GoalZoneId : null)
                }
                onSelect={handleGoalTap}
                counts={goalCountsBySection}
                countsByType={{ shots: goalCountsBySection }}
              />
            </div>
          </section>

          {/* Zona de la cancha — max-w-md */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary grid place-items-center text-[10px] font-bold">2</span>
              ¿Desde dónde tiró?
            </h3>
            <div className="max-w-md mx-auto">
              <CourtView
                selectedZone={pending.zone}
                onZoneSelect={handleCourtTap}
                heatmap={courtCountsByZone}
                countsByType={{ shots: courtCountsByZone }}
              />
            </div>
          </section>

          <p className="text-center text-[10px] text-muted-fg">
            Tocá cuadrante + zona para abrir opciones de resultado
          </p>

          {/* Otros eventos (no-shot) */}
          <section className="pt-2 border-t border-border">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
              Otros eventos
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <QuickBtn onClick={() => setTurnoverPickerOpen(true)} label="PÉRDIDA" cls="bg-orange-500/15 border-orange-500/50 text-orange-400" />
              <QuickBtn onClick={() => addEvent('exclusion',   null, null, false)} label="2 MIN"    cls="bg-red-500/15 border-red-500/50 text-red-400" />
              <QuickBtn onClick={() => addEvent('yellow_card', null, null, false)} label="AMARILLA" cls="bg-yellow-500/15 border-yellow-500/50 text-yellow-400" />
              <QuickBtn onClick={() => addEvent('blue_card',   null, null, false)} label="AZUL"     cls="bg-blue-500/15 border-blue-500/50 text-blue-400" />
              <QuickBtn onClick={() => addEvent('red_card',    null, null, false)} label="ROJA"     cls="bg-danger/15 border-danger/50 text-danger" />
            </div>

            {/* Sub-selector de motivo de pérdida — inline (no modal) */}
            {turnoverPickerOpen && (
              <div className="mt-3 rounded-md border border-orange-500/40 bg-orange-500/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-orange-400">
                    Motivo de la pérdida
                  </span>
                  <button
                    type="button"
                    onClick={() => setTurnoverPickerOpen(false)}
                    className="text-xs text-muted-fg hover:text-fg"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TURNOVER_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => commitTurnover(r.value)}
                      className="px-3 py-2.5 rounded-md border border-orange-500/40 bg-bg text-sm font-medium text-fg hover:bg-orange-500/10"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        // ── Modo Rápido ──
        <section>
          <p className="text-[11px] text-muted-fg mb-3">
            Modo rápido: eventos sin zona ni cuadrante. Podés editarlos después.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <QuickBtn onClick={() => addEvent('goal',        null, null, true)} label="GOL"      cls="bg-goal/15 border-goal/50 text-goal" />
            <QuickBtn onClick={() => addEvent('saved',       null, null, true)} label="ATAJADO"  cls="bg-blue-500/15 border-blue-500/50 text-blue-400" />
            <QuickBtn onClick={() => addEvent('miss',        null, null, true)} label="ERRADO"   cls="bg-surface-2 border-border text-muted-fg" />
            <QuickBtn onClick={() => addEvent('post',        null, null, true)} label="PALO"     cls="bg-amber-500/15 border-amber-500/50 text-amber-400" />
            <QuickBtn onClick={() => setTurnoverPickerOpen(true)}                label="PÉRDIDA"  cls="bg-orange-500/15 border-orange-500/50 text-orange-400" />
            <QuickBtn onClick={() => addEvent('exclusion',   null, null, true)} label="2 MIN"    cls="bg-red-500/15 border-red-500/50 text-red-400" />
            <QuickBtn onClick={() => addEvent('yellow_card', null, null, true)} label="AMARILLA" cls="bg-yellow-500/15 border-yellow-500/50 text-yellow-400" />
            <QuickBtn onClick={() => addEvent('blue_card',   null, null, true)} label="AZUL"     cls="bg-blue-500/15 border-blue-500/50 text-blue-400" />
            <QuickBtn onClick={() => addEvent('red_card',    null, null, true)} label="ROJA"     cls="bg-danger/15 border-danger/50 text-danger" />
          </div>

          {/* Sub-selector en modo rápido también */}
          {turnoverPickerOpen && (
            <div className="mt-3 rounded-md border border-orange-500/40 bg-orange-500/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-orange-400">
                  Motivo de la pérdida
                </span>
                <button
                  type="button"
                  onClick={() => setTurnoverPickerOpen(false)}
                  className="text-xs text-muted-fg hover:text-fg"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TURNOVER_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => commitTurnover(r.value)}
                    className="px-3 py-2.5 rounded-md border border-orange-500/40 bg-bg text-sm font-medium text-fg hover:bg-orange-500/10"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Timeline */}
      <section className="pt-2 border-t border-border">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
          Eventos ({draft.events.length})
        </h3>
        {draft.events.length === 0 ? (
          <p className="text-xs text-muted-fg italic">Todavía no cargaste eventos.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {draft.events.slice().reverse().map((e, idx) => {
              const displayIdx = draft.events.length - idx;
              const details = [e.zone, e.goal_section, e.situation].filter(Boolean).join(' · ');
              return (
                <div
                  key={e.local_id}
                  className="flex items-center gap-2 rounded border border-border bg-surface px-2 py-1.5 text-xs"
                >
                  <span className="text-muted-fg font-mono w-8 shrink-0">#{displayIdx}</span>
                  <span className="text-muted-fg font-mono w-8 shrink-0">{e.minute}'</span>
                  <EventTypeBadge type={e.type} />
                  <div className="flex-1 min-w-0 text-[10px] text-muted-fg truncate">
                    {details || (e.quick_mode ? 'rápido' : '')}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEvent(e.local_id)}
                    className="text-muted-fg hover:text-danger px-1"
                    title="Borrar"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Acciones finales */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={discard}
          disabled={saving}
          className="flex-1 px-4 py-2.5 rounded-md border border-border bg-surface text-sm font-medium text-muted-fg hover:text-danger disabled:opacity-50"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={saving}
          className="flex-[2] px-4 py-2.5 rounded-md bg-primary text-primary-fg font-semibold text-sm hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Finalizar y guardar'}
        </button>
      </div>

      {/* ─── POPUP DE RESULTADO ─── */}
      {outcomeOpen && (
        <OutcomeDialog
          onGoal={() => commitOutcome('goal')}
          onSaved={() => commitOutcome('saved')}
          onMiss={() => commitOutcome('miss')}
          onPost={() => commitOutcome('post')}
          onCancel={cancelOutcome}
        />
      )}
    </div>
  );
};

// ─── OutcomeDialog ────────────────────────────────────────────────────────

interface OutcomeDialogProps {
  onGoal: () => void;
  onSaved: () => void;
  onMiss: () => void;
  onPost: () => void;
  onCancel: () => void;
}

const OutcomeDialog = ({ onGoal, onSaved, onMiss, onPost, onCancel }: OutcomeDialogProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Resultado del tiro</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-fg hover:text-fg text-lg leading-none"
            title="Cancelar"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onGoal}
            className="px-4 py-4 rounded-md border border-goal/50 bg-goal/15 text-goal font-bold text-sm hover:bg-goal/25"
          >
            GOL
          </button>
          <button
            type="button"
            onClick={onSaved}
            className="px-4 py-4 rounded-md border border-blue-500/50 bg-blue-500/15 text-blue-400 font-bold text-sm hover:bg-blue-500/25"
          >
            ATAJADO
          </button>
          <button
            type="button"
            onClick={onMiss}
            className="px-4 py-4 rounded-md border border-border bg-surface-2 text-muted-fg font-bold text-sm hover:text-fg"
          >
            ERRADO
          </button>
          <button
            type="button"
            onClick={onPost}
            className="px-4 py-4 rounded-md border border-amber-500/50 bg-amber-500/15 text-amber-400 font-bold text-sm hover:bg-amber-500/25"
          >
            PALO
          </button>
        </div>
        <p className="text-[10px] text-muted-fg text-center mt-3">
          Escape o click afuera para cancelar
        </p>
      </div>
    </div>
  );
};

// ─── Subcomponents ────────────────────────────────────────────────────────

const QuickBtn = ({
  onClick, label, cls,
}: { onClick: () => void; label: string; cls: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-3 py-2.5 rounded-md border font-semibold text-xs transition-transform active:scale-95',
      cls,
    )}
  >
    {label}
  </button>
);

const EventTypeBadge = ({ type }: { type: PersonalEventType }) => {
  const map: Record<PersonalEventType, { label: string; cls: string }> = {
    goal:            { label: 'Gol',        cls: 'bg-goal/15 text-goal border-goal/40' },
    miss:            { label: 'Errado',     cls: 'bg-surface-2 text-muted-fg border-border' },
    saved:           { label: 'Atajado',    cls: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
    post:            { label: 'Palo',       cls: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
    save:            { label: 'Atajada',    cls: 'bg-primary/15 text-primary border-primary/40' },
    goal_conceded:   { label: 'Gol c/',     cls: 'bg-danger/15 text-danger border-danger/40' },
    assist:          { label: 'Asist.',     cls: 'bg-primary/15 text-primary border-primary/40' },
    turnover:        { label: 'Pérd.',      cls: 'bg-orange-500/15 text-orange-400 border-orange-500/40' },
    exclusion:       { label: '2\'',        cls: 'bg-red-500/15 text-red-400 border-red-500/40' },
    yellow_card:     { label: 'TA',         cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40' },
    blue_card:       { label: 'TAz',        cls: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
    red_card:        { label: 'TR',         cls: 'bg-danger/15 text-danger border-danger/40' },
    foul_committed:  { label: 'Falta',      cls: 'bg-surface-2 text-muted-fg border-border' },
  };
  const m = map[type];
  return (
    <span className={cn('text-[10px] font-bold border rounded px-1.5 py-0.5 shrink-0', m.cls)}>
      {m.label}
    </span>
  );
};
