'use client';

/**
 * Route: /signup
 *
 * Account creation with email + password. On success, the user is taken to
 * /onboarding where they create their first organization (the DB trigger
 * already creates a personal org on signup, but the user picks the name).
 */

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Mail, KeyRound, User, ArrowRight, UserPlus } from 'lucide-react';
import { Button, Field, Input } from '@sportiq/ui';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
  const router       = useRouter();
  const { signUp }   = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setError(null); setLoading(true);

    const { error: authError } = await signUp({
      email:       email.trim(),
      password,
      displayName: displayName.trim() || undefined,
    });

    setLoading(false);

    if (authError) {
      setError(
        authError.message === 'User already registered'
          ? 'Ese email ya tiene una cuenta. Probá ingresar.'
          : authError.message,
      );
      return;
    }

    // Supabase may require email confirmation depending on project settings.
    // If the session is null after signUp, show the "check your email" screen.
    setNeedsEmailConfirm(true);
    // We don't push to onboarding yet — wait for confirmation. If the project
    // is configured to auto-confirm, the auth state listener in useAuth will
    // fire and the user can click the button below to continue.
  }, [email, password, displayName, signUp]);

  // ─── Post-signup confirmation screen ────────────────────────────────────────

  if (needsEmailConfirm) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--navy-950)' }}>
        <div className="card p-8 max-w-md text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
            style={{ background: 'rgba(132,204,22,.12)', border: '1px solid rgba(132,204,22,.25)' }}
          >
            <Mail size={22} style={{ color: 'var(--lime-400)' }} />
          </div>
          <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
            Confirmá tu email
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Te enviamos un link a <strong>{email}</strong>. Hacé clic ahí para activar tu cuenta y empezar.
          </p>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
            Revisá la carpeta de spam si no lo ves en unos minutos.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={() => router.push('/login')} fullWidth>
              Ir a ingresar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setNeedsEmailConfirm(false); setEmail(''); setPassword(''); }}
              fullWidth
            >
              Usar otro email
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Signup form ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy-950)' }}>

      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue-600)' }}>
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>SportIQ</span>
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium transition-colors hover:brightness-110"
          style={{ color: 'var(--text-secondary)' }}
        >
          ¿Ya tenés cuenta? <span style={{ color: 'var(--blue-400)' }}>Ingresar</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
              style={{ background: 'rgba(132,204,22,.12)', border: '1px solid rgba(132,204,22,.25)' }}
            >
              <UserPlus size={22} style={{ color: 'var(--lime-400)' }} />
            </div>
            <h1 className="font-display font-bold mb-1" style={{ color: 'var(--text-primary)', fontSize: '2rem' }}>
              Creá tu cuenta
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Empezá gratis, sin tarjeta. Subí video y registrá partidos hoy.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-4">

            <Field label="Nombre" htmlFor="displayName" helper="Cómo te van a ver en tu equipo.">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <Input
                  id="displayName"
                  type="text"
                  autoComplete="name"
                  placeholder="Pablo García"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </Field>

            <Field label="Email" htmlFor="email" required>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="entrenador@equipo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9"
                />
              </div>
            </Field>

            <Field label="Contraseña" htmlFor="password" helper="Mínimo 8 caracteres." required>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pl-9"
                />
              </div>
            </Field>

            {error && (
              <div
                className="text-sm p-3 rounded-lg"
                style={{ background: 'rgba(239,68,68,.08)', color: 'var(--red-400)', border: '1px solid rgba(239,68,68,.2)' }}
              >
                {error}
              </div>
            )}

            <Button type="submit" fullWidth loading={loading} rightIcon={<ArrowRight size={16} />}>
              Crear cuenta gratis
            </Button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
            Al crear una cuenta, aceptás los{' '}
            <Link href="/terms" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
              Términos
            </Link>{' '}
            y{' '}
            <Link href="/privacy" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
              Política de privacidad
            </Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
