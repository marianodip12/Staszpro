import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { AdminTicketsPanel } from './admin-tickets-panel';

interface AdminMatch {
  match_id: string;
  local_id: string | null;
  user_email: string;
  home_name: string;
  away_name: string;
  home_score: number;
  away_score: number;
  status: string;
  match_date: string;
  competition: string;
  created_at: string;
  events_count: number;
}

interface AdminUser {
  user_id: string;
  user_email: string;
  is_anonymous: boolean;
  is_admin: boolean;
  plan: string;
  matches_count: number;
  teams_count: number;
  created_at: string;
}

interface AdminPayment {
  id: string;
  user_id: string;
  user_email: string;
  plan: string;
  billing_cycle: string;
  payment_method: string;
  amount_usd: number;
  amount_ars: number | null;
  status: string;
  notes: string | null;
  proof_url: string | null;
  created_at: string;
  paid_at: string | null;
}

interface VisitStat {
  day: string;
  landing_visits: number;
  app_visits: number;
  unique_users: number;
}

type Tab = 'matches' | 'users' | 'payments' | 'tickets' | 'visits';

export const AdminPage = () => {

  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('matches');
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [visits, setVisits] = useState<VisitStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedingUser, setSeedingUser] = useState<string | null>(null);

  // ALL HOOKS FIRST (no conditional returns before this)
  const registeredUsers = useMemo(() => users.filter((u) => !u.is_anonymous), [users]);
  const totalRegistered = useMemo(() => registeredUsers.length, [registeredUsers]);
  const pendingPayments = useMemo(
    () => payments.filter((p) => p.status === 'pending' || p.status === 'review').length,
    [payments],
  );
  const totalMatches = useMemo(() => matches.length, [matches]);
  const liveMatches = useMemo(() => matches.filter((m) => m.status === 'live').length, [matches]);

  // Check admin access
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('is_current_user_admin');
      if (error || !data) {
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    })();
  }, []);

  const loadMatches = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_get_all_matches');
    if (error) {
      console.error('[admin] loadMatches error:', error.message);
    }
    setMatches((data as AdminMatch[]) ?? []);
  }, []);

  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_get_all_users');
    if (error) {
      console.error('[admin] loadUsers error:', error.message);
    }
    setUsers((data as AdminUser[]) ?? []);
  }, []);

  const loadPayments = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_get_payment_requests');
    if (error) {
      console.error('[admin] loadPayments error:', error.message);
    }
    setPayments((data as AdminPayment[]) ?? []);
  }, []);

  const loadVisits = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_visit_stats');
    if (error) {
      console.error('[admin] loadVisits error:', error.message);
    }
    setVisits((data as VisitStat[]) ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin !== true) return;
    setLoading(true);
    Promise.all([loadMatches(), loadUsers(), loadPayments(), loadVisits()]).finally(() => setLoading(false));
  }, [isAdmin, loadMatches, loadUsers, loadPayments, loadVisits]);

  const handlePaymentStatus = async (paymentId: string, newStatus: 'paid' | 'rejected' | 'cancelled', email: string, plan: string) => {
    const action = newStatus === 'paid' ? 'aprobar' : newStatus === 'rejected' ? 'rechazar' : 'cancelar';
    if (!window.confirm(`¿${action[0].toUpperCase() + action.slice(1)} pago de ${email} por plan ${plan.toUpperCase()}?\n\nSi lo aprobás, el plan se activa automáticamente.`)) return;
    const { error } = await supabase.rpc('admin_set_payment_status', {
      p_payment_id: paymentId,
      p_status: newStatus,
    });
    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }
    await Promise.all([loadPayments(), loadUsers()]);
  };

  const handleDeleteMatch = async (matchId: string, label: string) => {
    if (!window.confirm(`¿Eliminar "${label}"? Esta acción no se puede deshacer.`)) return;
    await supabase.rpc('admin_delete_match', { target_match_id: matchId });
    await Promise.all([loadMatches(), loadUsers()]);
  };

  const handleChangePlan = async (userId: string, newPlan: string, email: string) => {
    if (!window.confirm(`¿Cambiar el plan de ${email} a ${newPlan.toUpperCase()}?`)) return;
    const { error } = await supabase.rpc('admin_set_user_plan', {
      target_user_id: userId,
      new_plan: newPlan,
    });
    if (error) {
      console.error('[admin] changePlan error:', error.message);
      alert(`Error: ${error.message}`);
      return;
    }
    await loadUsers();
  };

  const handleSeedDemo = async (userId: string, email: string) => {
    if (!window.confirm(`¿Crear un partido demo completo para ${email}?\n\nSe creará: Mi Equipo (con 12 jugadores reales) vs Rival, con eventos reales (goles, atajadas, faltas, etc).`)) return;
    setSeedingUser(userId);
    try {
      const { error } = await supabase.rpc('admin_seed_demo_match', { target_user_id: userId });
      if (error) {
        console.error('[admin] seed error:', error.message);
        alert(`Error: ${error.message}`);
      } else {
        alert('✓ Partido demo creado con éxito');
        await Promise.all([loadMatches(), loadUsers()]);
      }
    } finally {
      setSeedingUser(null);
    }
  };

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-fg text-sm">
        Verificando permisos…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold">Acceso denegado</h1>
        <p className="text-sm text-muted-fg">No tenés permisos de administrador.</p>
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="text-sm text-primary hover:underline"
        >
          ← Volver a la app
        </button>
      </div>
    );
  }

  const statusLabel = (s: string) => {
    if (s === 'finished') return { text: 'Finalizado', cls: 'bg-green-500/15 text-green-400 border-green-500/30' };
    if (s === 'live') return { text: 'En vivo', cls: 'bg-red-500/15 text-red-400 border-red-500/30' };
    return { text: s, cls: 'bg-surface-2 text-muted-fg border-border' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🛡️ Panel de Administración
        </h1>
        <p className="text-sm text-muted-fg mt-1">
          Vista global de todos los usuarios y partidos del sistema.
        </p>
      </div>

      {/* Dashboard stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Usuarios registrados" value={totalRegistered} color="#3b82f6" />
        <StatCard label="Partidos totales" value={totalMatches} color="#22c55e" />
        <StatCard label="En vivo ahora" value={liveMatches} color="#ef4444" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        <TabBtn active={tab === 'matches'} onClick={() => setTab('matches')}>
          📋 Partidos ({matches.length})
        </TabBtn>
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>
          👥 Registrados ({registeredUsers.length})
        </TabBtn>
        <TabBtn active={tab === 'payments'} onClick={() => setTab('payments')}>
          💰 Pagos {pendingPayments > 0 && (
            <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">
              {pendingPayments}
            </span>
          )}
        </TabBtn>
        <TabBtn active={tab === 'tickets'} onClick={() => setTab('tickets')}>
          🎫 Tickets
        </TabBtn>
        <TabBtn active={tab === 'visits'} onClick={() => setTab('visits')}>
          👁️ Visitas
        </TabBtn>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-fg text-sm">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin mr-2" />
          Cargando…
        </div>
      ) : tab === 'matches' ? (
        /* ─── MATCHES TABLE ─── */
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Partido</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Score</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Estado</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Eventos</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Usuario</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Fecha</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => {
                  const sl = statusLabel(m.status);
                  return (
                    <tr key={m.match_id} className="border-b border-border/50 hover:bg-surface-2/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.home_name} vs {m.away_name}</div>
                        <div className="text-[10px] text-muted-fg">{m.competition} · {m.match_date}</div>
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-semibold">
                        {m.home_score} - {m.away_score}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase', sl.cls)}>
                          {sl.text}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-muted-fg">{m.events_count}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-muted-fg truncate block max-w-[160px]" title={m.user_email}>
                          {m.user_email}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-fg whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => navigate(`/app/analysis/${m.match_id}`)}
                            className="text-muted-fg hover:text-primary transition-colors text-xs"
                            title="Ver detalle del partido"
                          >
                            👁 Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMatch(m.match_id, `${m.home_name} vs ${m.away_name}`)}
                            className="text-muted-fg hover:text-danger transition-colors"
                            title="Eliminar partido"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {matches.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-fg">Sin partidos en el sistema.</div>
          )}
        </div>
      ) : tab === 'users' ? (
        /* ─── USERS TABLE ─── */
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Usuario</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Plan</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Partidos</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Equipos</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Registrado</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registeredUsers.map((u) => (
                  <tr key={u.user_id} className="border-b border-border/50 hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-7 h-7 rounded-full grid place-items-center text-[10px] font-semibold',
                          u.is_admin
                            ? 'bg-primary/20 text-primary border border-primary/40'
                            : 'bg-green-500/15 text-green-400 border border-green-500/30',
                        )}>
                          {u.is_admin ? '👑' : u.user_email[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {u.user_email}
                            {u.is_admin && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 uppercase font-semibold tracking-wider">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-fg font-mono">{u.user_id.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <select
                        value={u.plan}
                        onChange={(e) => handleChangePlan(u.user_id, e.target.value, u.user_email)}
                        className={cn(
                          'text-[11px] px-2 py-1 rounded border font-semibold uppercase tracking-wider cursor-pointer',
                          u.plan === 'free' && 'bg-surface-2 text-muted-fg border-border',
                          u.plan === 'pro' && 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                          u.plan === 'club' && 'bg-green-500/15 text-green-400 border-green-500/30',
                          u.plan === 'elite' && 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                        )}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="club">Club</option>
                        <option value="elite">Elite</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center font-mono">{u.matches_count}</td>
                    <td className="px-3 py-3 text-center font-mono">{u.teams_count}</td>
                    <td className="px-3 py-3 text-xs text-muted-fg whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleSeedDemo(u.user_id, u.user_email)}
                        disabled={seedingUser === u.user_id}
                        className="text-[11px] px-2.5 py-1 rounded border border-border hover:bg-surface-2 transition-colors disabled:opacity-50"
                        title="Crea un partido demo completo (jugadores, eventos, etc)"
                      >
                        {seedingUser === u.user_id ? '...' : '🎲 Demo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'payments' ? (
        /* ─── PAYMENTS TABLE ─── */
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {payments.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-fg">
              <div className="text-3xl mb-2">💸</div>
              <p>Todavía no hay solicitudes de pago.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Usuario</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Plan</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Método</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Monto</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Estado</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Solicitado</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted-fg uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-surface-2/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm">{p.user_email}</div>
                        <div className="text-[10px] text-muted-fg font-mono">{p.id.slice(0, 8)}…</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn(
                          'text-[11px] px-2 py-0.5 rounded font-semibold uppercase',
                          p.plan === 'pro' && 'bg-blue-500/15 text-blue-400',
                          p.plan === 'club' && 'bg-green-500/15 text-green-400',
                          p.plan === 'elite' && 'bg-amber-500/15 text-amber-400',
                        )}>
                          {p.plan} {p.billing_cycle === 'annual' ? 'Anual' : 'Mensual'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs">
                          {p.payment_method === 'mercadopago' ? '💳 MP' : '🏦 Transf.'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        <div>${p.amount_usd} USD</div>
                        {p.amount_ars && (
                          <div className="text-[10px] text-muted-fg">
                            ${Number(p.amount_ars).toLocaleString('es-AR')} ARS
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase',
                          p.status === 'pending' && 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
                          p.status === 'review' && 'bg-orange-500/15 text-orange-400 border-orange-500/30',
                          p.status === 'paid' && 'bg-green-500/15 text-green-400 border-green-500/30',
                          p.status === 'rejected' && 'bg-red-500/15 text-red-400 border-red-500/30',
                          p.status === 'cancelled' && 'bg-surface-2 text-muted-fg border-border',
                        )}>
                          {p.status === 'pending' && 'Pendiente'}
                          {p.status === 'review' && 'En revisión'}
                          {p.status === 'paid' && '✓ Pagado'}
                          {p.status === 'rejected' && 'Rechazado'}
                          {p.status === 'cancelled' && 'Cancelado'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-fg whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {(p.status === 'pending' || p.status === 'review') ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              type="button"
                              onClick={() => handlePaymentStatus(p.id, 'paid', p.user_email, p.plan)}
                              className="text-[11px] px-2 py-1 rounded border border-green-500/40 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-semibold"
                              title="Aprobar y activar plan"
                            >
                              ✓ Aprobar
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePaymentStatus(p.id, 'rejected', p.user_email, p.plan)}
                              className="text-[11px] px-2 py-1 rounded border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold"
                              title="Rechazar"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-fg">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tab === 'tickets' ? (
        /* ─── TICKETS ─── */
        <div className="rounded-xl border border-border bg-surface p-4 md:p-5">
          <AdminTicketsPanel />
        </div>
      ) : (
        /* ─── VISITAS (últimos 30 días) ─── */
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {visits.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-fg">
              <div className="text-3xl mb-2">👁️</div>
              <p>Todavía no hay visitas registradas.</p>
              <p className="text-[11px] mt-1">Se registra una visita por sesión de navegador, en landing y en la app.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-fg border-b border-border">
                    <th className="px-4 py-3">Día</th>
                    <th className="px-4 py-3 text-right">Landing</th>
                    <th className="px-4 py-3 text-right">App</th>
                    <th className="px-4 py-3 text-right">Usuarios únicos</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.day} className="border-b border-border/50 hover:bg-surface-2/50">
                      <td className="px-4 py-2.5 font-mono text-xs">{v.day}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular">{v.landing_visits}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular">{v.app_visits}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular text-primary">{v.unique_users}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular font-bold">
                        {v.landing_visits + v.app_visits}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TabBtn = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
      active ? 'bg-primary/15 text-primary' : 'text-muted-fg hover:text-fg hover:bg-surface-2',
    )}
  >
    {children}
  </button>
);

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="rounded-xl border border-border bg-surface p-4 text-center">
    <div className="font-mono text-3xl font-bold tabular leading-none" style={{ color }}>
      {value}
    </div>
    <div className="text-[10px] uppercase tracking-widest text-muted-fg mt-2">{label}</div>
  </div>
);
