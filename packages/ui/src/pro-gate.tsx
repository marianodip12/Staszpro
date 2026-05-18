/**
 * @sportiq/ui/pro-gate — Plan-feature access control component.
 *
 * Wraps any UI element that requires a higher-tier plan. If the org's
 * current plan grants the feature, renders children verbatim. Otherwise,
 * renders a "locked" placeholder with an upgrade CTA.
 *
 * The component is plan-agnostic: it receives `plan` as a prop and looks
 * up access via a feature → plans map. That map lives here so apps don't
 * have to repeat plan logic; the @sportiq/auth package's planHasFeature()
 * is the runtime source of truth for permission checks.
 *
 * Usage:
 *   <ProGate feature="clip_export" plan={org.plan}>
 *     <Button>Exportar clip</Button>
 *   </ProGate>
 *
 *   <ProGate
 *     feature="ai_tagging"
 *     plan={org.plan}
 *     fallback={<UpsellBanner />}
 *     mode="hide"
 *   >
 *     <AITaggingPanel />
 *   </ProGate>
 *
 * Modes:
 *   - 'lock' (default): show locked placeholder when feature unavailable
 *   - 'hide':           render nothing when feature unavailable
 *   - 'inline':         show children with reduced opacity + lock overlay
 */

'use client';

import { type ReactNode } from 'react';
import { Lock, Sparkles, ArrowUpRight } from 'lucide-react';
import { cn } from './utils';

// Feature → minimum plan map.
// Mirrors @sportiq/auth's PLAN_FEATURES so the UI can decide without a round-trip.
export type PlanFeatureName =
  | 'video_upload'
  | 'clip_export'
  | 'advanced_analytics'
  | 'timeline_editor'
  | 'team_collaboration'
  | 'custom_branding'
  | 'ai_tagging';

const FEATURE_MIN_PLAN: Record<PlanFeatureName, OrgPlan> = {
  video_upload:        'free',
  clip_export:         'pro',
  advanced_analytics:  'pro',
  timeline_editor:     'pro',
  team_collaboration:  'team',
  custom_branding:     'enterprise',
  ai_tagging:          'enterprise',
};

const FEATURE_LABEL: Record<PlanFeatureName, string> = {
  video_upload:        'Subida de video',
  clip_export:         'Exportar clips',
  advanced_analytics:  'Analytics avanzados',
  timeline_editor:     'Editor de timeline',
  team_collaboration:  'Colaboración entre equipos',
  custom_branding:     'Marca personalizada',
  ai_tagging:          'Etiquetado con IA',
};

export type OrgPlan = 'free' | 'pro' | 'team' | 'enterprise';

const PLAN_RANK: Record<OrgPlan, number> = {
  free:       0,
  pro:        1,
  team:       2,
  enterprise: 3,
};

const PLAN_LABEL: Record<OrgPlan, string> = {
  free:       'Free',
  pro:        'Pro',
  team:       'Team',
  enterprise: 'Enterprise',
};

export function planHasFeature(plan: OrgPlan, feature: PlanFeatureName): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_MIN_PLAN[feature]];
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface ProGateProps {
  feature:     PlanFeatureName;
  plan:        OrgPlan;
  children:    ReactNode;
  fallback?:   ReactNode;
  mode?:       'lock' | 'hide' | 'inline';
  upgradeHref?: string;     // defaults to /settings/billing
  className?:  string;
}

export function ProGate({
  feature,
  plan,
  children,
  fallback,
  mode        = 'lock',
  upgradeHref = '/settings/billing',
  className,
}: ProGateProps) {
  const allowed   = planHasFeature(plan, feature);
  const minPlan   = FEATURE_MIN_PLAN[feature];
  const minLabel  = PLAN_LABEL[minPlan];
  const featLabel = FEATURE_LABEL[feature];

  if (allowed) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  if (mode === 'hide') return null;

  if (mode === 'inline') {
    return (
      <div className={cn('relative', className)}>
        <div className="opacity-40 pointer-events-none select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <a
            href={upgradeHref}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md"
            style={{
              background: 'var(--blue-600)',
              color: 'white',
              border: '1px solid var(--blue-700)',
            }}
          >
            <Lock size={12} />
            Desbloquear en {minLabel}
          </a>
        </div>
      </div>
    );
  }

  // 'lock' (default): replacement placeholder
  return (
    <div
      className={cn('card p-6 flex flex-col items-center text-center', className)}
      style={{ background: 'rgba(37,99,235,.04)', borderStyle: 'dashed' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{
          background: 'rgba(37,99,235,.1)',
          border:     '1px solid rgba(37,99,235,.25)',
        }}
      >
        <Sparkles size={20} style={{ color: 'var(--blue-400)' }} />
      </div>
      <p className="font-display font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
        {featLabel}
      </p>
      <p className="text-xs mb-4 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
        Esta función está disponible a partir del plan {minLabel}.
      </p>
      <a
        href={upgradeHref}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
        style={{ background: 'var(--blue-600)', color: 'white' }}
      >
        Mejorar al plan {minLabel}
        <ArrowUpRight size={12} />
      </a>
    </div>
  );
}

// ─── Hook variant ─────────────────────────────────────────────────────────────
// Useful when you need to branch logic, not just render-wrap.

export function useFeatureGate(feature: PlanFeatureName, plan: OrgPlan) {
  return {
    allowed:  planHasFeature(plan, feature),
    minPlan:  FEATURE_MIN_PLAN[feature],
    minLabel: PLAN_LABEL[FEATURE_MIN_PLAN[feature]],
  };
}
