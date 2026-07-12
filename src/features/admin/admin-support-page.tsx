/**
 * AdminSupportPage — Panel admin para responder chats de soporte en vivo.
 *
 * - Lista de threads en la izquierda (ordenados por última actividad)
 * - Badge rojo con unread count
 * - Al seleccionar un thread, muestra la conversación completa a la derecha
 * - Input para responder como admin
 * - Polling cada 5s para mantener actualizado sin realtime
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  listAllSupportThreads,
  listSupportThread,
  postAdminSupportMessage,
  markSupportThreadRead,
  type SupportThreadSummary,
  type SupportMessage,
} from '@/lib/support-chat-api';
import { cn } from '@/lib/cn';

const POLL_MS = 5000;

export const AdminSupportPage = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [threads, setThreads] = useState<SupportThreadSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Verificar admin
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { if (!cancelled) setIsAdmin(false); return; }
      const { data, error } = await supabase
        .from('user_plans')
        .select('is_admin')
        .eq('user_id', userData.user.id)
        .maybeSingle();
      if (!cancelled) setIsAdmin(!error && Boolean(data?.is_admin));
    })();
    return () => { cancelled = true; };
  }, []);

  // Poll de threads
  useEffect(() => {
    if (isAdmin !== true) return;
    let cancelled = false;
    const load = async () => {
      try {
        const t = await listAllSupportThreads();
        if (!cancelled) { setThreads(t); setLoadingThreads(false); }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error cargando threads');
          setLoadingThreads(false);
        }
      }
    };
    void load();
    const iv = window.setInterval(load, POLL_MS);
    return () => { cancelled = true; window.clearInterval(iv); };
  }, [isAdmin]);

  // Poll de mensajes del thread seleccionado
  useEffect(() => {
    if (!selectedUserId || isAdmin !== true) return;
    let cancelled = false;
    const load = async () => {
      try {
        const msgs = await listSupportThread(selectedUserId);
        if (cancelled) return;
        setMessages(msgs);
        setLoadingMessages(false);
        // Marcar como leídos los mensajes del user
        if (msgs.some((m) => !m.sender_is_admin && !m.read)) {
          try { await markSupportThreadRead(selectedUserId); } catch { /* ignore */ }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error cargando thread');
          setLoadingMessages(false);
        }
      }
    };
    setLoadingMessages(true);
    void load();
    const iv = window.setInterval(load, POLL_MS);
    return () => { cancelled = true; window.clearInterval(iv); };
  }, [selectedUserId, isAdmin]);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || !selectedUserId || sending) return;
    setSending(true);
    setError(null);
    try {
      await postAdminSupportMessage(selectedUserId, text);
      setInput('');
      const msgs = await listSupportThread(selectedUserId);
      setMessages(msgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos enviar la respuesta');
    } finally {
      setSending(false);
    }
  };

  const totalUnread = useMemo(
    () => threads.reduce((a, t) => a + t.unread_count, 0),
    [threads],
  );

  if (isAdmin === null) {
    return <div className="p-8 text-center text-muted-fg text-sm">Verificando permisos…</div>;
  }
  if (isAdmin === false) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold mb-2">Acceso denegado</h1>
        <p className="text-sm text-muted-fg mb-6">Esta sección es solo para administradores.</p>
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="px-4 py-2.5 rounded-md bg-primary text-primary-fg font-semibold text-sm"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Soporte · Chats en vivo</h1>
          <p className="text-xs text-muted-fg">
            {threads.length} {threads.length === 1 ? 'thread' : 'threads'}
            {totalUnread > 0 && (
              <> · <span className="text-danger font-semibold">{totalUnread} sin leer</span></>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-[280px_1fr] gap-4 min-h-[500px]">
        {/* Lista de threads */}
        <aside className="rounded-lg border border-border bg-surface overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border bg-bg/40">
            <p className="text-[10px] uppercase tracking-widest text-muted-fg font-semibold">
              Conversaciones
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <p className="text-center text-xs text-muted-fg italic py-6">Cargando…</p>
            ) : threads.length === 0 ? (
              <p className="text-center text-xs text-muted-fg italic py-6">
                No hay mensajes todavía.
              </p>
            ) : (
              threads.map((t) => (
                <button
                  key={t.user_id}
                  type="button"
                  onClick={() => setSelectedUserId(t.user_id)}
                  className={cn(
                    'w-full text-left p-3 border-b border-border/50 hover:bg-primary/5 transition-colors',
                    selectedUserId === t.user_id && 'bg-primary/10',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold truncate flex-1 min-w-0">
                      {t.user_email}
                    </span>
                    {t.unread_count > 0 && (
                      <span className="text-[9px] font-bold bg-danger text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shrink-0">
                        {t.unread_count}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    'text-[11px] truncate leading-tight',
                    t.unread_count > 0 ? 'text-fg font-medium' : 'text-muted-fg',
                  )}>
                    {t.last_message_from_admin && (
                      <span className="text-primary mr-1">Vos:</span>
                    )}
                    {t.last_message_preview}
                  </p>
                  <p className="text-[9px] text-muted-fg mt-1">
                    {formatRelativeTime(t.last_message_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Conversación */}
        <section className="rounded-lg border border-border bg-surface overflow-hidden flex flex-col">
          {!selectedUserId ? (
            <div className="flex-1 grid place-items-center text-center p-8">
              <div>
                <div className="text-4xl mb-2">💬</div>
                <p className="text-sm text-muted-fg">
                  Elegí una conversación de la izquierda para verla.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header con email del user */}
              <div className="p-3 border-b border-border bg-bg/40">
                <p className="text-xs font-semibold truncate">
                  {threads.find((t) => t.user_id === selectedUserId)?.user_email ?? '…'}
                </p>
                <p className="text-[10px] text-muted-fg">
                  {messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'}
                </p>
              </div>

              {/* Timeline */}
              <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-bg/20 min-h-[300px] max-h-[500px]">
                {loadingMessages ? (
                  <p className="text-center text-xs text-muted-fg italic py-8">Cargando…</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-muted-fg italic py-8">Sin mensajes.</p>
                ) : (
                  messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border p-2 bg-surface">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder="Escribí tu respuesta…"
                    rows={2}
                    className="flex-1 resize-none px-3 py-2 rounded-md bg-bg border border-border text-sm focus:border-primary focus:outline-none max-h-32"
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending || !input.trim()}
                    className="px-4 py-2 rounded-md bg-primary text-primary-fg font-semibold text-xs hover:bg-primary/90 disabled:opacity-40 shrink-0"
                  >
                    {sending ? '…' : 'Enviar'}
                  </button>
                </div>
                <p className="text-[9px] text-muted-fg text-center mt-1">
                  Enter para enviar · Shift+Enter para salto de línea
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const MessageBubble = ({ message }: { message: SupportMessage }) => {
  const fromAdmin = message.sender_is_admin;
  return (
    <div className={cn('flex', fromAdmin ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm',
        fromAdmin
          ? 'bg-primary text-primary-fg rounded-br-sm'
          : 'bg-surface-2 text-fg border border-border rounded-bl-sm',
      )}>
        {!fromAdmin && !message.read && (
          <div className="text-[9px] font-semibold uppercase tracking-widest text-danger mb-0.5">
            ● NUEVO
          </div>
        )}
        {fromAdmin && (
          <div className="text-[9px] font-semibold uppercase tracking-widest text-primary-fg/70 mb-0.5">
            Vos (admin)
          </div>
        )}
        <p className="whitespace-pre-wrap break-words leading-snug">{message.content}</p>
        <div className={cn(
          'text-[9px] mt-1 opacity-70',
          fromAdmin ? 'text-primary-fg' : 'text-muted-fg',
        )}>
          {new Date(message.created_at).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
};

const formatRelativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('es-AR');
};
