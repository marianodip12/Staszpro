import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Ticket, TicketStatus } from '@/features/support/support-page';

const STATUS_OPTIONS: { value: TicketStatus; label: string; cls: string }[] = [
  { value: 'open',        label: 'Abierto',     cls: 'bg-blue-500/15 text-blue-300 border-blue-500/40' },
  { value: 'in_progress', label: 'En proceso',  cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  { value: 'resolved',    label: 'Resuelto',    cls: 'bg-green-500/15 text-green-300 border-green-500/40' },
  { value: 'closed',      label: 'Cerrado',     cls: 'bg-surface-2 text-muted-fg border-border' },
];

const CATEGORY_ICON: Record<string, string> = {
  bug: '🐛', feature: '💡', pago: '💳', cuenta: '👤', otro: '💬', general: '💬',
};

export const AdminTicketsPanel = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('open');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    // RPC real: admin_list_tickets(p_status text) — null trae todos
    const { data, error: rpcErr } = await supabase.rpc('admin_list_tickets', {
      p_status: filterStatus === 'all' ? null : filterStatus,
    });
    if (rpcErr) {
      console.error('[admin-tickets] list error:', rpcErr.message);
      setError(rpcErr.message);
    } else {
      setTickets((data ?? []) as Ticket[]);
      setError(null);
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">Tickets de soporte</h2>
        <Button variant="ghost" onClick={refresh}>↻ Refrescar</Button>
      </header>

      <div className="flex gap-1.5 flex-wrap">
        <FilterChip label="Todos" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
        {STATUS_OPTIONS.map((s) => (
          <FilterChip
            key={s.value}
            label={s.label}
            active={filterStatus === s.value}
            onClick={() => setFilterStatus(s.value)}
            cls={s.cls}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-md p-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-fg">Cargando…</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted-fg italic">No hay tickets con este filtro.</p>
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => (
            <AdminTicketCard key={t.id} ticket={t} onUpdated={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Card ──────────────────────────────────────────────────────────────

const AdminTicketCard = ({
  ticket,
  onUpdated,
}: {
  ticket: Ticket;
  onUpdated: () => Promise<void>;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState(ticket.admin_reply ?? '');
  const [status, setStatus] = useState<TicketStatus>(ticket.status as TicketStatus);
  const [saving, setSaving] = useState(false);

  const created = new Date(ticket.created_at).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const statusInfo = STATUS_OPTIONS.find((s) => s.value === ticket.status) ?? STATUS_OPTIONS[0];

  // RPC real: admin_update_ticket(p_ticket_id, p_status, p_admin_reply)
  // → una sola llamada cambia reply + status.
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.rpc('admin_update_ticket', {
      p_ticket_id: ticket.id,
      p_status: status,
      p_admin_reply: reply.trim() || null,
    });
    setSaving(false);
    if (error) {
      window.alert('Error al guardar: ' + error.message);
      return;
    }
    await onUpdated();
  };

  return (
    <li className="rounded-lg border border-border bg-surface overflow-hidden transition-colors hover:border-primary/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-surface-2/40 cursor-pointer transition-colors"
      >
        <span className="text-base shrink-0">{CATEGORY_ICON[ticket.category] ?? '💬'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{ticket.subject}</span>
            <span className={cn('text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold', statusInfo.cls)}>
              {statusInfo.label}
            </span>
          </div>
          <p className="text-[10px] text-muted-fg mt-0.5 truncate">
            {ticket.user_email ?? (ticket.user_id ?? '').slice(0, 8)} · {created}
            {ticket.app_version && ` · ${ticket.app_version}`}
          </p>
        </div>
        <span className={cn('text-muted-fg transition-transform shrink-0', expanded && 'rotate-180')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </button>

      {expanded && (
        <div className="px-3 py-3 border-t border-border bg-bg/40 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-fg mb-1">Mensaje del usuario</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
            {ticket.user_agent && (
              <p className="text-[9px] text-muted-fg/70 mt-2 truncate" title={ticket.user_agent}>
                UA: {ticket.user_agent}
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-fg mb-1">Respuesta (visible para el usuario)</p>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Respondé al usuario…"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
              maxLength={4000}
            />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-fg mb-1.5">Estado</p>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    'text-[10px] uppercase tracking-wider px-2 py-1 rounded border font-semibold cursor-pointer transition-colors',
                    status === s.value
                      ? s.cls
                      : 'border-border bg-surface-2 text-muted-fg hover:text-fg hover:border-primary/40',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
};

const FilterChip = ({
  label, active, onClick, cls,
}: { label: string; active: boolean; onClick: () => void; cls?: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-md border font-semibold cursor-pointer transition-colors',
      active
        ? cls ?? 'bg-primary/15 text-primary border-primary/40'
        : 'border-border bg-surface-2/40 text-muted-fg hover:text-fg hover:border-primary/30',
    )}
  >
    {label}
  </button>
);
