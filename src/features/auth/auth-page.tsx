import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/cn';

interface AuthPageProps {
  mode: 'signin' | 'signup';
}

export const AuthPage = ({ mode }: AuthPageProps) => {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Escribí tu email arriba y volvé a tocar "¿Olvidaste tu contraseña?"');
      return;
    }
    setResetLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) { setError(err.message); return; }
      setResetSent(true);
    } finally {
      setResetLoading(false);
    }
  };

  // If already logged in, redirect to /app
  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/app';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!email.trim() || !email.includes('@')) {
      setError(t.auth_err_email_required);
      return;
    }
    if (password.length < 6) {
      setError(t.auth_err_password_min);
      return;
    }

    setLoading(true);
    try {
      const errMsg =
        mode === 'signup'
          ? await signUpWithPassword(email, password)
          : await signInWithPassword(email, password);

      if (errMsg) {
        // Map common Supabase errors to friendlier messages
        if (errMsg.toLowerCase().includes('invalid login') || errMsg.toLowerCase().includes('invalid credentials')) {
          setError(t.auth_err_invalid_credentials);
        } else {
          setError(errMsg);
        }
        return;
      }

      if (mode === 'signup') {
        // Supabase requires email confirmation by default. Show success state.
        setSignupSuccess(true);
      } else {
        navigate('/app', { replace: true });
      }
    } catch {
      setError(t.auth_err_generic);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const errMsg = await signInWithGoogle();
      if (errMsg) setError(errMsg);
      // On success Supabase redirects, no need to do anything else
    } catch {
      setError(t.auth_err_generic);
    } finally {
      setLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 md:p-8 text-center space-y-4">
          <div className="text-5xl mb-2">📩</div>
          <h1 className="text-xl md:text-2xl font-bold">{t.auth_check_email_title}</h1>
          <p className="text-sm text-muted-fg leading-relaxed">{t.auth_check_email_desc}</p>
          <Link
            to="/"
            className="inline-block mt-3 text-sm text-primary hover:underline"
          >
            ← {t.auth_back_to_landing}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col">
      <header className="px-4 md:px-6 h-14 flex items-center border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <img src="/statzpro-favicon.svg" alt="StatzPro" className="w-7 h-7 rounded-md" />
          <span className="text-sm font-semibold tracking-tight">StatzPro</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 md:p-8 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-center">
              {mode === 'signup' ? t.auth_signup_title : t.auth_signin_title}
            </h1>
          </div>

          {error && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-muted-fg mb-1.5">
                {t.auth_email}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md bg-bg border border-border text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-muted-fg mb-1.5">
                {t.auth_password}
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md bg-bg border border-border text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {mode === 'signup' && (
                <p className="text-[11px] text-muted-fg mt-1">{t.auth_password_help}</p>
              )}
              {mode === 'signin' && (
                <div className="mt-1.5 text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-[11px] text-primary hover:underline disabled:opacity-50"
                  >
                    {resetLoading ? 'Enviando…' : '¿Olvidaste tu contraseña?'}
                  </button>
                </div>
              )}
              {resetSent && (
                <p className="mt-1.5 text-[11px] text-goal bg-goal/10 border border-goal/30 rounded-md px-2.5 py-1.5">
                  📩 Te mandamos un mail con el link para crear una contraseña nueva. Revisá spam si no aparece.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-fg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {loading
                ? t.auth_loading
                : mode === 'signup'
                  ? t.auth_signup_button
                  : t.auth_signin_button}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="flex-1 h-px bg-border" />
            <span className="px-3 text-[10px] uppercase tracking-widest text-muted-fg">
              {t.auth_or}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google button - disabled for now */}
          <div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled
              title={t.auth_google_disabled_help}
              className={cn(
                'w-full px-4 py-2.5 rounded-md border border-border bg-surface-2/50',
                'flex items-center justify-center gap-2 text-sm font-medium',
                'opacity-50 cursor-not-allowed',
              )}
            >
              <GoogleIcon />
              <span>{t.auth_google_button}</span>
            </button>
            <p className="text-[10px] text-muted-fg text-center mt-1">
              {t.auth_google_disabled_help}
            </p>
          </div>

          <div className="text-center text-sm text-muted-fg">
            {mode === 'signup' ? (
              <>
                {t.auth_have_account}{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  {t.auth_to_signin}
                </Link>
              </>
            ) : (
              <>
                {t.auth_no_account}{' '}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  {t.auth_to_signup}
                </Link>
              </>
            )}
          </div>

          <div className="text-center">
            <Link to="/" className="text-xs text-muted-fg hover:text-fg transition-colors">
              ← {t.auth_back_to_landing}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);
