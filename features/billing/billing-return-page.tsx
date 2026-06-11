import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { usePlan } from '@/lib/use-plan';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type ReturnStatus = 'success' | 'failure' | 'pending';

interface BillingReturnPageProps {
  status: ReturnStatus;
}

interface PaymentStatusRow {
  id: string;
  status: 'pending' | 'review' | 'paid' | 'rejected' | 'cancelled';
  mp_status: string | null;
  plan: string;
  billing_cycle: string;
  paid_at: string | null;
}

const MAX_POLLS = 12;       // 12 × 2.5s = 30s máximo
const POLL_INTERVAL_MS = 2500;

export const BillingReturnPage = ({ status }: BillingReturnPageProps) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paymentId = params.get('id');
  const { refresh: refreshPlan } = usePlan();

  const [polling, setPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [row, setRow] = useState<PaymentStatusRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hacemos polling solo si MP nos devolvió a "success" o "pending"
  // (en "failure" no hay nada que esperar)
  useEffect(() => {
    if (!paymentId || status === 'failure') {
      setPolling(false);
      return;
    }

    let cancelled = false;
    let pollIndex = 0;

    const poll = async () => {
      const { data, error: rpcErr } = await supabase.rpc('get_payment_status', {
        p_payment_id: paymentId,
      });

      if (cancelled) return;

      if (rpcErr) {
        setError(rpcErr.message);
        setPolling(false);
        return;
      }

      const r = (data?.[0] ?? null) as PaymentStatusRow | null;
      if (r) setRow(r);

      // Si llegó a estado final, refresh del plan y parar
      if (r && (r.status === 'paid' || r.status === 'rejected' || r.status === 'cancelled')) {
        if (r.status === 'paid') await refreshPlan();
        setPolling(false);
        return;
      }

      pollIndex += 1;
      setPollCount(pollIndex);

      if (pollIndex >= MAX_POLLS) {
        setPolling(false);
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => { cancelled = true; };
  }, [paymentId, status, refreshPlan]);

  // Sin payment_id: probablemente entró a mano. Redirigimos a planes.
  if (!paymentId) {
    return (
      <div className="max-w-md mx-auto p-6 text-center space-y-4">
        <h1 className="text-xl font-semibold">No encontramos tu solicitud</h1>
        <p className="text-sm text-muted-fg">Volvé a la página de planes para reintentar.</p>
        <Button onClick={() => navigate('/app/plans')}>Ir a Planes</Button>
      </div>
    );
  }

  // === FALLO directo desde MP ===
  if (status === 'failure') {
    return (
      <ResultCard
        emoji="❌"
        title="El pago no se completó"
        tone="error"
        description="Mercado Pago rechazó el pago o lo cancelaste. No se cobró nada."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/app/plans')}>← Volver a planes</Button>
            <Button onClick={() => navigate('/app/plans')}>Intentar de nuevo</Button>
          </>
        }
      />
    );
  }

  // === SUCCESS pero todavía no confirmado por webhook ===
  if (polling && (!row || row.status !== 'paid')) {
    return (
      <ResultCard
        emoji="⏳"
        title="Confirmando tu pago…"
        tone="info"
        description={
          <>
            Estamos esperando la confirmación de Mercado Pago.
            <br />
            <span className="text-[11px] text-muted-fg">Intento {pollCount + 1} de {MAX_POLLS}</span>
          </>
        }
      />
    );
  }

  // === SUCCESS confirmado ===
  if (row?.status === 'paid') {
    return (
      <ResultCard
        emoji="✅"
        title="¡Plan activado!"
        tone="success"
        description={
          <>
            Tu plan <strong className="text-fg">{row.plan.toUpperCase()}</strong>{' '}
            {row.billing_cycle === 'annual' ? 'anual' : 'mensual'} ya está activo.
          </>
        }
        actions={<Button onClick={() => navigate('/app')}>Ir a la app →</Button>}
      />
    );
  }

  // === Rechazado por el webhook ===
  if (row?.status === 'rejected' || row?.status === 'cancelled') {
    return (
      <ResultCard
        emoji="❌"
        title="El pago fue rechazado"
        tone="error"
        description={`Estado de MP: ${row.mp_status ?? 'desconocido'}`}
        actions={<Button onClick={() => navigate('/app/plans')}>Reintentar</Button>}
      />
    );
  }

  // === Pending / timeout del polling ===
  return (
    <ResultCard
      emoji="🕐"
      title="Tu pago está pendiente"
      tone="warning"
      description={
        <>
          Mercado Pago todavía no confirmó el cobro. Esto puede demorar unos minutos
          (sobre todo si pagaste por efectivo en Rapipago / Pago Fácil).
          <br /><br />
          Vas a recibir el plan activado apenas se confirme. Podés revisar el estado
          en <strong className="text-fg">Mi Plan</strong>.
        </>
      }
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate('/app/plans')}>Ver mi plan</Button>
          <Button onClick={() => navigate('/app')}>Ir a la app</Button>
        </>
      }
      footer={error ? `Error: ${error}` : null}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const ResultCard = ({
  emoji, title, tone, description, actions, footer,
}: {
  emoji: string;
  title: string;
  tone: 'success' | 'error' | 'warning' | 'info';
  description: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}) => {
  const toneCls = {
    success: 'border-green-500/30 bg-green-500/5',
    error:   'border-red-500/30 bg-red-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    info:    'border-border bg-surface-2/40',
  }[tone];

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className={cn('max-w-md w-full rounded-xl border p-8 text-center space-y-4', toneCls)}>
        <div className="text-6xl">{emoji}</div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="text-sm text-muted-fg leading-relaxed">{description}</div>
        {actions && <div className="flex gap-2 justify-center pt-2">{actions}</div>}
        {footer && <p className="text-[10px] text-muted-fg pt-2">{footer}</p>}
      </div>
    </div>
  );
};
