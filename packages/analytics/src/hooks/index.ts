/**
 * @sportiq/analytics/hooks — React hooks para el pipeline de analytics.
 *
 * Estos hooks son wrappers ligeros sobre el pipeline puro,
 * añadiendo memoización y estado de loading para uso en componentes.
 *
 * NO tienen dependencias de Supabase — reciben los datos como props.
 * El fetching es responsabilidad de TanStack Query en apps/web.
 */

'use client';

import { useMemo } from 'react';
import {
  computeSeasonAggregates,
  type MatchRecord,
  type SeasonAggregates,
} from '../pipeline/season';

// ─── useSeasonAggregates ──────────────────────────────────────────────────────

interface UseSeasonAggregatesResult {
  aggregates: SeasonAggregates | null;
  isEmpty:    boolean;
}

export function useSeasonAggregates(
  records:    MatchRecord[],
  myTeamName: string,
): UseSeasonAggregatesResult {
  const aggregates = useMemo(
    () => records.length > 0 ? computeSeasonAggregates(records, myTeamName) : null,
    [records, myTeamName],
  );

  return {
    aggregates,
    isEmpty: records.length === 0,
  };
}

// ─── useFormIndicator ─────────────────────────────────────────────────────────

type FormResult = 'W' | 'D' | 'L';

interface UseFormResult {
  form:    FormResult[];
  streak:  { type: FormResult; count: number } | null;
  winRate: number;
}

export function useFormIndicator(
  records:    MatchRecord[],
  myTeamName: string,
  last        = 5,
): UseFormResult {
  return useMemo(() => {
    if (records.length === 0) return { form: [], streak: null, winRate: 0 };

    const agg = computeSeasonAggregates(records, myTeamName);
    const totalMatches = agg.totals.played;
    const form = totalMatches > 0
      ? buildRawForm(records, myTeamName).slice(-last)
      : [];

    const winRate = totalMatches === 0 ? 0 : Math.round((agg.totals.wins / totalMatches) * 100);

    return {
      form,
      streak:  agg.streaks.current.count > 0 ? agg.streaks.current : null,
      winRate,
    };
  }, [records, myTeamName, last]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRawForm(records: MatchRecord[], team: string): FormResult[] {
  return records.map(({ summary }) => {
    const isHome = summary.home === team;
    const mine   = isHome ? summary.hs : summary.as;
    const theirs = isHome ? summary.as : summary.hs;
    return mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
  });
}
