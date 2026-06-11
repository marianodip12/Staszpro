import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { APP_VERSION } from '@/lib/app-version';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { BetaBanner } from '@/components/beta-banner';

// ─── Tipos compartidos con admin-tickets-panel ─────────────────────────
// Nota: la BD usa `message`, no `body`. Tickets categorías en la BD están
// libres (text + default 'general'), pero el form acota a estos 5 valores.

export type TicketCategory = 'bug' | 'feature' | 'pago' | 'cuenta' | 'otro';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Ticket {
  id: string;
  user_id?: string;
  user_email?: string | null;
  category: TicketCategory | string;
  subject: string;
  message: string;
  status: TicketStatus;
  admin_reply: string | null;
  app_version?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<TicketCategory, { label: string; icon: string }> = {
  bug:     { label: 'Bug / Error',     icon: '🐛' },
  feature: { label: 'Sugerencia',      icon: '💡' },
  pago:    { label: 'Pago / Plan',     icon: '💳' },
  cuenta:  { label: 'Cuenta / Login',  icon: '👤' },
  otro:    { label: 'Otro',            icon: '💬' },
};

const STATUS_LABELS: Record<TicketStatus, { label: string; cls: string }> = {
  open:        { label: 'Abierto',     cls: 'bg-blue-500/15 text-blue-300 border-blue-500/40' },
  in_progress: { label: 'En proceso',  cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  resolved:    { label: 'Resuelto',    cls: 'bg-green-500/15 text-green-300 border-green-500/40' },
  closed:      { label: 'Cerrado',     cls: 'bg-surface-2 text-muted-fg border-border' },
};

// ─── Page ──────────────────────────────────────────────────────────────

export const SupportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState<TicketCategory>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // RPC real: get_my_tickets() (sin args)
    const { data, error: rpcErr } = await supabase.rpc('get_my_tickets');
    if (rpcErr) {
      console.error('[support] list error:', rpcErr.message);
      setError(rpcErr.message);
    } else {
      setTickets((data ?? []) as Ticket[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleSubmit = async () => {
    setError(null);
    if (!subject.trim() || !message.trim()) {
      setError('Completá asunto y descripción.');
      return;
    }
    setCreating(true);
    // RPC real: create_support_ticket(p_category, p_subject, p_message, p_app_version, p_user_agent)
    const { error: rpcErr } = await supabase.rpc('create_support_ticket', {
      p_category: category,
      p_subject: subject.trim(),
      p_message: message.trim(),
      p_app_version: APP_VERSION,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
    setCreating(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    setSubject('');
    setMessage('');
    setCategory('bug');
    await refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Soporte</h1>
          <p className="text-xs text-muted-fg mt-0.5">
            Reportá bugs, sugerí features o consultá por tu cuenta.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/app')}>← Volver</Button>
      </header>

      <BetaBanner />

      {/* Formulario nuevo ticket */}
      <section className="rounded-xl border border-border bg-surface p-4 md:p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Crear nuevo ticket
        </h2>

        <div>
          <Label>Categoría</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5 mt-1.5">
            {(Object.entries(CATEGORY_LABELS) as [TicketCategory, { label: string; icon: string }][]).map(
              ([key, { label, icon }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={cn(
                    'rounded-md border text-xs py-2 px-2 flex flex-col items-center gap-0.5 cursor-pointer transition-all duration-200',
                    category === key
                      ? 'border-primary/60 bg-primary/15 text-primary ring-1 ring-primary/30'
                      : 'border-border bg-surface-2/40 text-muted-fg hover:text-fg hover:border-primary/30',
                  )}
                >
                  <span className="text-base leading-none">{icon}</span>
                  <span className="text-[10px] leading-tight text-center">{label}</span>
                </button>
              ),
            )}
          </div>
        </div>

        <div>
          <Label>Asunto</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Resumí el problema en una línea…"
            className="mt-1"
            maxLength={120}
          />
        </div>

        <div>
          <Label>Descripción</Label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Contanos qué pasó, qué esperabas, en qué dispositivo. Cuanto más detalle, mejor."
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[120px]"
            maxLength={4000}
          />
          <p className="text-[10px] text-muted-fg mt-1">{message.length}/4000</p>
        </div>

        {error && (
          <p className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-md p-2">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={creating || !subject.trim() || !message.trim()}>
            {creating ? 'Enviando…' : 'Enviar ticket'}
          </Button>
        </div>
      </section>

      {/* Mis tickets */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Mis tickets {tickets.length > 0 && <span className="text-muted-fg/60">· {tickets.length}</span>}
        </h2>

        {loading ? (
          <p className="text-sm text-muted-fg">Cargando…</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-fg italic">
            No tenés tickets todavía. Si encontrás algún problema o querés sugerir una feature, creá uno acá arriba.
          </p>
        ) : (
          <ul className="space-y-2">
            {tickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
          </ul>
        )}
      </section>
    </div>
  );
};

// ─── Card de un ticket ────────────────────────────────────────────────

const TicketCard = ({ ticket }: { ticket: Ticket }) => {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_LABELS[(ticket.category as TicketCategory)] ?? CATEGORY_LABELS.otro;
  const status = STATUS_LABELS[ticket.status as TicketStatus] ?? STATUS_LABELS.open;
  const created = new Date(ticket.created_at).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <li className="rounded-lg border border-border bg-surface overflow-hidden transition-colors duration-200 hover:border-primary/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-surface-2/40 cursor-pointer transition-colors"
      >
        <span className="text-base shrink-0">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{ticket.subject}</span>
            <span className={cn('text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold', status.cls)}>
              {status.label}
            </span>
          </div>
          <p className="text-[10px] text-muted-fg mt-0.5">{cat.label} · {created}</p>
        </div>
        <span className={cn('text-muted-fg transition-transform shrink-0', expanded && 'rotate-180')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-bg/40 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-fg mb-1">Mensaje</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
          </div>
          {ticket.admin_reply && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
              <p className="text-[10px] uppercase tracking-widest text-primary mb-1">Respuesta del equipo</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{ticket.admin_reply}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
};
