'use client';

/**
 * Route: /onboarding
 *
 * First-time setup. Two steps:
 *   1. Pick an organization name (slug is derived automatically).
 *   2. Pick a sport (handball is the only one fully built; others gated).
 *
 * On submit, calls the `bootstrap_first_org` RPC which:
 *   - Creates the organization
 *   - Adds the calling user as 'owner' in org_members
 *   - Optionally creates a default season
 *
 * If the user is already a member of any org, redirect to its dashboard.
 */

import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowRight, Trophy, LogOut } from 'lucide-react';
import { Button, Field, Input } from '@sportiq/ui';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/lib/supabase-provider';
import type { SportType } from '@sportiq/core';

interface SportOption {
  id:        SportType;
  label:     string;
  available: boolean;
  emoji:     string;
}

const SPORTS: SportOption[] = [
  { id: 'handball',   label: 'Handball',   available: true,  emoji: '🤾' },
  { id: 'basketball', label: 'Básquet',    available: false, emoji: '🏀' },
  { id: 'soccer',     label: 'Fútbol',     available: false, emoji: '⚽' },
  { id: 'volleyball', label: 'Voley',      available: false, emoji: '🏐' },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export default function OnboardingPage() {
  const router               = useRouter();
  const supabase             = useSupabase();
  const { user, loading: authLoading, signOut } = useAuth();

  const [orgName,  setOrgName]  = useState('');
  const [sport,    setSport]    = useState<SportType>('handball');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // ── Redirect if user already has an org ────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }

    (async () => {
      const { data } = await supabase
        .from('org_members')
        .select('organizations(slug)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const slug = (data?.organizations as { slug?: string } | null)?.slug;
      if (slug) {
        router.replace(`/${slug}/dashboard`);
        return;
      }
      setChecking(false);
    })();
  }, [user, authLoading, router, supabase]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = orgName.trim();
    if (trimmed.length < 2) { setError('El nombre del equipo es muy corto.'); return; }

    setLoading(true); setError(null);
    const slug = slugify(trimmed);

    // Insert org. The RLS policy allows authenticated users to create their own org.
    const { data: org, error: insertError } = await supabase
      .from('organizations')
      .insert({
        name:       trimmed,
        slug,
        sport_type: sport,
        plan:       'free',
      })
      .select('id, slug')
      .single();

    if (insertError || !org) {
      setLoading(false);
      setError(
        insertError?.code === '23505'
          ? 'Ese nombre ya está en uso. Probá con otro.'
          : insertError?.message ?? 'No pudimos crear la organización.',
      );
      return;
    }

    // Add the user as owner. The DB trigger may already do this; we upsert just in case.
    const { error: memberError } = await supabase
      .from('org_members')
      .upsert({
        org_id:  org.id,
        user_id: user!.id,
        role:    'owner',
      });

    if (memberError) {
      setLoading(false);
      setError('Tu organización fue creada pero no pudimos asignarte como propietario. Contactá soporte.');
      return;
    }

    router.push(`/${org.slug}/dashboard`);
  }, [orgName, sport, user, supabase, router]);

  // ── Render gates ───────────────────────────────────────────────────────────

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy-950)' }}>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cargando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy-950)' }}>

      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue-600)' }}>
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>SportIQ</span>
        </Link>
        <button
          onClick={async () => { await signOut(); router.push('/login'); }}
          className="text-xs flex items-center gap-1.5 transition-colors hover:brightness-110"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={12} /> Salir
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">

          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
              style={{ background: 'rgba(37,99,235,.12)', border: '1px solid rgba(37,99,235,.25)' }}
            >
              <Trophy size={22} style={{ color: 'var(--blue-400)' }} />
            </div>
            <h1 className="font-display font-bold mb-1" style={{ color: 'var(--text-primary)', fontSize: '2rem' }}>
              Crea tu organización
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Un espacio para tu equipo o club. Después podés invitar a tu staff.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-5">

            <Field
              label="Nombre del equipo o club"
              htmlFor="orgName"
              helper={orgName.trim() ? `URL: sportiq.app/${slugify(orgName)}` : 'Lo verás en todas las páginas.'}
              required
            >
              <Input
                id="orgName"
                type="text"
                autoFocus
                autoComplete="organization"
                placeholder="River Plate Handball"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                minLength={2}
              />
            </Field>

            <Field label="Deporte principal" required>
              <div className="grid grid-cols-2 gap-2">
                {SPORTS.map((s) => {
                  const selected = sport === s.id;
                  const disabled = !s.available;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSport(s.id)}
                      className="relative flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all"
                      style={{
                        background:  selected ? 'rgba(37,99,235,.12)' : 'var(--navy-800)',
                        borderColor: selected ? 'var(--blue-500)' : 'var(--surface-border)',
                        color:       disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                        opacity:     disabled ? .55 : 1,
                        cursor:      disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span className="text-lg">{s.emoji}</span>
                      <span>{s.label}</span>
                      {!s.available && (
                        <span
                          className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded font-mono"
                          style={{ background: 'var(--navy-700)', color: 'var(--text-muted)' }}
                        >
                          Pronto
                        </span>
                      )}
                    </button>
                  );
                })}
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
              Crear organización
            </Button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
            Después podés crear más organizaciones desde Ajustes.
          </p>
        </div>
      </main>
    </div>
  );
}
