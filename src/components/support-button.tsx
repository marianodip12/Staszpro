import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import {
  postSupportMessage,
  listMySupportMessages,
  countMyUnreadAdminMessages,
  markMyAdminMessagesRead,
  type SupportMessage,
} from '@/lib/support-chat-api';

const WA_NUMBER = '541126647764';
const EMAIL = 'marianonicoslosada@gmail.com';

const GREETING_DISMISSED_KEY = 'statzpro_support_greeting_dismissed';
const GREETING_DELAY_MS = 8000;
const POLL_INTERVAL_MS = 5000;

const isGreetingDismissed = (): boolean => {
  try { return localStorage.getItem(GREETING_DISMISSED_KEY) === '1'; } catch { return true; }
};

const dismissGreeting = (): void => {
  try { localStorage.setItem(GREETING_DISMISSED_KEY, '1'); } catch { /* ignore */ }
};

type Tab = 'options' | 'chat';

export const SupportButton = () => {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Greeting timer
  useEffect(() => {
    if (isGreetingDismissed()) return;
    const t = window.setTimeout(() => setGreetingVisible(true), GREETING_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Polling de unread admin messages (solo si logueado)
  useEffect(() => {
    if (!isAuthenticated) { setUnreadCount(0); return; }
    let cancelled = false;
    const check = async () => {
      try {
        const n = await countMyUnreadAdminMessages();
        if (!cancelled) setUnreadCount(n);
      } catch { /* silenciar */ }
    };
    void check();
    const iv = window.setInterval(check, POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(iv); };
  }, [isAuthenticated]);

  const handleOpen = () => {
    setOpen(true);
    if (isAuthenticated) setTab('chat');
    else setTab('options');
    if (greetingVisible) {
      setGreetingVisible(false);
      dismissGreeting();
    }
  };

  const closeGreeting = () => {
    setGreetingVisible(false);
    dismissGreeting();
  };

  const handleMarkedRead = useCallback(() => setUnreadCount(0), []);

  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola! Necesito ayuda con StatzPro')}`;
  const mailUrl = `mailto:${EMAIL}?subject=${encodeURIComponent('Soporte StatzPro')}`;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {/* Burbuja de saludo */}
      {greetingVisible && !open && (
        <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300 mb-1
                        relative w-64 rounded-2xl bg-surface border border-primary/40 shadow-2xl p-3">
          <button
            type="button"
            onClick={closeGreeting}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface-2 border border-border text-muted-fg hover:text-fg text-[10px] flex items-center justify-center"
            title="Cerrar"
          >
            ✕
          </button>
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-lg">
              👋
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg leading-tight">
                ¡Hola! ¿Te ayudo?
              </p>
              <p className="text-[11px] text-muted-fg mt-0.5 leading-snug">
                {isAuthenticated
                  ? 'Escribinos por chat y te respondemos en el día.'
                  : 'Estamos activos. Contame qué necesitás y te contestamos.'}
              </p>
              <button
                type="button"
                onClick={handleOpen}
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                Abrir chat →
              </button>
            </div>
          </div>
          <span className="absolute -bottom-1.5 right-6 w-3 h-3 rotate-45 bg-surface border-b border-r border-primary/40" />
        </div>
      )}

      {/* Panel abierto */}
      {open && (
        <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200
                        w-[calc(100vw-2rem)] sm:w-96 max-w-md rounded-xl bg-surface border border-border shadow-2xl overflow-hidden mb-1">
          {/* Header con tabs (solo logueados ven "Chat") */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-bg/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-goal animate-pulse" />
              <span className="text-xs font-semibold">Soporte activo</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-fg hover:text-fg text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {isAuthenticated && (
            <div className="flex border-b border-border bg-bg/20">
              <TabBtn active={tab === 'chat'}    onClick={() => setTab('chat')}>
                Chat en vivo
                {unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </TabBtn>
              <TabBtn active={tab === 'options'} onClick={() => setTab('options')}>
                Otras opciones
              </TabBtn>
            </div>
          )}

          {/* Body */}
          {tab === 'chat' && isAuthenticated ? (
            <ChatPanel onMarkedRead={handleMarkedRead} />
          ) : (
            <OptionsPanel
              isAuthenticated={isAuthenticated}
              waUrl={waUrl}
              mailUrl={mailUrl}
              onClose={() => setOpen(false)}
            />
          )}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className={cn(
          'pointer-events-auto w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 relative',
          open
            ? 'bg-surface border border-border text-muted-fg rotate-45'
            : 'bg-primary text-primary-fg hover:bg-primary/90',
        )}
        title="Soporte"
      >
        {(greetingVisible || unreadCount > 0) && !open && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-danger border-2 border-bg animate-pulse" />
        )}
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
          </svg>
        )}
      </button>
    </div>
  );
};

// ─── Tab button ──────────────────────────────────────────────────────────

const TabBtn = ({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors border-b-2',
      active
        ? 'text-primary border-primary'
        : 'text-muted-fg border-transparent hover:text-fg',
    )}
  >
    {children}
  </button>
);

// ─── Chat panel ──────────────────────────────────────────────────────────

/** Extrae un mensaje legible de un error de Supabase o de cualquier throw. */
const extractError = (e: unknown, fallback: string): string => {
  if (e && typeof e === 'object') {
    const err = e as { message?: string; details?: string; hint?: string; code?: string };
    // Error específico de Supabase cuando el schema cache está stale
    if (err.code === 'PGRST202') {
      return 'El chat está inicializándose. Reintentando en unos segundos…';
    }
    const parts = [err.message, err.details, err.hint, err.code ? `(${err.code})` : null]
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' · ');
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
};

/** Detecta si un error es PGRST202 (schema cache stale). */
const isPgrst202 = (e: unknown): boolean => {
  if (e && typeof e === 'object') {
    const err = e as { code?: string; message?: string };
    return err.code === 'PGRST202' ||
      (typeof err.message === 'string' && err.message.includes('schema cache'));
  }
  return false;
};

const ChatPanel = ({ onMarkedRead }: { onMarkedRead: () => void }) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSchemaStale, setIsSchemaStale] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Poll de mensajes cada 5s (más rápido si hay schema stale para retry)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const msgs = await listMySupportMessages();
        if (cancelled) return;
        setMessages(msgs);
        setLoading(false);
        setError(null);
        setIsSchemaStale(false);
        if (msgs.some((m) => m.sender_is_admin && !m.read)) {
          try { await markMyAdminMessagesRead(); onMarkedRead(); } catch { /* ignore */ }
        }
      } catch (e) {
        console.error('[support chat] list_my_support_messages failed:', e);
        if (!cancelled) {
          setError(extractError(e, 'Error cargando mensajes'));
          setIsSchemaStale(isPgrst202(e));
          setLoading(false);
        }
      }
    };
    void load();
    // Retry más agresivo si hay PGRST202: cada 3s en vez de 5s
    const interval = isSchemaStale ? 3000 : POLL_INTERVAL_MS;
    const iv = window.setInterval(load, interval);
    return () => { cancelled = true; window.clearInterval(iv); };
  }, [onMarkedRead, isSchemaStale]);

  // Auto-scroll al fondo cuando llega mensaje nuevo
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      await postSupportMessage(text);
      setInput('');
      const msgs = await listMySupportMessages();
      setMessages(msgs);
      setIsSchemaStale(false);
    } catch (e) {
      console.error('[support chat] post_support_message failed:', e);
      setError(extractError(e, 'No pudimos enviar el mensaje'));
      setIsSchemaStale(isPgrst202(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-96">
      {/* Lista de mensajes */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-bg/20">
        {loading ? (
          <p className="text-center text-xs text-muted-fg italic py-8">Cargando…</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-xs text-muted-fg leading-relaxed">
              Escribí tu consulta abajo.<br />
              Te respondemos lo antes posible.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))
        )}
      </div>

      {error && (
        <div className={cn(
          'mx-3 my-2 rounded-md px-2 py-1.5 text-[11px] flex items-start gap-2',
          isSchemaStale
            ? 'border border-amber-500/40 bg-amber-500/10 text-amber-500'
            : 'border border-danger/40 bg-danger/10 text-danger',
        )}>
          {isSchemaStale && (
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse mt-0.5 shrink-0" />
          )}
          <span>{error}</span>
        </div>
      )}

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
            placeholder="Escribí tu mensaje…"
            rows={1}
            className="flex-1 resize-none px-3 py-2 rounded-md bg-bg border border-border text-sm focus:border-primary focus:outline-none max-h-24"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="px-3 py-2 rounded-md bg-primary text-primary-fg font-semibold text-xs hover:bg-primary/90 disabled:opacity-40 shrink-0"
          >
            {sending ? '…' : 'Enviar'}
          </button>
        </div>
        <p className="text-[9px] text-muted-fg text-center mt-1">
          Enter para enviar · Shift+Enter para salto de línea
        </p>
      </div>
    </div>
  );
};

