import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

/**
 * 👔 Contexto de club — usuarios habilitados.
 *
 * Un usuario invitado por un dueño Club/Elite puede "entrar" al contexto
 * de ese club: a partir de ahí el sync lee y escribe los datos del DUEÑO
 * (según el rol del invitado) en vez de los propios.
 *
 * El contexto se persiste en localStorage y al cambiar se limpia el store
 * local + se recarga la app (mismo patrón que el cambio de cuenta), para
 * no mezclar datos propios con los del club.
 */

export type ClubRole = 'admin' | 'editor' | 'viewer';

export interface ClubContext {
  ownerId: string;
  ownerEmail: string;
  role: ClubRole;
}

export interface ClubMembership {
  owner_id: string;
  owner_email: string;
  role: ClubRole;
}

const CTX_KEY = 'statzpro_club_context';
const STORE_KEY = 'handball-pro-v11'; // clave del zustand/persist

// ─── Lectura sincrónica (la usa sync.ts en el boot) ───────────────────

export const getClubContext = (): ClubContext | null => {
  try {
    const raw = localStorage.getItem(CTX_KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as ClubContext;
    if (!ctx.ownerId || !ctx.role) return null;
    return ctx;
  } catch {
    return null;
  }
};

/** user_id bajo el cual se leen/escriben los datos. */
export const clubDataOwner = (authUid: string): string =>
  getClubContext()?.ownerId ?? authUid;

/** True si estamos en un club con rol de solo lectura. */
export const isClubReadOnly = (): boolean =>
  getClubContext()?.role === 'viewer';

/** True si estamos viendo datos de un club ajeno (cualquier rol). */
export const inClubContext = (): boolean => getClubContext() !== null;

// ─── Cambio de contexto (limpia store local + recarga) ────────────────

const wipeLocalAndReload = () => {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch { /* ignore */ }
  window.location.replace('/app');
};

export const enterClubContext = (ctx: ClubContext): void => {
  localStorage.setItem(CTX_KEY, JSON.stringify(ctx));
  wipeLocalAndReload();
};

export const exitClubContext = (): void => {
  localStorage.removeItem(CTX_KEY);
  wipeLocalAndReload();
};

/** Limpia el contexto SIN recargar (lo usa sync.ts al cambiar de cuenta). */
export const clearClubContextSilent = (): void => {
  try { localStorage.removeItem(CTX_KEY); } catch { /* ignore */ }
};

// ─── Hook: membresías del usuario + contexto activo ───────────────────

export const useClubContext = () => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const ctx = getClubContext();

  const load = useCallback(async () => {
    if (!user) { setMemberships([]); setLoading(false); return; }
    // get_my_club_memberships además auto-vincula invitaciones pendientes
    // que coincidan con el email de la cuenta.
    const { data, error } = await supabase.rpc('get_my_club_memberships');
    if (!error) setMemberships((data as ClubMembership[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // Si el contexto guardado ya no corresponde a una membresía vigente
  // (lo quitaron del club), salimos automáticamente.
  useEffect(() => {
    if (loading || !ctx) return;
    const still = memberships.find((m) => m.owner_id === ctx.ownerId);
    if (!still) {
      exitClubContext();
    } else if (still.role !== ctx.role) {
      // Le cambiaron el rol: actualizamos el contexto y recargamos
      enterClubContext({ ownerId: still.owner_id, ownerEmail: still.owner_email, role: still.role });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, memberships]);

  return {
    /** Contexto activo (null = mis propios datos). */
    ctx,
    /** Clubes a los que el usuario fue invitado y aceptó. */
    memberships,
    loading,
    readOnly: ctx?.role === 'viewer',
    enter: enterClubContext,
    exit: exitClubContext,
    refresh: load,
  };
};

export const ROLE_LABELS: Record<ClubRole, string> = {
  admin: '🛠️ Admin',
  editor: '✏️ Editor',
  viewer: '👁️ Solo lectura',
};
