'use client';

/**
 * Route: /login
 *
 * Email + password sign-in.
 * On success, Supabase persists the session and the middleware lets the user
 * through to the redirect target (?redirect=...) or /.
 */

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Mail, KeyRound, ArrowRight, LogIn } from 'lucide-react';
import { Button, Field, Input } from '@sportiq/ui';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { signIn }   = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);

    const { error: authError } = await signIn({ email: email.trim(), password });

    if (authError) {
      setLoading(false);
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : authError.message,
      );
      return;
    }

    // Success → push to redirect or home (root page will route to first org)
    const redirect = searchParams.get('redirect') ?? '/';
    router.push(redirect);
    router.refresh();
  }, [email, password, signIn, router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy-950)' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue-600)' }}>
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>SportIQ</span>
        </Link>
        <Link
          href="/signup"
          className="text-sm font-medium transition-colors hover:brightness-110"
          style={{ color: 'var(--text-secondary)' }}
        >
          ¿No tenés cuenta? <span style={{ color: 'var(--blue-400)' }}>Crear cuenta</span>
        </Link>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
              style={{ background: 'rgba(37,99,235,.12)', border: '1px solid rgba(37,99,235,.25)' }}
            >
              <LogIn size={22} style={{ color: 'var(--blue-400)' }} />
            </div>
            <h1 className="font-display font-bold mb-1" style={{ color: 'var(--text-primary)', fontSize: '2rem' }}>
              Ingresá a tu cuenta
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Bienvenido de vuelta. Continuamos donde lo dejaste.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-4">

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

            <Field label="Contraseña" htmlFor="password" required>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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
              Ingresar
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/forgot-password"
                className="text-xs hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
            Al ingresar, aceptás nuestros{' '}
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
