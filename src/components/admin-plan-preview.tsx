/**
 * AdminPlanPreview — A small selector visible only to admins.
 *
 * Lets the admin preview the app as if they had a different plan
 * (Free / Pro / Club / Elite) without changing their real plan.
 * While a preview is active, the beta unlock is disabled so the admin
 * sees the real gating of each tier.
 */

import { getPlanPreview, setPlanPreview, type PlanPreview } from '@/lib/use-plan';
import { useEffect, useState } from 'react';

const OPTIONS: { value: PlanPreview; label: string }[] = [
  { value: null,    label: 'Real' },
  { value: 'free',  label: 'Free' },
  { value: 'pro',   label: 'Pro' },
  { value: 'club',  label: 'Club' },
  { value: 'elite', label: 'Elite' },
];

export const AdminPlanPreview = () => {
  const [preview, setPreview] = useState<PlanPreview>(() => getPlanPreview());

  useEffect(() => {
    const handler = () => setPreview(getPlanPreview());
    window.addEventListener('statzpro-plan-preview-change', handler);
    return () => window.removeEventListener('statzpro-plan-preview-change', handler);
  }, []);

  const pick = (v: PlanPreview) => {
    setPlanPreview(v);
    setPreview(v);
  };

  return (
    <div className="mx-3 my-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs">🛡️</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/80">
          Vista admin · Plan
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {OPTIONS.map((opt) => {
          const active = preview === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => pick(opt.value)}
              className={`text-[10px] font-mono py-1 rounded transition-colors ${
                active
                  ? 'bg-amber-500 text-black font-bold'
                  : 'bg-bg-elevated text-muted-fg hover:text-fg border border-border'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {preview !== null && (
        <p className="text-[9px] text-amber-500/70 font-mono mt-1.5 leading-tight">
          Previsualizando como <strong>{preview}</strong>. La beta está desactivada
          en esta vista. Tocá "Real" para volver.
        </p>
      )}
    </div>
  );
};
