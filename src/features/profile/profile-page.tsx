import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stack, MaxWidthContainer } from '@/components/ui/responsive-grid';
import { useAuth } from '@/lib/auth';
import {
  getMyProfile,
  getMyPlanSummary,
  updateMyProfile,
  ROLE_TAGS,
  type RoleTag,
} from '@/lib/profile-api';
import { cn } from '@/lib/cn';

const PLAN_LABEL: Record<string, string> = {
  free: 'Free', pro: 'Pro', club: 'Club', elite: 'Elite',
};

export const ProfilePage = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [clubName, setClubName] = useState('');
  const [roleTag, setRoleTag] = useState<RoleTag | ''>('');
  const [profileType, setProfileType] = useState<'coach' | 'player' | null>(null);
  const [plan, setPlan] = useState<string>('free');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [prof, planSummary] = await Promise.all([getMyProfile(), getMyPlanSummary()]);
        if (!alive) return;
        if (prof) {
          setFirstName(prof.first_name ?? '');
          setLastName(prof.last_name ?? '');
          setPhone(prof.phone ?? '');
          setClubName(prof.club_name ?? '');
          setRoleTag(prof.role_tag ?? '');
          setProfileType(prof.profile_type);
        }
        if (planSummary) {
          setPlan(planSummary.plan);
          setExpiresAt(planSummary.expires_at);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      await updateMyProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        club_name: clubName,
        role_tag: roleTag || null,
      });
      setOk(true);
      window.setTimeout(() => setOk(false), 3500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const expiryText = expiresAt
    ? new Date(expiresAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <MaxWidthContainer>
      <Stack gap="md" className="pb-4">
        <header>
          <div className="text-[10px] font-semibold tracking-[3px] uppercase text-primary mb-1">
            Mi cuenta
          </div>
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">👤 Mi Perfil</h1>
          <p className="text-xs text-muted-fg mt-1">
            Completá tus datos. Nos ayuda a conocerte y a mejorar StatzPro para vos.
          </p>
        </header>

        {/* Cuenta / plan (solo lectura) */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <Row label="Email">
              <span className="text-fg">{user?.email ?? '—'}</span>
            </Row>
            <Row label="Plan">
              <span className="flex items-center gap-2">
                <Badge tone={plan === 'free' ? 'warning' : 'goal'}>{PLAN_LABEL[plan] ?? plan}</Badge>
                <Link to="/app/plans" className="text-xs text-primary hover:underline">Cambiar</Link>
              </span>
            </Row>
            {plan !== 'free' && (
              <Row label="Vence">
                <span className="text-fg">{expiryText ?? 'sin vencimiento'}</span>
              </Row>
            )}
            {profileType && (
              <Row label="Uso la app como">
                <span className="text-fg">{profileType === 'coach' ? 'Entrenador' : 'Jugador'}</span>
              </Row>
            )}
          </CardContent>
        </Card>

        {plan !== 'free' && (
          <p className="text-[10px] text-muted-fg -mt-1 px-1">
            El plan es un pago único por período: al vencer, tu cuenta vuelve sola a Free.
            No hay débito automático ni permanencia.
          </p>
        )}

        {/* Datos personales (editable) */}
        {loading ? (
          <p className="text-xs text-muted-fg py-6 text-center">Cargando…</p>
        ) : (
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">
                Datos personales
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nombre">
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Tu nombre" className={inputCls} autoComplete="given-name" />
                </Field>
                <Field label="Apellido">
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                    placeholder="Tu apellido" className={inputCls} autoComplete="family-name" />
                </Field>
              </div>

              <Field label="Teléfono (opcional)">
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 9 …" className={inputCls} type="tel" autoComplete="tel" inputMode="tel" />
              </Field>

              <Field label="Club">
                <input value={clubName} onChange={(e) => setClubName(e.target.value)}
                  placeholder="¿De qué club sos?" className={inputCls} autoComplete="organization" />
              </Field>

              <Field label="Cargo">
                <select value={roleTag} onChange={(e) => setRoleTag(e.target.value as RoleTag | '')} className={inputCls}>
                  <option value="">Elegí una opción…</option>
                  {ROLE_TAGS.map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </Field>

              {error && (
                <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </div>
              )}
              {ok && (
                <div className="rounded-md border border-goal/40 bg-goal/10 px-3 py-2 text-xs text-goal">
                  ✅ Perfil guardado.
                </div>
              )}

              <Button onClick={() => void save()} disabled={saving} className="w-full">
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </CardContent>
          </Card>
        )}
      </Stack>
    </MaxWidthContainer>
  );
};

const inputCls = cn(
  'w-full h-10 px-3 rounded-md bg-surface-2 border border-border text-sm text-fg',
  'placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-primary/50',
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-2 text-xs">
    <span className="text-muted-fg">{label}</span>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block">
    <span className="text-[11px] font-medium text-muted-fg">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);
