import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

export type Plan = 'free' | 'pro' | 'club' | 'elite';

/**
 * MODO BETA: durante los primeros ~90 días desde el lanzamiento de v11,
 * todos los planes pagos están desbloqueados para todos los usuarios.
 * El banner BetaBanner lo comunica en cada pantalla.
 *
 * Para apagar el modo beta antes de tiempo: poner una fecha en el pasado.
 * Para extenderlo: mover la fecha más adelante.
 */
export const BETA_UNTIL = new Date('2026-08-09T23:59:59-03:00');

export interface PlanInfo {
  plan: Plan;
  isAdmin: boolean;
  matchCount: number;
  matchLimit: number; // -1 = ilimitado
  canCreateMatch: boolean;
  loading: boolean;
  /** True si todavía estamos dentro de la ventana beta. */
  betaActive: boolean;
  /** Fecha (Date object) en que termina la beta. */
  betaUntil: Date;
}

const DEFAULT_PLAN_INFO: Omit<PlanInfo, 'betaActive' | 'betaUntil'> = {
  plan: 'free',
  isAdmin: false,
  matchCount: 0,
  matchLimit: 10,
  canCreateMatch: true,
  loading: true,
};

/**
 * Compatibilidad: hasCompleteMode/hasVideoAndAI aceptan tanto un `Plan`
 * crudo como un objeto `{plan, betaActive}`. Si pasás el objeto y la beta
 * está activa, devuelven true sin importar el plan.
 */
export type PlanOrInfo = Plan | { plan: Plan; betaActive?: boolean };

const resolve = (p: PlanOrInfo): { plan: Plan; betaActive: boolean } => {
  if (typeof p === 'string') return { plan: p, betaActive: false };
  return { plan: p.plan, betaActive: p.betaActive === true };
};

export const usePlan = (): PlanInfo & { refresh: () => Promise<void> } => {
  const { user } = useAuth();
  const [info, setInfo] = useState<Omit<PlanInfo, 'betaActive' | 'betaUntil'>>(DEFAULT_PLAN_INFO);

  // Recalculamos `betaActive` en cada render, así si la página queda abierta
  // pasando la medianoche del último día, el estado se ajusta solo.
  const betaActive = useMemo(() => Date.now() < BETA_UNTIL.getTime(), []);

  const refresh = useCallback(async () => {
    if (!user) {
      setInfo({ ...DEFAULT_PLAN_INFO, loading: false });
      return;
    }

    const { data, error } = await supabase.rpc('get_my_plan');
    if (error || !data || data.length === 0) {
      console.error('[plan] error:', error?.message);
      setInfo({ ...DEFAULT_PLAN_INFO, loading: false });
      return;
    }

    const row = data[0];
    setInfo({
      plan: row.plan as Plan,
      isAdmin: row.is_admin,
      matchCount: row.match_count,
      matchLimit: row.match_limit,
      canCreateMatch: row.can_create_match,
      loading: false,
    });
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...info, betaActive, betaUntil: BETA_UNTIL, refresh };
};

// Helper: ¿este plan (o este {plan, betaActive}) tiene acceso al Modo Completo?
export const hasCompleteMode = (p: PlanOrInfo): boolean => {
  const { plan, betaActive } = resolve(p);
  if (betaActive) return true;
  return plan === 'pro' || plan === 'club' || plan === 'elite';
};

// Helper: ¿este plan tiene acceso a videos + IA?
export const hasVideoAndAI = (p: PlanOrInfo): boolean => {
  const { plan, betaActive } = resolve(p);
  if (betaActive) return true;
  return plan === 'club' || plan === 'elite';
};

/** Cantidad de días restantes de beta (round-down, mínimo 0). */
export const betaDaysLeft = (until: Date = BETA_UNTIL): number => {
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};
