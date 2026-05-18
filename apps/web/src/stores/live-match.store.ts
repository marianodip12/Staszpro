/**
 * apps/web — Live match store (Zustand).
 *
 * This store ONLY holds state for a SINGLE match being played RIGHT NOW.
 * Historical/completed matches live in server state (TanStack Query),
 * NOT in this store. This prevents the localStorage bloat antipattern
 * of the original Handball Pro implementation.
 *
 * Responsibilities:
 *  - In-progress match session (pending events, current score)
 *  - Optimistic updates with queue for sync
 *  - Timer state
 *
 * What is NOT here (lives in React Query / server):
 *  - Past matches and their events
 *  - Team roster
 *  - Season stats
 *  - Any historical data
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { HandballEvent } from '@sportiq/core/handball';
import type { Match } from '@sportiq/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LiveMatchPhase = 'idle' | 'first_half' | 'half_time' | 'second_half' | 'finished';

export interface PendingEvent {
  localId:    string;   // local UUID — maps to DB UUID after sync
  event:      HandballEvent;
  syncStatus: 'pending' | 'syncing' | 'done' | 'error';
  error?:     string;
}

export interface LiveMatchState {
  // Active match session
  matchId:    string | null;
  orgId:      string | null;
  phase:      LiveMatchPhase;
  homeScore:  number;
  awayScore:  number;
  timerMs:    number;     // elapsed ms in current half
  isRunning:  boolean;

  // Event queue (optimistic writes)
  pendingEvents: PendingEvent[];

  // Confirmed events (from DB, loaded on session resume)
  confirmedEvents: HandballEvent[];

  // UI-only state (not persisted)
  selectedEventId: string | null;
}

interface LiveMatchActions {
  // Session lifecycle
  startSession(matchId: string, orgId: string, resumeData?: { events: HandballEvent[]; homeScore: number; awayScore: number }): void;
  endSession(): void;

  // Phase control
  setPhase(phase: LiveMatchPhase): void;
  startTimer(): void;
  stopTimer(): void;
  tickTimer(deltaMs: number): void;

  // Event management
  addEvent(event: Omit<HandballEvent, 'id'> & { id: string }): void;
  deleteEvent(localId: string): void;
  markEventSynced(localId: string, confirmedEvent: HandballEvent): void;
  markEventError(localId: string, error: string): void;

  // UI
  selectEvent(id: string | null): void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLiveMatchStore = create<LiveMatchState & LiveMatchActions>()(
  persist(
    immer((set, get) => ({
      // ── Initial state ──────────────────────────────────────────────────────
      matchId:         null,
      orgId:           null,
      phase:           'idle',
      homeScore:       0,
      awayScore:       0,
      timerMs:         0,
      isRunning:       false,
      pendingEvents:   [],
      confirmedEvents: [],
      selectedEventId: null,

      // ── Session lifecycle ──────────────────────────────────────────────────

      startSession(matchId, orgId, resumeData) {
        set((state) => {
          state.matchId         = matchId;
          state.orgId           = orgId;
          state.phase           = 'idle';
          state.homeScore       = resumeData?.homeScore ?? 0;
          state.awayScore       = resumeData?.awayScore ?? 0;
          state.confirmedEvents = resumeData?.events ?? [];
          state.pendingEvents   = [];
          state.timerMs         = 0;
          state.isRunning       = false;
        });
      },

      endSession() {
        set((state) => {
          state.matchId         = null;
          state.orgId           = null;
          state.phase           = 'idle';
          state.pendingEvents   = [];
          state.confirmedEvents = [];
          state.homeScore       = 0;
          state.awayScore       = 0;
          state.timerMs         = 0;
          state.isRunning       = false;
        });
      },

      // ── Phase ──────────────────────────────────────────────────────────────

      setPhase(phase) {
        set((state) => {
          state.phase = phase;
          if (phase === 'half_time' || phase === 'finished') {
            state.isRunning = false;
          }
        });
      },

      startTimer() { set((s) => { s.isRunning = true; }); },
      stopTimer()  { set((s) => { s.isRunning = false; }); },
      tickTimer(deltaMs) {
        set((s) => { if (s.isRunning) s.timerMs += deltaMs; });
      },

      // ── Events ─────────────────────────────────────────────────────────────

      addEvent(event) {
        set((state) => {
          // Update score immediately (optimistic)
          if (event.type === 'goal') {
            if (event.team === 'home') state.homeScore++;
            else                       state.awayScore++;
          }

          state.pendingEvents.push({
            localId:    event.id,
            event:      event as HandballEvent,
            syncStatus: 'pending',
          });
        });
      },

      deleteEvent(localId) {
        set((state) => {
          const idx = state.pendingEvents.findIndex((p) => p.localId === localId);
          if (idx === -1) return;

          const ev = state.pendingEvents[idx]!.event;
          // Reverse score
          if (ev.type === 'goal') {
            if (ev.team === 'home') state.homeScore = Math.max(0, state.homeScore - 1);
            else                    state.awayScore = Math.max(0, state.awayScore - 1);
          }

          state.pendingEvents.splice(idx, 1);
        });
      },

      markEventSynced(localId, confirmedEvent) {
        set((state) => {
          const pending = state.pendingEvents.find((p) => p.localId === localId);
          if (pending) pending.syncStatus = 'done';
          state.confirmedEvents.push(confirmedEvent);
          // Remove from pending after a short delay (handled by caller)
        });
      },

      markEventError(localId, error) {
        set((state) => {
          const pending = state.pendingEvents.find((p) => p.localId === localId);
          if (pending) {
            pending.syncStatus = 'error';
            pending.error      = error;
          }
        });
      },

      // ── UI ─────────────────────────────────────────────────────────────────

      selectEvent(id) { set((s) => { s.selectedEventId = id; }); },
    })),

    {
      name:    'sportiq-live-match',
      storage: createJSONStorage(() => localStorage),
      // CRITICAL: only persist the minimum needed to resume a match
      // after a page refresh. Do NOT persist confirmedEvents (large) —
      // they are re-fetched from the server on session resume.
      partialize: (state) => ({
        matchId:       state.matchId,
        orgId:         state.orgId,
        phase:         state.phase,
        homeScore:     state.homeScore,
        awayScore:     state.awayScore,
        timerMs:       state.timerMs,
        pendingEvents: state.pendingEvents.filter((p) => p.syncStatus !== 'done'),
      }),
    },
  ),
);

// ─── Derived selectors ────────────────────────────────────────────────────────

export const useAllEvents = (): HandballEvent[] => {
  const confirmed = useLiveMatchStore((s) => s.confirmedEvents);
  const pending   = useLiveMatchStore((s) => s.pendingEvents.map((p) => p.event));
  return [...confirmed, ...pending].sort((a, b) => a.min - b.min || a.id.localeCompare(b.id));
};

export const usePendingCount = (): number =>
  useLiveMatchStore((s) => s.pendingEvents.filter((p) => p.syncStatus === 'pending').length);

export const useHasUnsyncedErrors = (): boolean =>
  useLiveMatchStore((s) => s.pendingEvents.some((p) => p.syncStatus === 'error'));
