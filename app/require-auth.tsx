import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';

/**
 * Wraps protected routes. Behavior:
 *  - While auth state is loading → show a small placeholder
 *  - If not authenticated → redirect to /login (preserving current path)
 *  - If authenticated → render the children via <Outlet />
 *
 * Anonymous Supabase sessions count as "not authenticated" for this purpose,
 * since the landing/auth flow only treats real (email-bound) users as logged in.
 */
export const RequireAuth = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const t = useT();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-fg">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          {t.auth_loading}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  return <Outlet />;
};
