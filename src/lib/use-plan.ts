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
export const BETA_UNTIL = new Date('2026-08-31T23:59:59-03:00');

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

// ─── Admin plan preview override ─────────────────────────────────────────────
// Lets an admin preview the app as Free/Pro/Club/Elite without changing their
// real plan. Stored in localStorage so it persists across page navigations.
// When a preview is active, the beta unlock is also disabled so the admin sees
// exactly what that plan tier really gets.

const PREVIEW_KEY = 'statzpro_admin_plan_preview';

export type PlanPreview = Plan | null;

export const getPlanPreview = (): PlanPreview => {
  try {
    const v = localStorage.getItem(PREVIEW_KEY);
    if (v === 'free' || v === 'pro' || v === 'club' || v === 'elite') return v;
  } catch { /* ignore */ }
  return null;
};

export const setPlanPreview = (p: PlanPreview): void => {
  try {
    if (p === null) localStorage.removeItem(PREVIEW_KEY);
    else localStorage.setItem(PREVIEW_KEY, p);
    // Notify listeners in the same tab
    window.dispatchEvent(new Event('statzpro-plan-preview-change'));
  } catch { /* ignore */ }
};

export const usePlan = (): PlanInfo & { refresh: () => Promise<void> } => {
  const { user } = useAuth();
  const [info, setInfo] = useState<Omit<PlanInfo, 'betaActive' | 'betaUntil'>>(DEFAULT_PLAN_INFO);
  const [preview, setPreview] = useState<PlanPreview>(() => getPlanPreview());

  // Listen for preview changes (from the admin selector)
  useEffect(() => {
    const handler = () => setPreview(getPlanPreview());
    window.addEventListener('statzpro-plan-preview-change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('statzpro-plan-preview-change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // Beta is active normally — but DISABLED while previewing a plan, so the
  // admin sees the real gating of that tier.
  const betaActive = useMemo(
    () => preview === null && Date.now() < BETA_UNTIL.getTime(),
    [preview],
  );

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

  // If a preview is active, override the plan the rest of the app sees.
  // isAdmin stays true so the admin can still turn the preview off.
  const effectivePlan: Plan = preview ?? info.plan;
  const effectiveLimit = preview
    ? (preview === 'club' || preview === 'elite' ? -1 : preview === 'pro' ? 50 : 10)
    : info.matchLimit;

  return {
    ...info,
    plan: effectivePlan,
    matchLimit: effectiveLimit,
    betaActive,
    betaUntil: BETA_UNTIL,
    refresh,
  };
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