const MessageBubble = ({ message }: { message: SupportMessage }) => {
  const fromAdmin = message.sender_is_admin;
  return (
    <div className={cn('flex', fromAdmin ? 'justify-start' : 'justify-end')}>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm',
        fromAdmin
          ? 'bg-surface-2 text-fg border border-border rounded-bl-sm'
          : 'bg-primary text-primary-fg rounded-br-sm',
      )}>
        {fromAdmin && (
          <div className="text-[9px] font-semibold uppercase tracking-widest text-primary mb-0.5">
            🛡️ StatzPro
          </div>
        )}
        <p className="whitespace-pre-wrap break-words leading-snug">{message.content}</p>
        <div className={cn(
          'text-[9px] mt-1 opacity-70',
          fromAdmin ? 'text-muted-fg' : 'text-primary-fg',
        )}>
          {new Date(message.created_at).toLocaleTimeString('es-AR', {
            hour: '2-digit', minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Options panel (ticket / WA / email) ─────────────────────────────────

const OptionsPanel = ({
  isAuthenticated, waUrl, mailUrl, onClose,
}: {
  isAuthenticated: boolean;
  waUrl: string;
  mailUrl: string;
  onClose: () => void;
}) => (
  <div className="p-3 space-y-2">
    <div className="rounded-md bg-bg/40 border border-border px-3 py-2 mb-2">
      <p className="text-xs font-semibold">Elegí cómo contactarnos</p>
      <p className="text-[10px] text-muted-fg mt-0.5">
        {isAuthenticated
          ? 'También podés escribir directo por chat en vivo (arriba).'
          : 'Registrate para acceder al chat en vivo con respuesta directa del equipo.'}
      </p>
    </div>
    {isAuthenticated && (
      <Link
        to="/app/support"
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-surface-2 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
      >
        🎫 <span>Crear ticket formal</span>
      </Link>
    )}
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-[#25D366] text-white text-sm font-medium hover:bg-[#20bd5a] transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
      </svg>
      <span>WhatsApp</span>
    </a>
    <a
      href={mailUrl}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-primary text-primary-fg text-sm font-medium hover:bg-primary/90 transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2"/>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>
      <span>Email</span>
    </a>
  </div>
);
