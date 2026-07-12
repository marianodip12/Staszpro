/**
 * AdminProfilePreview — Selector visible solo para admins.
 *
 * Permite previsualizar la app como si el admin fuese coach o jugador,
 * sin cambiar el profile_type real. Mismo patrón que AdminPlanPreview.
 *
 * Importante: el override es solo visual (localStorage). Las RLS de la DB
 * siguen aplicando sobre el profile_type real, así que un admin en modo
 * "player preview" no puede escribir a personal_matches si su valor real
 * de DB es 'coach'. Eso es intencional.
 */

import { useEffect, useState } from 'react';
import {
  getProfileTypePreview,
  setProfileTypePreview,
  type ProfileTypePreview,
} from '@/lib/use-profile-type';

const OPTIONS: { value: ProfileTypePreview; label: string }[] = [
  { value: null,     label: 'Real'   },
  { value: 'coach',  label: 'Coach'  },
  { value: 'player', label: 'Player' },
];

export const AdminProfilePreview = () => {
  const [preview, setPreview] = useState<ProfileTypePreview>(() => getProfileTypePreview());

  useEffect(() => {
    const handler = () => setPreview(getProfileTypePreview());
    window.addEventListener('statzpro-profile-preview-change', handler);
    return () => window.removeEventListener('statzpro-profile-preview-change', handler);
  }, []);

  const pick = (v: ProfileTypePreview) => {
    setProfileTypePreview(v);
    setPreview(v);
  };

  return (
    <div className="mx-3 my-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs">🛡️</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/80">
          Vista admin · Rol
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1">
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
          Previsualizando como <strong>{preview}</strong>. Escrituras a la DB
          siguen usando tu rol real. Tocá "Real" para volver.
        </p>
      )}
    </div>
  );
};
