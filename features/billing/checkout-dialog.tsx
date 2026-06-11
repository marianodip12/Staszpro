import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

// ─── Configuración (cambiar acá si cambia el USD o el CBU) ────────────
const USD_TO_ARS = 1430;

const TRANSFER_INFO = {
  cbu_alias: 'STATZPRO.MP', // ⚠️ TODO: reemplazar con tu alias/CBU real
  cbu: '0000003100012345678901',
  cuit: '20-12345678-3',
  titular: 'Mariano Nicolás Losada',
  banco: 'Banco Galicia',
};

const WHATSAPP_NUMBER = '541126647764';

export type CheckoutPlan = 'pro' | 'club';
export type BillingCycle = 'monthly' | 'annual';

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  plan: CheckoutPlan | null;
  billingCycle: BillingCycle;
}

const PLAN_INFO: Record<CheckoutPlan, { label: string; monthlyUsd: number; annualUsd: number }> = {
  pro:  { label: 'Pro',  monthlyUsd: 5,  annualUsd: 45  },
  club: { label: 'Club', monthlyUsd: 15, annualUsd: 144 },
};

export const CheckoutDialog = ({ open, onClose, plan, billingCycle }: CheckoutDialogProps) => {
  const [step, setStep] = useState<'method' | 'transfer' | 'sent'>('method');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  if (!plan) return null;

  const info = PLAN_INFO[plan];
  const usd = billingCycle === 'annual' ? info.annualUsd : info.monthlyUsd;
  const ars = usd * USD_TO_ARS;

  const handleClose = () => {
    setStep('method');
    setError(null);
    setPaymentId(null);
    onClose();
  };

  const handleMercadoPago = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Crear el payment_request en la BD
      const { data: prId, error: rpcError } = await supabase.rpc('create_payment_request', {
        p_plan: plan,
        p_billing_cycle: billingCycle,
        p_payment_method: 'mercadopago',
        p_amount_usd: usd,
        p_amount_ars: ars,
        p_notes: null,
      });
      if (rpcError) throw rpcError;
      setPaymentId(prId);

      // 2. Pedir a la edge function la preference de MP
      const { data: prefData, error: fnError } = await supabase.functions.invoke('mp-create-preference', {
        body: {
          payment_request_id: prId,
          origin: window.location.origin,
        },
      });
      if (fnError) throw fnError;
      if (!prefData?.init_point) {
        throw new Error('No se pudo crear el checkout de Mercado Pago');
      }

      // 3. Redirigir al checkout oficial de MP
      //    (window.location, no window.open, para que la vuelta back_url funcione bien)
      window.location.href = prefData.init_point;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear el checkout');
      setSubmitting(false);
    }
  };

  const handleTransfer = () => {
    setStep('transfer');
  };

  const handleConfirmTransfer = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_payment_request', {
        p_plan: plan,
        p_billing_cycle: billingCycle,
        p_payment_method: 'transfer',
        p_amount_usd: usd,
        p_amount_ars: ars,
        p_notes: null,
      });
      if (rpcError) throw rpcError;
      setPaymentId(data);

      // Abrir WhatsApp con mensaje pre-armado
      const msg = encodeURIComponent(
        `Hola! Voy a transferir para el plan ${info.label} ${billingCycle === 'annual' ? 'ANUAL' : 'MENSUAL'}.\n\n` +
        `💰 Monto: $${ars.toLocaleString('es-AR')} ARS\n` +
        `🆔 ID de solicitud: ${data}\n\n` +
        `En cuanto haga la transferencia te paso el comprobante por acá.`,
      );
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
      setStep('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <Dialog open={open} onClose={handleClose} title={`Activar plan ${info.label}`}>
      {/* Resumen */}
      <div className="rounded-lg border border-border bg-surface-2/40 p-3 mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-muted-fg uppercase tracking-wider">
            Plan {info.label} {billingCycle === 'annual' ? 'Anual' : 'Mensual'}
          </span>
          <span className="text-xs font-semibold text-primary">
            {billingCycle === 'annual' ? '-25%' : ''}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular">${usd}</span>
          <span className="text-xs text-muted-fg">USD</span>
        </div>
        <div className="text-xs text-muted-fg mt-0.5">
          ≈ ${ars.toLocaleString('es-AR')} ARS · Cotización: $1 USD = $1.430 ARS
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* STEP: Método */}
      {step === 'method' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-2">
            Elegí cómo pagar
          </p>

          {/* MercadoPago */}
          <button
            type="button"
            onClick={handleMercadoPago}
            disabled={submitting}
            className={cn(
              'w-full p-4 rounded-lg border-2 border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-left flex items-center gap-3',
              submitting && 'opacity-60 cursor-wait',
            )}
          >
            <div className="w-10 h-10 rounded-md bg-blue-500/20 grid place-items-center text-xl shrink-0">
              💳
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-300">MercadoPago</p>
              <p className="text-[11px] text-muted-fg">Tarjeta de crédito o débito · Activación inmediata</p>
            </div>
            <span className="text-xs text-blue-400">→</span>
          </button>

          {/* Transferencia */}
          <button
            type="button"
            onClick={handleTransfer}
            disabled={submitting}
            className="w-full p-4 rounded-lg border border-border bg-surface hover:bg-surface-2 transition-colors text-left flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-md bg-surface-2 grid place-items-center text-xl shrink-0">
              🏦
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Transferencia bancaria</p>
              <p className="text-[11px] text-muted-fg">Activación manual en 24hs hábiles</p>
            </div>
            <span className="text-xs text-muted-fg">→</span>
          </button>

          <p className="text-[10px] text-muted-fg text-center pt-3">
            ¿Dudas? <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >Escribinos por WhatsApp</a>
          </p>
        </div>
      )}

      {/* STEP: Datos de transferencia */}
      {step === 'transfer' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-fg leading-relaxed">
            Hacé la transferencia por <strong className="text-fg">${ars.toLocaleString('es-AR')} ARS</strong> a estos datos:
          </p>

          <div className="rounded-lg border border-border bg-surface-2/40 divide-y divide-border">
            <TransferRow label="Alias" value={TRANSFER_INFO.cbu_alias} onCopy={copyToClipboard} />
            <TransferRow label="CBU" value={TRANSFER_INFO.cbu} onCopy={copyToClipboard} />
            <TransferRow label="CUIT" value={TRANSFER_INFO.cuit} onCopy={copyToClipboard} />
            <TransferRow label="Titular" value={TRANSFER_INFO.titular} />
            <TransferRow label="Banco" value={TRANSFER_INFO.banco} />
          </div>

          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
            <p className="text-xs font-semibold text-yellow-300 mb-1">⚠ Importante</p>
            <p className="text-[11px] text-yellow-200/90 leading-relaxed">
              Después de transferir, mandanos el comprobante por WhatsApp. El plan se activa dentro
              de las 24hs hábiles después de confirmar el pago.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('method')} className="flex-1">
              ← Volver
            </Button>
            <Button onClick={handleConfirmTransfer} disabled={submitting} className="flex-[2]">
              {submitting ? 'Creando solicitud…' : 'Ya transferí, avisar por WhatsApp →'}
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Confirmación enviada */}
      {step === 'sent' && (
        <div className="space-y-3 text-center py-4">
          <div className="text-5xl mb-2">✅</div>
          <h3 className="text-lg font-semibold">¡Solicitud creada!</h3>
          <p className="text-xs text-muted-fg leading-relaxed max-w-sm mx-auto">
            Tu solicitud quedó registrada con el ID:
          </p>
          {paymentId && (
            <div className="font-mono text-[11px] bg-surface-2 px-3 py-2 rounded inline-block">
              {paymentId.slice(0, 8)}…
            </div>
          )}
          <p className="text-xs text-muted-fg leading-relaxed max-w-sm mx-auto">
            En breve recibirás confirmación por WhatsApp. También podés ver el estado en{' '}
            <strong className="text-fg">Mi Plan</strong>.
          </p>
          <Button onClick={handleClose} className="mt-2">Cerrar</Button>
        </div>
      )}
    </Dialog>
  );
};

const TransferRow = ({
  label, value, onCopy,
}: {
  label: string; value: string; onCopy?: (v: string) => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!onCopy) return;
    onCopy(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-fg">{label}</p>
        <p className="text-sm font-mono tabular truncate">{value}</p>
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'text-[10px] px-2 py-1 rounded border transition-colors shrink-0',
            copied
              ? 'border-green-500/40 bg-green-500/10 text-green-400'
              : 'border-border bg-surface hover:bg-surface-2 text-muted-fg',
          )}
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      )}
    </div>
  );
};
