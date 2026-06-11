import { useEffect, useState } from 'react';
import { betaDaysLeft, usePlan } from '@/lib/use-plan';
import { DonationDialog } from '@/components/donation-dialog';
import { cn } from '@/lib/cn';

const DISMISS_KEY = 'hp_beta_banner_dismissed';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // re-aparece cada 24h aunque lo descarten

interface BetaBannerProps {
  /** Si true, banner sticky en la parte superior. Default false (flujo de página). */
  sticky?: boolean;
  className?: string;
}

/**
 * Banner global que comunica el modo beta. Aparece cuando `betaActive` es true.
 * Es dismissible — al cerrar guarda timestamp en localStorage. Reaparece a las 24h
 * para que no se olvide que la beta tiene fecha de vencimiento.
 */
export const BetaBanner = ({ sticky = false, className }: BetaBannerProps) => {
  const { betaActive, betaUntil } = usePlan();
  const [dismissed, setDismissed] = useState(true); // empezamos oculto hasta chequear
  const [donateOpen, setDonateOpen] = useState(false);

  useEffect(() => {
    if (!betaActive) {
      setDismissed(true);
      return;
    }
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) {
        setDismissed(false);
        return;
      }
      const ts = Number(raw);
      if (!Number.isFinite(ts) || Date.now() - ts > DISMISS_TTL_MS) {
        setDismissed(false);
      } else {
        setDismissed(true);
      }
    } catch {
      setDismissed(false);
    }
  }, [betaActive]);

  if (!betaActive || dismissed) return null;

  const days = betaDaysLeft(betaUntil);
  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className={cn(
        'border border-primary/40 bg-primary/10 text-primary-fg/90',
        'rounded-lg px-3 py-2 flex items-center gap-3 text-xs',
        sticky && 'sticky top-0 z-40',
        className,
      )}
    >
      <span
        className="px-2 py-0.5 rounded bg-primary/30 text-[10px] font-bold uppercase tracking-wider text-primary shrink-0"
        aria-label="Modo beta"
      >
        BETA
      </span>
      <p className="flex-1 leading-snug text-fg">
        Estás usando StatzPro v11.1 en beta · <span className="text-muted-fg">Todas las features pagas están desbloqueadas por {days} días más</span>
      </p>
      <button
        type="button"
        onClick={() => setDonateOpen(true)}
        className="shrink-0 px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-[11px] font-bold transition-colors shadow-[0_0_12px_rgba(245,158,11,0.25)]"
      >
        💛 Donar
      </button>
      <DonationDialog open={donateOpen} onClose={() => setDonateOpen(false)} />
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Cerrar banner"
        className="shrink-0 w-6 h-6 grid place-items-center rounded text-muted-fg hover:text-fg hover:bg-surface-2 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
