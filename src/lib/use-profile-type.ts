import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyProfileType,
  setMyProfileType,
  type ProfileType,
} from './personal-profile-api';

const KEY = ['profile-type'] as const;

// ─── Admin profile_type preview override ─────────────────────────────────────
// Lets an admin preview the app as coach or player without changing their real
// profile_type. Stored in localStorage so it persists across page navigations.
// Mismo patrón que AdminPlanPreview / use-plan.

const PREVIEW_KEY = 'statzpro_admin_profile_preview';

export type ProfileTypePreview = ProfileType | null;

export const getProfileTypePreview = (): ProfileTypePreview => {
  try {
    const v = localStorage.getItem(PREVIEW_KEY);
    if (v === 'coach' || v === 'player') return v;
  } catch { /* ignore */ }
  return null;
};

export const setProfileTypePreview = (p: ProfileTypePreview): void => {
  try {
    if (p === null) localStorage.removeItem(PREVIEW_KEY);
    else localStorage.setItem(PREVIEW_KEY, p);
    window.dispatchEvent(new Event('statzpro-profile-preview-change'));
  } catch { /* ignore */ }
};

export interface ProfileTypeState {
  /** Efectivo: si hay preview activo, devuelve el preview; sino el real. */
  profileType: ProfileType | null;
  /** El valor real de la DB, ignorando el override. */
  realProfileType: ProfileType | null;
  isLoading: boolean;
  isPlayer: boolean;
  isCoach: boolean;
  /** True si el admin está viendo la app como otro rol. */
  isPreviewActive: boolean;
}

export function useProfileType(): ProfileTypeState {
  const q = useQuery({
    queryKey: KEY,
    queryFn: getMyProfileType,
    staleTime: 5 * 60 * 1000,
  });

  const [preview, setPreview] = useState<ProfileTypePreview>(() => getProfileTypePreview());

  useEffect(() => {
    const handler = () => setPreview(getProfileTypePreview());
    window.addEventListener('statzpro-profile-preview-change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('statzpro-profile-preview-change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const real = (q.data as ProfileType | null | undefined) ?? null;
  const effective: ProfileType | null = preview ?? real;

  return {
    profileType: effective,
    realProfileType: real,
    isLoading: q.isLoading,
    isPlayer: effective === 'player',
    isCoach: effective === 'coach',
    isPreviewActive: preview !== null,
  };
}

export function useSetProfileType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: ProfileType) => setMyProfileType(type),
    onSuccess: (newType) => {
      qc.setQueryData(KEY, newType);
    },
  });
}
