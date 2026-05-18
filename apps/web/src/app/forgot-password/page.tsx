'use client';

/**
 * Route: /forgot-password
 *
 * Send a magic link to reset the password. Supabase handles the email and
 * the actual reset flow — the user clicks the link, lands on a recovery
 * URL, and is auto-signed-in to update their password.
 */

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { Zap, Mail, ArrowRight, KeyRound } from 'lucide-react';
import { Button, Field, Input } from '@sportiq/ui';
import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const { sendMagicLink } = useAuth();
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);

    const redirect = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
    const { error: err } = await sendMagicLink(email.trim(), redirect);

    setLoading(false);
    if (err) setError(err.message);
    else     setSent(true);
  }, [email, sendMagicLink]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy-950)' }}>

      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue-600)' }}>
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>SportIQ</span>
        </Link>
        <Link href="/login" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Volver a ingresar
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
              style={{ background: 'rgba(37,99,235,.12)', border: '1px solid rgba(37,99,235,.25)' }}
            >
              <KeyRound size={22} style={{ color: 'var(--blue-400)' }} />
            </div>
            <h1 className="font-display font-bold mb-1" style={{ color: 'var(--text-primary)', fontSize: '2rem' }}>
              Recuperar acceso
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Te enviamos un link mágico para entrar sin contraseña.
            </p>
          </div>

          {sent ? (
            <div className="card p-6 text-center">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 mx-auto"
                style={{ background: 'rgba(132,204,22,.12)', border: '1px solid rgba(132,204,22,.25)' }}
              >
                <Mail size={22} style={{ color: 'var(--lime-400)' }} />
              </div>
              <h2 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                Revisá tu email
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                Si <strong>{email}</strong> tiene una cuenta en SportIQ, te llegó un link para ingresar.
              </p>
              <Link
                href="/login"
                className="inline-block px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
                style={{ background: 'var(--navy-700)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' }}
              >
                Volver
              </Link>
            </div>
          ) : (
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

              {error && (
                <div
                  className="text-sm p-3 rounded-lg"
                  style={{ background: 'rgba(239,68,68,.08)', color: 'var(--red-400)', border: '1px solid rgba(239,68,68,.2)' }}
                >
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth loading={loading} rightIcon={<ArrowRight size={16} />}>
                Enviar link mágico
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
