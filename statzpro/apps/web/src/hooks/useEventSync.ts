/**
 * apps/web — useEventSync hook.
 *
 * Drains the pending event queue from the live-match store to Supabase.
 * Runs continuously during a live match session.
 *
 * Strategy:
 *  1. Pick the oldest 'pending' event from the queue
 *  2. Write it to Supabase match_events
 *  3. On success → markEventSynced()
 *  4. On failure → retry up to MAX_RETRIES, then markEventError()
 *
 * The hook is intentionally simple: one event at a time, sequential,
 * no batching in Phase 1. Phase 4 can introduce batch inserts.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase';
import {
  useLiveMatchStore,
  type PendingEvent,
} from '@/stores/live-match.store';
import { handballEventToRow } from '@sportiq/core/handball';

const SYNC_INTERVAL_MS = 1500;   // poll every 1.5s
const MAX_RETRIES      = 3;
const RETRY_DELAY_MS   = 2000;

export function useEventSync() {
  const supabase      = useSupabase();
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryMap      = useRef<Map<string, number>>(new Map());

  const matchId = useLiveMatchStore((s) => s.matchId);
  const orgId   = useLiveMatchStore((s) => s.orgId);
  const { markEventSynced, markEventError } = useLiveMatchStore.getState();

  const syncNext = useCallback(async () => {
    if (!matchId || !orgId) return;

    // Get the store snapshot — don't use the hook (avoid stale closure)
    const { pendingEvents } = useLiveMatchStore.getState();
    const pending = pendingEvents.find((p) => p.syncStatus === 'pending');
    if (!pending) return;

    const retries = retryMap.current.get(pending.localId) ?? 0;
    if (retries >= MAX_RETRIES) {
      markEventError(pending.localId, `Failed after ${MAX_RETRIES} attempts`);
      retryMap.current.delete(pending.localId);
      return;
    }

    try {
      const row = handballEventToRow(pending.event, matchId, orgId);

      const { data, error } = await supabase
        .from('match_events')
        .insert({
          ...row,
          id: pending.localId,    // use local UUID as DB primary key
        })
        .select('*')
        .single();

      if (error) throw error;

      // Map DB row back to domain event
      const confirmedEvent = {
        ...pending.event,
        id: data.id,
      };

      markEventSynced(pending.localId, confirmedEvent);
      retryMap.current.delete(pending.localId);

      // Also update match score in DB (denormalized)
      const { homeScore, awayScore } = useLiveMatchStore.getState();
      await supabase
        .from('matches')
        .update({ home_score: homeScore, away_score: awayScore, updated_at: new Date().toISOString() })
        .eq('id', matchId);

    } catch (err) {
      const count = (retryMap.current.get(pending.localId) ?? 0) + 1;
      retryMap.current.set(pending.localId, count);

      if (count >= MAX_RETRIES) {
        markEventError(pending.localId, err instanceof Error ? err.message : 'Unknown error');
        retryMap.current.delete(pending.localId);
      }
      // else: will retry on next interval
    }
  }, [matchId, orgId, supabase, markEventSynced, markEventError]);

  // Start/stop sync loop based on whether there's an active session
  useEffect(() => {
    if (!matchId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Run immediately, then on interval
    syncNext();
    intervalRef.current = setInterval(syncNext, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [matchId, syncNext]);

  // Retry errors on demand (exposed for UI "Retry" button)
  const retryErrors = useCallback(() => {
    const { pendingEvents } = useLiveMatchStore.getState();
    pendingEvents
      .filter((p) => p.syncStatus === 'error')
      .forEach((p) => {
        retryMap.current.set(p.localId, 0);
        useLiveMatchStore.setState((s) => {
          const ev = s.pendingEvents.find((x) => x.localId === p.localId);
          if (ev) ev.syncStatus = 'pending';
        });
      });
  }, []);

  const pendingCount = useLiveMatchStore((s) =>
    s.pendingEvents.filter((p) => p.syncStatus === 'pending' || p.syncStatus === 'syncing').length
  );
  const errorCount = useLiveMatchStore((s) =>
    s.pendingEvents.filter((p) => p.syncStatus === 'error').length
  );

  return { pendingCount, errorCount, retryErrors };
}
