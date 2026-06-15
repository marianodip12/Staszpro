import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_role: 'user' | 'admin';
  sender_id: string | null;
  body: string;
  created_at: string;
}

interface TicketChatProps {
  ticketId: string;
  /** true cuando se renderiza desde el panel admin (alinea las burbujas del lado del admin) */
  isAdmin?: boolean;
  className?: string;
}

/**
 * Hilo de chat de un ticket. Sirve igual para el usuario y para el admin.
 * Acceso DIRECTO a la tabla `ticket_messages` (no RPC) para no depender del
 * cache de funciones de PostgREST. La seguridad la garantiza la RLS:
 *   - SELECT: admin o dueño del ticket.
 *   - INSERT: rol 'user' solo el dueño (sender_id = auth.uid()); rol 'admin' solo is_admin().
 * Realtime mantiene el hilo vivo en ambos lados.
 */
export const TicketChat = ({ ticketId, isAdmin = false, className }: TicketChatProps) => {
  const { user } = useAuth();
  const myRole: 'user' | 'admin' = isAdmin ? 'admin' : 'user';
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const upsert = useCallback((msg: TicketMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === msg.id)
        ? prev
        : [...prev, msg].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
    );
  }, []);

  // Carga inicial (directo a la tabla, gated por RLS)
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error: qErr } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (!alive) return;
      if (qErr) setError(qErr.message);
      else setMessages((data ?? []) as TicketMessage[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [ticketId]);

  // Realtime: cada mensaje nuevo del ticket entra solo
  useEffect(() => {
    const channel = supabase
      .channel(`ticket:${ticketId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` },
        (payload) => upsert(payload.new as TicketMessage),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [ticketId, upsert]);

  // Auto-scroll dentro del contenedor (no mueve el scroll de la página)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending || !user) return;
    setSending(true);
    setError(null);
    const { data, error: insErr } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        body,
        sender_role: myRole,
        sender_id: user.id,
      })
      .select('*')
      .single();
    setSending(false);
    if (insErr) { setError(insErr.message); return; }
    if (data) upsert(data as TicketMessage); // optimista; realtime lo deduplica
    setDraft('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className={cn('flex flex-col rounded-lg border border-border bg-bg/40 overflow-hidden', className)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-80 min-h-[120px]">
        {loading ? (
          <p className="text-xs text-muted-fg text-center py-4">Cargando…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-fg italic text-center py-4">Sin mensajes todavía.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_role === myRole;
            const adminMsg = m.sender_role === 'admin';
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-3 py-2',
                    adminMsg
                      ? 'bg-primary text-primary-fg'
                      : 'bg-surface-2 text-fg border border-border',
                    mine ? 'rounded-br-sm' : 'rounded-bl-sm',
                  )}
                >
                  <p className="text-[9px] uppercase tracking-wider opacity-60 mb-0.5">
                    {adminMsg ? 'Soporte' : 'Usuario'}
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{m.body}</p>
                  <p className="text-[9px] opacity-50 mt-1 text-right">
                    {new Date(m.created_at).toLocaleString('es-AR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="text-[11px] text-danger px-3 pb-1">{error}</p>}

      <div className="flex gap-2 p-2 border-t border-border bg-surface">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={isAdmin ? 'Responder al usuario…' : 'Escribí tu mensaje…'}
          className="flex-1 resize-none max-h-28 rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          maxLength={4000}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !draft.trim() || !user}>
          {sending ? '…' : 'Enviar'}
        </Button>
      </div>
    </div>
  );
};
