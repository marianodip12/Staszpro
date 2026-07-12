import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useProfileType } from '@/lib/use-profile-type';
import type { ProfileType } from '@/lib/personal-profile-api';

interface Props {
  /** Rol requerido para renderizar los children. */
  require: ProfileType;
  children: ReactNode;
}

/**
 * Gatea una ruta por profile_type efectivo (respeta el override admin).
 *
 * - `require="coach"` sobre una página coach: si el user es player → redirect a /app/player/home
 * - `require="player"` sobre /app/player/home: si el user es coach → redirect a /app
 * - Mientras carga, muestra nada (evita flash).
 * - Si por algún motivo profileType es null (users viejos sin migrar), asume coach
 *   para no bloquear la app existente.
 */
export const ProfileTypeGuard = ({ require, children }: Props) => {
  const { profileType, isLoading } = useProfileType();

  if (isLoading) return null;

  // Fallback: null → coach (para no romper users existentes sin profile_type seteado).
  const effective = profileType ?? 'coach';

  if (require === 'coach' && effective === 'player') {
    return <Navigate to="/app/player/home" replace />;
  }
  if (require === 'player' && effective === 'coach') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
