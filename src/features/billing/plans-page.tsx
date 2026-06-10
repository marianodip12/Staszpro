import { useState } from 'react';
import { usePlan, type Plan } from '@/lib/use-plan';
import { cn } from '@/lib/cn';
import { CheckoutDialog, type CheckoutPlan } from './checkout-dialog';
import { betaDaysLeft } from '@/lib/use-plan';
import { DonationDialog } from '@/components/donation-dialog';

const WA_NUMBER = '541126647764';

type BillingCycle = 'monthly' | 'annual';

export const PlansPage = () => {
  const { plan: currentPlan, matchCount, matchLimit, loading, betaActive } = usePlan();
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null);
  const [donateOpen, setDonateOpen] = useState(false);

  const handleSelectPlan = (plan: Plan) => {
    // ⚠️ BETA: pagos bloqueados hasta el fin de la beta (30/8). Todos los
    // planes están desbloqueados gratis; ofrecemos donar en su lugar.
    if (betaActive) {
      setDonateOpen(true);
      return;
    }
    if (plan === 'elite') {
      const msg = encodeURIComponent('Hola, me interesa el plan Elite de StatzPro. ¿Podemos charlar?');
      window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
      return;
    }
    if (plan === 'free') return;
    if (plan === currentPlan) return;
    // Abrir dialog de checkout
    setCheckoutPlan(plan as CheckoutPlan);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <p className="text-[10px] tracking-[0.2em] text-muted-fg uppercase">StatzPro</p>
        <h1 className="text-2xl md:text-3xl font-bold">Empezá gratis. Crece con vos.</h1>
        <p className="text-sm text-muted-fg max-w-xl mx-auto">
          10 partidos gratis para probar la app. Pasate a Pro o Club cuando quieras más análisis.
        </p>
        <div className="max-w-xl mx-auto rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-left">
          <p className="text-sm font-semibold text-primary">🚀 Beta abierta: todo gratis hasta el 30 de agosto</p>
          <p className="text-xs text-muted-fg mt-1 leading-relaxed">
            Durante la beta todos los planes están desbloqueados y los pagos están desactivados.
            Si la app te sirve y querés bancar el proyecto, podés{' '}
            <button type="button" onClick={() => setDonateOpen(true)} className="text-primary underline underline-offset-2">
              hacer una donación
            </button>
            {' '}— todo va al mantenimiento de servidores ({betaDaysLeft()} días de beta restantes).
          </p>
        </div>
        {currentPlan === 'free' && !loading && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-xs">
            <span className="text-yellow-400">⚠</span>
            <span className="text-yellow-300">
              Estás usando {matchCount} de {matchLimit} partidos gratis
            </span>
          </div>
        )}
      </div>

      {/* Modos rápido vs completo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ModeCard
          icon="⚡"
          color="#1D9E75"
          title="Modo Rápido"
          tag="FREE"
          description="Registrá goles, atajadas, errores, palos, 7m, 2 min, tarjetas y cambios en 2 toques."
        />
        <ModeCard
          icon="📊"
          color="#378ADD"
          title="Modo Completo"
          tag="PRO+"
          description="Mapa de tiros, eficacia por zona, análisis por jugador, tendencias y comparativas."
        />
      </div>

      {/* Toggle billing cycle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-surface border border-border rounded-lg p-1">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={cn(
              'px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
              cycle === 'monthly' ? 'bg-primary text-primary-fg' : 'text-muted-fg hover:text-fg',
            )}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setCycle('annual')}
            className={cn(
              'px-4 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2',
              cycle === 'annual' ? 'bg-primary text-primary-fg' : 'text-muted-fg hover:text-fg',
            )}
          >
            Anual
            <span className="text-[9px] px-1.5 py-0.5 bg-green-500 text-white rounded font-semibold">-25%</span>
          </button>
        </div>
      </div>

      {/* 4 plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* FREE */}
        <PlanCard
          name="FREE"
          tagIcon="⚡"
          tagColor="#0F6E56"
          tagTextColor="#5DCAA5"
          price="$0"
          priceSuffix="para siempre"
          tagline="Probá la app con tu equipo"
          features={[
            { text: 'Modo Rápido completo', highlight: false },
            { text: 'Equipos ilimitados', highlight: false },
            { text: 'Hasta 10 partidos', highlight: 'warn' },
            { text: 'Stats básicas por jugador', highlight: false },
            { text: 'Stats de arquero (atajadas)', highlight: false },
            { text: 'Score y eventos en vivo', highlight: false },
            { text: 'Sin análisis avanzado', highlight: 'muted' },
          ]}
          ctaLabel={currentPlan === 'free' ? 'Plan actual' : 'Empezar gratis'}
          ctaDisabled={currentPlan === 'free'}
          onClick={() => handleSelectPlan('free')}
          isCurrent={currentPlan === 'free'}
        />

        {/* PRO */}
        <PlanCard
          name="PRO"
          tagIcon="⚡+📊"
          tagColor="#185FA5"
          tagTextColor="#B5D4F4"
          price={cycle === 'annual' ? '$45' : '$5'}
          priceSuffix={cycle === 'annual' ? '/año' : '/mes'}
          priceSubtext={cycle === 'annual' ? '≈ 5.360 ARS/mes' : '≈ 7.150 ARS/mes'}
          tagline="Modo Completo desbloqueado"
          features={[
            { text: 'Todo lo de Free', highlight: false },
            { text: 'Partidos ilimitados', highlight: false },
            { text: 'Modo Completo', highlight: 'good' },
            { text: 'Mapa de tiros + zonas', highlight: 'good' },
            { text: 'Análisis profundo', highlight: 'good' },
            { text: 'Exportar PDF', highlight: false },
            { text: 'Compartir análisis', highlight: false },
          ]}
          ctaLabel={currentPlan === 'pro' ? 'Plan actual' : 'Probar 7 días gratis'}
          ctaDisabled={currentPlan === 'pro'}
          onClick={() => handleSelectPlan('pro')}
          isCurrent={currentPlan === 'pro'}
          recommended
        />

        {/* CLUB */}
        <PlanCard
          name="CLUB"
          tagIcon="🎬+🤖"
          tagColor="#0F6E56"
          tagTextColor="#9FE1CB"
          price={cycle === 'annual' ? '$144' : '$15'}
          priceSuffix={cycle === 'annual' ? '/año' : '/mes'}
          priceSubtext={cycle === 'annual' ? '3 usuarios · ≈17K ARS/mes' : '3 usuarios incluidos'}
          tagline="Video + IA + cuerpo técnico"
          features={[
            { text: 'Todo lo de Pro', highlight: false },
            { text: '3 cuentas DT/staff', highlight: false },
            { text: '🎬 Video sincronizado', highlight: 'good' },
            { text: '🎬 Sube a YouTube del club', highlight: 'good' },
            { text: '🤖 Análisis con IA', highlight: 'good' },
            { text: '🤖 Compilador de jugadas', highlight: 'good' },
            { text: 'Vista de arquero avanzada', highlight: false },
            { text: 'Soporte WhatsApp', highlight: false },
          ]}
          ctaLabel={currentPlan === 'club' ? 'Plan actual' : 'Probar 14 días gratis'}
          ctaDisabled={currentPlan === 'club'}
          onClick={() => handleSelectPlan('club')}
          isCurrent={currentPlan === 'club'}
          starred
        />

        {/* ELITE */}
        <PlanCard
          name="ELITE"
          tagIcon="🏆"
          tagColor="#854F0B"
          tagTextColor="#FAC775"
          price="A consultar"
          priceSuffix=""
          priceSubtext="según necesidades"
          tagline="Personalización total para el club"
          features={[
            { text: 'Todo lo de Club', highlight: false },
            { text: 'Usuarios ilimitados', highlight: false },
            { text: 'Multi-equipo (formativas)', highlight: false },
            { text: 'Features a pedido', highlight: false },
            { text: 'Reportes federación', highlight: false },
            { text: 'Capacitación al staff', highlight: false },
            { text: 'Integraciones a medida', highlight: false },
            { text: 'Soporte dedicado', highlight: false },
          ]}
          ctaLabel="Hablemos por WhatsApp"
          onClick={() => handleSelectPlan('elite')}
          isCurrent={currentPlan === 'elite'}
          isElite
        />
      </div>

      {/* Trust badges */}
      <div className="text-center space-y-2 pt-4">
        <p className="text-[10px] tracking-widest text-muted-fg uppercase">
          Pago seguro · Cancelá cuando quieras · Sin permanencia
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {['Tarjeta', 'MercadoPago', 'Transferencia'].map((m) => (
            <span key={m} className="text-[10px] px-2.5 py-1 rounded-md border border-border bg-surface text-muted-fg">
              {m}
            </span>
          ))}
        </div>
      </div>

      <DonationDialog open={donateOpen} onClose={() => setDonateOpen(false)} />
      <CheckoutDialog
        open={checkoutPlan !== null}
        onClose={() => setCheckoutPlan(null)}
        plan={checkoutPlan}
        billingCycle={cycle}
      />
    </div>
  );
};

