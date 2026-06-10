import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

const PRESETS = [2000, 5000, 10000, 20000];

const TransferRow = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard bloqueado */ }
  };
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-fg shrink-0 w-16">{label}</span>
      <span className={cn('flex-1 text-right truncate text-fg', mono && 'font-mono')}>{value}</span>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 px-1.5 py-0.5 rounded border border-border text-[10px] text-muted-fg hover:text-fg hover:border-primary/50 transition-colors"
      >
        {copied ? '✓' : 'Copiar'}
      </button>
    </div>
  );
};

interface DonationDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Donaciones de fase beta. Mensaje honesto: el proyecto lo mantiene una sola
 * persona y todo lo recaudado va al mantenimiento mensual (servidores, base
 * de datos, sistemas de IA). Checkout vía Mercado Pago (edge function
 * mp-create-preference con { donation: true }).
 */
export const DonationDialog = ({ open, onClose }: DonationDialogProps) => {
  const [amount, setAmount] = useState<number>(5000);
  const [custom, setCustom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAmount = custom ? Number(custom) : amount;
  const valid = Number.isFinite(effectiveAmount) && effectiveAmount >= 500;

  const handleDonate = async () => {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('mp-create-preference', {
        body: {
          donation: true,
          amount_ars: effectiveAmount,
          origin: window.location.origin,
        },
      });
      if (fnError) throw fnError;
      if (!data?.init_point) throw new Error('No se pudo crear el checkout');
      window.location.href = data.init_point;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar la donación');
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="☕ Apoyar StatzPro"
      description="Proyecto independiente, en beta"
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-fg leading-relaxed">
          StatzPro lo desarrolla y mantiene <span className="text-fg font-medium">una sola persona</span>.
          Durante la beta todas las features están desbloqueadas, y{' '}
          <span className="text-fg font-medium">el 100% de lo donado va al mantenimiento mensual</span>:
          servidores, base de datos y sistemas de IA. Tu aporte literalmente mantiene esto vivo.
        </p>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-1.5">
            Monto (ARS)
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setAmount(p); setCustom(''); }}
                className={cn(
                  'h-10 rounded-md border text-xs font-mono font-semibold tabular transition-colors',
                  !custom && amount === p
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-surface-2 text-muted-fg hover:border-primary/50',
                )}
              >
                ${p.toLocaleString('es-AR')}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={500}
            placeholder="Otro monto (mínimo $500)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="mt-2 w-full h-10 rounded-md border border-border bg-surface px-3 text-sm font-mono"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button onClick={handleDonate} disabled={!valid || submitting} className="w-full">
          {submitting ? 'Creando checkout…' : `Donar $${(valid ? effectiveAmount : 0).toLocaleString('es-AR')} con Mercado Pago`}
        </Button>

        {/* Transferencia directa */}
        <div className="rounded-md border border-border bg-surface-2/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-2">
            O por transferencia directa
          </p>
          <div className="space-y-1.5">
            <TransferRow label="Titular" value="Mariano Nicolas Losada" />
            <TransferRow label="Alias" value="statzpro.2026" mono />
            <TransferRow label="CVU" value="0000003100068202065759" mono />
            <TransferRow label="CUIT/CUIL" value="20-39978493-0" mono />
          </div>
        </div>

        <p className="text-[10px] text-muted-fg text-center">
          Pago procesado por Mercado Pago. No guardamos datos de tarjetas.
        </p>
      </div>
    </Dialog>
  );
};
