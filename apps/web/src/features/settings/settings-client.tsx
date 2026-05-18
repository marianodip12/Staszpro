'use client';

/**
 * SettingsClient — Tabs: Perfil · Organización · Plan
 *
 * Owners and coaches can edit org settings; analysts and viewers can only
 * edit their own profile. Plan changes show pricing tiers (no billing yet).
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon, Building2, Sparkles, Check, AlertTriangle, LogOut,
  Trash2, ExternalLink,
} from 'lucide-react';
import { Button, Field, Input, Dialog, DialogHeader, DialogBody, DialogFooter, useToast } from '@sportiq/ui';
import { useSupabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Organization, OrgMemberRole, UserProfile, OrgPlan } from '@sportiq/core';

interface SettingsClientProps {
  org:       Organization;
  role:      OrgMemberRole;
  profile:   UserProfile;
  userEmail: string;
}

type Tab = 'profile' | 'organization' | 'plan';

export function SettingsClient({ org, role, profile, userEmail }: SettingsClientProps) {
  const [tab, setTab] = useState<Tab>('profile');

  const canEditOrg = role === 'owner' || role === 'coach';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl" style={{ color: 'var(--text-primary)' }}>
          Ajustes
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gestioná tu perfil, organización y plan.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6" style={{ borderColor: 'var(--surface-border)' }}>
        {([
          { id: 'profile',       label: 'Perfil',       icon: UserIcon  },
          { id: 'organization',  label: 'Organización', icon: Building2 },
          { id: 'plan',          label: 'Plan',         icon: Sparkles  },
        ] as const).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative"
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <t.icon size={14} />
              {t.label}
              {active && (
                <div
                  className="absolute left-0 right-0 -bottom-px h-0.5"
                  style={{ background: 'var(--blue-500)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {tab === 'profile'      && <ProfileTab profile={profile} userEmail={userEmail} />}
      {tab === 'organization' && <OrgTab org={org} canEdit={canEditOrg} />}
      {tab === 'plan'         && <PlanTab org={org} canEdit={role === 'owner'} />}
    </div>
  );
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({ profile, userEmail }: { profile: UserProfile; userEmail: string }) {
  const supabase     = useSupabase();
  const router       = useRouter();
  const toast        = useToast();
  const { signOut }  = useAuth();

  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [saving,      setSaving]      = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const trimmed = displayName.trim();
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: profile.id, display_name: trimmed || null });
    setSaving(false);

    if (error) toast.error('No pudimos guardar el perfil', { title: error.message });
    else       toast.success('Perfil actualizado');
  }, [displayName, supabase, profile.id, toast]);

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
          Información personal
        </h2>
        <div className="space-y-4 max-w-md">
          <Field label="Nombre">
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre"
            />
          </Field>
          <Field label="Email" helper="Para cambiar el email, contactá soporte.">
            <Input type="email" value={userEmail} disabled />
          </Field>
          <Button onClick={handleSave} loading={saving}>Guardar cambios</Button>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
          Sesión
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Cerrar sesión te desconecta de todas tus organizaciones en este dispositivo.
        </p>
        <Button variant="secondary" leftIcon={<LogOut size={14} />} onClick={() => setShowSignOut(true)}>
          Cerrar sesión
        </Button>
      </section>

      <Dialog open={showSignOut} onOpenChange={setShowSignOut} maxWidth="sm">
        <DialogHeader title="¿Cerrar sesión?" onClose={() => setShowSignOut(false)} />
        <DialogBody>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Vas a salir de SportIQ. Volvé a ingresar cuando quieras retomar el trabajo.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setShowSignOut(false)}>Cancelar</Button>
          <Button variant="danger" onClick={async () => { await signOut(); router.push('/login'); }}>
            Cerrar sesión
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ─── Organization tab ─────────────────────────────────────────────────────────

function OrgTab({ org, canEdit }: { org: Organization; canEdit: boolean }) {
  const supabase = useSupabase();
  const router   = useRouter();
  const toast    = useToast();

  const [name,     setName]     = useState(org.name);
  const [logoUrl,  setLogoUrl]  = useState(org.logo_url ?? '');
  const [saving,   setSaving]   = useState(false);

  const handleSave = useCallback(async () => {
    if (!canEdit) return;
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        name:     name.trim(),
        logo_url: logoUrl.trim() || null,
      })
      .eq('id', org.id);
    setSaving(false);
    if (error) toast.error('No pudimos guardar', { title: error.message });
    else       { toast.success('Organización actualizada'); router.refresh(); }
  }, [name, logoUrl, supabase, org.id, canEdit, toast, router]);

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>
          Datos de la organización
        </h2>

        {!canEdit && (
          <div
            className="text-sm p-3 rounded-lg mb-4 flex items-start gap-2"
            style={{ background: 'rgba(245,158,11,.08)', color: 'var(--amber-400)', border: '1px solid rgba(245,158,11,.2)' }}
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Solo el propietario o el entrenador principal pueden editar la organización.</span>
          </div>
        )}

        <div className="space-y-4 max-w-md">
          <Field label="Nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Slug (URL)" helper="No se puede cambiar después de creado.">
            <Input value={org.slug} disabled />
          </Field>
          <Field label="Deporte">
            <Input value={org.sport_type} disabled />
          </Field>
          <Field label="Logo (URL)" helper="Pegá la URL de una imagen pública (cuadrada, 256×256 recomendado).">
            <Input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              disabled={!canEdit}
            />
          </Field>
          {canEdit && (
            <Button onClick={handleSave} loading={saving}>Guardar cambios</Button>
          )}
        </div>
      </section>

      {canEdit && (
        <section className="card p-6" style={{ borderColor: 'rgba(239,68,68,.3)' }}>
          <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--red-400)' }}>
            Zona de peligro
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Eliminar la organización borra todos sus partidos, equipos y videos. Esta acción es irreversible.
          </p>
          <Button variant="danger" leftIcon={<Trash2 size={14} />} disabled>
            Eliminar organización (deshabilitado)
          </Button>
        </section>
      )}
    </div>
  );
}

// ─── Plan tab ─────────────────────────────────────────────────────────────────

interface PlanTier {
  id:        OrgPlan;
  name:      string;
  price:     string;
  features:  string[];
  cta:       string;
  highlight: boolean;
}

const PLANS: PlanTier[] = [
  {
    id:    'free',
    name:  'Free',
    price: 'USD 0 / mes',
    features: [
      'Hasta 1 equipo, 1 temporada',
      '5 partidos por mes',
      'Subida de video básica',
      'Estadísticas esenciales',
    ],
    cta: 'Empezar',
    highlight: false,
  },
  {
    id:    'pro',
    name:  'Pro',
    price: 'USD 19 / mes',
    features: [
      'Equipos y temporadas ilimitadas',
      'Editor de timeline con exportación',
      'Analytics avanzados',
      'Compartir partidos públicamente',
    ],
    cta: 'Mejorar a Pro',
    highlight: true,
  },
  {
    id:    'team',
    name:  'Team',
    price: 'USD 49 / mes',
    features: [
      'Todo lo de Pro',
      'Hasta 10 miembros del staff',
      'Colaboración en vivo',
      'Roles y permisos',
    ],
    cta: 'Hablar con ventas',
    highlight: false,
  },
  {
    id:    'enterprise',
    name:  'Enterprise',
    price: 'A medida',
    features: [
      'Todo lo de Team',
      'Marca personalizada',
      'Etiquetado con IA',
      'SLA y soporte dedicado',
    ],
    cta: 'Contactar',
    highlight: false,
  },
];

function PlanTab({ org, canEdit }: { org: Organization; canEdit: boolean }) {
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              Plan actual
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Estás en el plan{' '}
              <span
                className="px-2 py-0.5 rounded font-mono text-xs uppercase font-semibold"
                style={{ background: 'var(--navy-700)', color: 'var(--blue-400)' }}
              >
                {org.plan}
              </span>
            </p>
          </div>
          {!canEdit && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Solo el propietario puede cambiar el plan.
            </span>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {PLANS.map((p) => {
          const isCurrent = p.id === org.plan;
          return (
            <div
              key={p.id}
              className="card p-5 flex flex-col"
              style={{
                borderColor: p.highlight ? 'var(--blue-500)' : 'var(--surface-border)',
                background:  isCurrent ? 'rgba(132,204,22,.05)' : 'var(--surface-raised)',
              }}
            >
              {p.highlight && (
                <div
                  className="text-[10px] uppercase font-mono font-bold mb-2 inline-block w-fit px-2 py-0.5 rounded"
                  style={{ background: 'var(--blue-600)', color: 'white' }}
                >
                  Recomendado
                </div>
              )}
              <h3 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                {p.name}
              </h3>
              <p className="text-sm font-mono mb-4" style={{ color: 'var(--blue-400)' }}>{p.price}</p>
              <ul className="space-y-2 mb-5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--lime-400)' }} />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button variant="secondary" disabled fullWidth size="sm">
                  Tu plan actual
                </Button>
              ) : (
                <Button
                  variant={p.highlight ? 'primary' : 'secondary'}
                  size="sm"
                  fullWidth
                  rightIcon={<ExternalLink size={12} />}
                  disabled={!canEdit}
                >
                  {p.cta}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
