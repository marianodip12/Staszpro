import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

/**
 * 📩 Recordatorio de confirmación de mail.
 *
 * Aparece cuando el usuario entró a la app pero todavía no confirmó su email.
 * No bloquea nada — solo recuerda, con opción de reenviar el mail.
 * Se oculta solo cuando `email_confirmed_at` está seteado.
 */
export const ConfirmEmailBanner = ({ className }: { className?: string }) => {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Supabase marca email_confirmed_at cuando el usuario confirma.
  const confirmed = Boolean(
    (user as { email_confirmed_at?: string } | null)?.email_confirmed_at,
  );

  if (!user?.email || confirmed || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      if (!error) setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 flex items-start gap-2.5',
        className,
      )}
    >
      <span className="text-lg leading-none mt-0.5">📩</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-fg">
          Confirmá tu email para no perder tu cuenta
        </p>
        <p className="text-[11px] text-muted-fg mt-0.5 leading-relaxed">
          Te mandamos un mail a <strong>{user.email}</strong>. Podés seguir usando la app
          igual, pero confirmalo cuanto antes así no perdés tus datos. Revisá spam si no aparece.
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          {sent ? (
            <span className="text-[11px] text-goal">✓ Mail reenviado</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={sending}
              className="text-[11px] text-primary hover:underline disabled:opacity-50"
            >
              {sending ? 'Enviando…' : 'Reenviar mail de confirmación'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[11px] text-muted-fg hover:text-fg"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
};
