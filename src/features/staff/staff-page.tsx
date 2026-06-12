import { useCallback, useEffect, useState } from 'react';
import { ProGate } from '@/components/pro-gate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Stack, MaxWidthContainer } from '@/components/ui/responsive-grid';
import { usePlan } from '@/lib/use-plan';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

/**
 * 👔 Mi Staff — gestión de usuarios habilitados (planes Club / Elite).
 *
 * El dueño de la cuenta invita por email a DT, asistentes o analistas y
 * elige el rol de cada uno. Backend: RPCs invite_club_member,
 * get_my_club_members, update_club_member_role, remove_club_member.
 *
 * Límite: Club = 3 usuarios · Elite = ilimitado (lo valida el backend).
 */

type StaffRole = 'admin' | 'editor' | 'viewer';

interface StaffMember {
  id: string;
  email: string;
  role: StaffRole;
  status: 'pending' | 'active';
  created_at: string;
}

const ROLES: { key: StaffRole; label: string; icon: string; desc: string }[] = [
  { key: 'admin',  label: 'Admin',   icon: '🛠️', desc: 'Carga, edita y borra todo' },
  { key: 'editor', label: 'Editor',  icon: '✏️', desc: 'Carga partidos y ve todo' },
  { key: 'viewer', label: 'Lectura', icon: '👁️', desc: 'Solo ve partidos y stats' },
];

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: '🛠️ Admin', editor: '✏️ Editor', viewer: '👁️ Lectura',
};

export const StaffPage = () => (
  <ProGate
    requires="club"
    title="Tu staff, en la misma página"
    description="Pasate al plan Club para invitar a tu DT, asistentes y analistas: cada uno con su propio acceso y rol."
    features={[
      'Hasta 3 usuarios habilitados (ilimitados en Elite)',
      'Roles: admin, editor o solo lectura',
      'Invitación por email en un clic',
      'Cambiá o quitá accesos cuando quieras',
    ]}
  >
    <StaffPageInner />
  </ProGate>
);

const StaffPageInner = () => {
  const { plan, isAdmin } = usePlan();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Form
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('editor');
  const [sending, setSending] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const unlimited = plan === 'elite' || isAdmin;
  const limit = unlimited ? Infinity : 3;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: rpcErr } = await supabase.rpc('get_my_club_members');
    if (rpcErr) setError(rpcErr.message);
    else setMembers((data as StaffMember[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const flash = (msg: string) => {
    setOk(msg);
    setError(null);
    window.setTimeout(() => setOk(null), 4000);
  };

  const invite = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('invite_club_member', {
      p_email: trimmed,
      p_role: role,
    });
    setSending(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    setEmail('');
    const status = (data as { status?: string } | null)?.status;
    flash(status === 'active'
      ? `✅ ${trimmed} ya tiene cuenta: quedó habilitado al toque.`
      : `📨 Invitación creada. Cuando ${trimmed} se registre con ese email, queda habilitado solo.`);
    void load();
  };

  const changeRole = async (id: string, newRole: StaffRole) => {
    setError(null);
    const { error: rpcErr } = await supabase.rpc('update_club_member_role', {
      p_member_id: id,
      p_role: newRole,
    });
    if (rpcErr) { setError(rpcErr.message); return; }
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, role: newRole } : m)));
  };

  const remove = async (id: string) => {
    setError(null);
    const { error: rpcErr } = await supabase.rpc('remove_club_member', {
      p_member_id: id,
    });
    setConfirmRemove(null);
    if (rpcErr) { setError(rpcErr.message); return; }
    setMembers((ms) => ms.filter((m) => m.id !== id));
    flash('Usuario quitado.');
  };

  const atLimit = members.length >= limit;

  return (
    <MaxWidthContainer>
      <Stack gap="md" className="pb-4">
        <header>
          <div className="text-[10px] font-semibold tracking-[3px] uppercase text-primary mb-1">
            Usuarios habilitados
          </div>
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">👔 Mi Staff</h1>
          <p className="text-xs text-muted-fg mt-1">
            Invitá a tu DT, asistentes o analistas y elegí qué puede hacer cada uno.
          </p>
        </header>

        {/* Cupo */}
        <Card>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="text-xs text-muted-fg">
              Usuarios habilitados de tu plan
            </div>
            <div className="font-mono text-sm font-bold tabular">
              {members.length} / {unlimited ? '∞' : limit}
            </div>
          </CardContent>
        </Card>

        {/* Mensajes */}
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
        {ok && (
          <div className="rounded-md border border-goal/40 bg-goal/10 px-3 py-2 text-xs text-goal">
            {ok}
          </div>
        )}

        {/* Invitar */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">
              ➕ Invitar usuario
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              disabled={atLimit}
              className={cn(
                'w-full h-10 px-3 rounded-md bg-surface-2 border border-border text-sm text-fg',
                'placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-primary/50',
              )}
            />
            {/* Selector de rol */}
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key)}
                  className={cn(
                    'rounded-md border p-2 text-left transition-colors',
                    role === r.key
                      ? 'border-primary/50 bg-primary/15'
                      : 'border-border bg-surface-2 hover:bg-surface',
                  )}
                >
                  <div className={cn('text-xs font-semibold', role === r.key ? 'text-primary' : 'text-fg')}>
                    {r.icon} {r.label}
                  </div>
                  <div className="text-[9px] text-muted-fg mt-0.5 leading-tight">{r.desc}</div>
                </button>
              ))}
            </div>
            <Button
              onClick={() => void invite()}
              disabled={sending || atLimit || !email.trim()}
              className="w-full"
            >
              {sending ? 'Enviando…' : atLimit ? 'Alcanzaste el límite de tu plan' : 'Invitar'}
            </Button>
            {atLimit && !unlimited && (
              <p className="text-[10px] text-muted-fg text-center">
                Quitá un usuario o pasate a Elite para tener usuarios ilimitados.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lista */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-1.5">
            Tu staff
          </div>
          {loading ? (
            <p className="text-xs text-muted-fg py-4 text-center">Cargando…</p>
          ) : members.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-xs text-muted-fg">
                Todavía no invitaste a nadie. Arrancá invitando a tu DT 👆
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-1.5">
              {members.map((m) => (
                <li key={m.id}>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{m.email}</div>
                          <div className="mt-0.5">
                            <Badge tone={m.status === 'active' ? 'goal' : 'warning'}>
                              {m.status === 'active' ? 'Activo' : 'Pendiente de registro'}
                            </Badge>
                          </div>
                        </div>
                        <select
                          value={m.role}
                          onChange={(e) => void changeRole(m.id, e.target.value as StaffRole)}
                          className="h-8 px-2 rounded-md bg-surface-2 border border-border text-xs text-fg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {ROLES.map((r) => (
                            <option key={r.key} value={r.key}>{ROLE_LABEL[r.key]}</option>
                          ))}
                        </select>
                        {confirmRemove === m.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void remove(m.id)}
                              className="h-8 px-2 rounded-md border border-danger/50 bg-danger/15 text-xs font-semibold text-danger"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemove(null)}
                              className="h-8 px-2 rounded-md border border-border bg-surface-2 text-xs text-muted-fg"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRemove(m.id)}
                            className="h-8 px-2 rounded-md border border-border bg-surface-2 text-xs text-muted-fg hover:text-danger hover:border-danger/40 transition-colors"
                            title="Quitar usuario"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[10px] text-muted-fg text-center">
          Los invitados entran con su propia cuenta y eligen "Club" en el
          selector del menú para ver tus equipos y partidos según su rol.
        </p>
      </Stack>
    </MaxWidthContainer>
  );
};
