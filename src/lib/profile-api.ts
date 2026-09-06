import { supabase } from './supabase';

/**
 * Perfil editable del usuario. RLS (`profiles_self`) permite que cada uno
 * lea y escriba SOLO su propia fila, así que vamos directo a la tabla.
 *
 * Nota: `profile_type` (coach/player) define qué ve la app y se elige al
 * registrarse — acá es solo lectura. `role_tag` es un "cargo" informativo
 * aparte (no cambia la navegación).
 */

export type RoleTag = 'player' | 'coach' | 'owner' | 'analyst' | 'other';

export const ROLE_TAGS: { key: RoleTag; label: string }[] = [
  { key: 'player',  label: 'Jugador/a' },
  { key: 'coach',   label: 'Entrenador/a (DT)' },
  { key: 'owner',   label: 'Dueño/a de club' },
  { key: 'analyst', label: 'Analista' },
  { key: 'other',   label: 'Otro' },
];

export interface MyProfile {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  club_name: string | null;
  role_tag: RoleTag | null;
  profile_type: 'coach' | 'player';
}

export interface ProfileUpdate {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  club_name: string | null;
  role_tag: RoleTag | null;
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, first_name, last_name, phone, club_name, role_tag, profile_type')
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  return (data as MyProfile) ?? null;
}

export async function getMyPlanSummary(): Promise<{ plan: string; expires_at: string | null } | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('user_plans')
    .select('plan, expires_at')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw error;
  return (data as { plan: string; expires_at: string | null }) ?? null;
}

export async function updateMyProfile(patch: ProfileUpdate): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('No hay sesión activa.');
  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: patch.first_name?.trim() || null,
      last_name: patch.last_name?.trim() || null,
      phone: patch.phone?.trim() || null,
      club_name: patch.club_name?.trim() || null,
      role_tag: patch.role_tag ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', uid);
  if (error) throw error;
}
