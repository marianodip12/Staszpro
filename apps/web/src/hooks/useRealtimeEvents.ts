'use client';

/**
 * useRealtimeEvents — Supabase Realtime subscription para match_events.
 *
 * Casos de uso:
 *  1. Colaboración coach-analista: dos personas ven el mismo partido en vivo
 *  2. Vista de solo lectura para staff (rol 'viewer') que sigue el partido
 *  3. Pantalla de marcador público embebida
 *
 * Arquitectura:
 *  - Suscripción a INSERT en match_events filtrada por match_id
 *  - Los eventos recibidos se añaden al store local SOLO si no son del mismo
 *    dispositivo (evita duplicados con los pending events propios)
 *  - En caso de desconexión: re-fetcha todos los eventos desde la última vez
 */

import { useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSupabase } from '@/lib/supabase';
import { useLiveMatchStore } from '@/stores/live-match.store';
import { rowToHandballEvent } from '@sportiq/core/handball';
import type { MatchEvent } from '@sportiq/core';

interface UseRealtimeEventsOptions {
  matchId:   string;
  /** Disable when match is finished to avoid zombie subscriptions */
  enabled?:  boolean;
  /** Called when a remote event is received from another client */
  onRemoteEvent?: (event: ReturnType<typeof rowToHandballEvent>) => void;
}

export function useRealtimeEvents({
  matchId,
  enabled = true,
  onRemoteEvent,
}: UseRealtimeEventsOptions) {
  const supabase    = useSupabase();
  const channelRef  = useRef<RealtimeChannel | null>(null);
  const lastSyncRef = useRef<string>(new Date().toISOString());

  const { markEventSynced } = useLiveMatchStore.getState();

  // ── Reconnect handler: re-fetch missed events ──────────────────────────────
  const fetchMissedEvents = useCallback(async () => {
    const { data } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .gt('created_at', lastSyncRef.current)
      .order('created_at', { ascending: true });

    if (!data?.length) return;

    const { pendingEvents } = useLiveMatchStore.getState();
    const localIds = new Set(pendingEvents.map((p) => p.localId));

    for (const row of data) {
      // Skip events that we already have locally (own device)
      if (localIds.has(row.id)) continue;

      const domainEvent = rowToHandballEvent(row as MatchEvent);
      onRemoteEvent?.(domainEvent);

      // Add to confirmed events
      useLiveMatchStore.setState((s) => {
        const alreadyConfirmed = s.confirmedEvents.some((e) => e.id === domainEvent.id);
        if (!alreadyConfirmed) {
          s.confirmedEvents.push(domainEvent);
        }
      });
    }

    lastSyncRef.current = new Date().toISOString();
  }, [matchId, supabase, onRemoteEvent]);

  // ── Subscribe ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !matchId) return;

    const channel = supabase
      .channel(`match-events:${matchId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'match_events',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as MatchEvent;

          // Skip if this is our own event (already in pending queue)
          const { pendingEvents } = useLiveMatchStore.getState();
          const isOwn = pendingEvents.some((p) => p.localId === row.id);
          if (isOwn) return;

          const domainEvent = rowToHandballEvent(row);

          // Update score if it's a goal
          if (row.type === 'goal') {
            useLiveMatchStore.setState((s) => {
              if (row.team === 'home') s.homeScore = row.home_score;
              else                     s.awayScore = row.away_score;
            });
          }

          useLiveMatchStore.setState((s) => {
            const alreadyThere = s.confirmedEvents.some((e) => e.id === domainEvent.id);
            if (!alreadyThere) s.confirmedEvents.push(domainEvent);
          });

          onRemoteEvent?.(domainEvent);
          lastSyncRef.current = row.created_at;
        },
      )
      .on('system', {}, (status) => {
        if (status.status === 'SUBSCRIBED') {
          // Re-sync any events missed during connection setup
          fetchMissedEvents();
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [matchId, enabled, supabase, fetchMissedEvents, onRemoteEvent]);

  // ── Manual sync trigger ────────────────────────────────────────────────────
  const syncNow = useCallback(() => fetchMissedEvents(), [fetchMissedEvents]);

  const isSubscribed = channelRef.current?.state === 'joined';

  return { isSubscribed, syncNow };
}