// ─── Subcomponentes ─────────────────────────────────────────

const ModeCard = ({
  icon, color, title, tag, description,
}: { icon: string; color: string; title: string; tag: string; description: string }) => (
  <div className="rounded-xl border border-border bg-surface p-3.5 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-full grid place-items-center text-sm"
        style={{ background: color }}
      >
        {icon}
      </div>
      <p className="text-xs font-semibold">{title}</p>
      <span
        className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
        style={{ background: color, color: 'white' }}
      >
        {tag}
      </span>
    </div>
    <p className="text-[11px] text-muted-fg leading-relaxed">{description}</p>
  </div>
);

interface Feature {
  text: string;
  highlight: false | 'good' | 'warn' | 'muted';
}

const PlanCard = ({
  name, tagIcon, tagColor, tagTextColor,
  price, priceSuffix, priceSubtext,
  tagline, features,
  ctaLabel, ctaDisabled = false, onClick,
  isCurrent = false, recommended = false, starred = false, isElite = false,
}: {
  name: string;
  tagIcon: string;
  tagColor: string;
  tagTextColor: string;
  price: string;
  priceSuffix: string;
  priceSubtext?: string;
  tagline: string;
  features: Feature[];
  ctaLabel: string;
  ctaDisabled?: boolean;
  onClick: () => void;
  isCurrent?: boolean;
  recommended?: boolean;
  starred?: boolean;
  isElite?: boolean;
}) => {
  const borderClass = recommended
    ? 'border-2 border-primary'
    : starred
      ? 'border-2 border-green-500'
      : isElite
        ? 'border border-amber-600/60'
        : 'border border-border';

  return (
    <div className={cn('rounded-xl bg-surface p-3.5 flex flex-col relative', borderClass)}>
      {recommended && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2.5 py-0.5 bg-primary text-primary-fg rounded-md font-semibold whitespace-nowrap">
          RECOMENDADO
        </span>
      )}
      {starred && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2.5 py-0.5 bg-green-500 text-white rounded-md font-semibold whitespace-nowrap">
          ⭐ MÁS VALOR
        </span>
      )}
      {isElite && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2.5 py-0.5 bg-amber-600 text-white rounded-md font-semibold whitespace-nowrap">
          A MEDIDA
        </span>
      )}

      <div className="flex items-center gap-2 mb-2">
        <p className="text-[11px] tracking-widest font-semibold text-muted-fg">{name}</p>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded"
          style={{ background: tagColor, color: tagTextColor }}
        >
          {tagIcon}
        </span>
      </div>

      <div className="mb-1">
        <span className={cn('font-bold text-fg', isElite ? 'text-base' : 'text-2xl')}>{price}</span>
        {priceSuffix && <span className="text-[11px] text-muted-fg ml-1">{priceSuffix}</span>}
      </div>
      <p className="text-[10px] text-muted-fg mb-3">{priceSubtext || ' '}</p>

      <p className="text-[11px] text-green-400 font-medium mb-3 leading-snug">{tagline}</p>

      <ul className="space-y-1 text-[11px] flex-1 mb-3">
        {features.map((f, i) => (
          <li
            key={i}
            className={cn(
              'leading-relaxed',
              f.highlight === 'good' && 'text-green-400',
              f.highlight === 'warn' && 'text-yellow-400',
              f.highlight === 'muted' && 'text-muted-fg',
              !f.highlight && 'text-fg/90',
            )}
          >
            {f.highlight === 'warn' ? '⚠ ' : f.highlight === 'muted' ? '— ' : '✓ '}
            {f.text}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onClick}
        disabled={ctaDisabled}
        className={cn(
          'w-full px-3 py-2 rounded-md text-xs font-medium transition-colors',
          isCurrent
            ? 'bg-surface-2 border border-border text-muted-fg cursor-not-allowed'
            : recommended
              ? 'bg-primary text-primary-fg hover:bg-primary/90'
              : starred
                ? 'bg-green-600 text-white hover:bg-green-700'
                : isElite
                  ? 'border border-amber-600 bg-transparent text-amber-400 hover:bg-amber-600/10'
                  : 'border border-border bg-transparent text-fg hover:bg-surface-2',
        )}
      >
        {ctaLabel}
      </button>
    </div>
  );
};
