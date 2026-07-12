import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

const WA_NUMBER = '541126647764';
const WA_MSG = encodeURIComponent('Hola, me interesa el plan Elite de StatzPro. ¿Podemos charlar?');

type Cycle = 'monthly' | 'annual';

/**
 * Sección de precios para la landing.
 * Versión compacta con CTA hacia signup o /app/plans.
 */
export const PricingSection = () => {
  const { isAuthenticated } = useAuth();
  const [cycle, setCycle] = useState<Cycle>('annual');
  const [audience, setAudience] = useState<'coach' | 'player'>('coach');

  const isPlayer = audience === 'player';
  const ctaTo = isAuthenticated
    ? '/app/plans'
    : isPlayer
      ? '/signup?role=player'
      : '/signup';

  return (
    <section id="pricing" className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20 w-full">
      <div className="text-center mb-6 md:mb-8">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">
          Precios simples
        </p>
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
          Empezá gratis. Crece con vos.
        </h2>
        <p className="mt-3 text-sm md:text-base text-muted-fg max-w-2xl mx-auto leading-relaxed">
          {isPlayer
            ? '10 partidos gratis para probar tus stats personales. Pasate a Pro cuando quieras análisis ilimitado.'
            : '10 partidos gratis para probar la app. Pasate a Pro o Club cuando quieras más análisis.'}
        </p>
      </div>

      {/* Toggle Entrenador / Jugador */}
      <div className="flex justify-center mb-5">
        <div className="inline-flex bg-surface border border-border rounded-lg p-1">
          <button
            type="button"
            onClick={() => setAudience('coach')}
            className={cn(
              'px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
              !isPlayer ? 'bg-primary text-primary-fg' : 'text-muted-fg hover:text-fg',
            )}
          >
            <span>🎯</span>
            Entrenador
          </button>
          <button
            type="button"
            onClick={() => setAudience('player')}
            className={cn(
              'px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
              isPlayer ? 'bg-primary text-primary-fg' : 'text-muted-fg hover:text-fg',
            )}
          >
            <span>🤾</span>
            Jugador
          </button>
        </div>
      </div>

      {/* Toggle Mensual/Anual */}
      <div className="flex justify-center mb-6 md:mb-8">
        <div className="inline-flex bg-surface border border-border rounded-lg p-1">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={cn(
              'px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors',
              cycle === 'monthly' ? 'bg-primary text-primary-fg' : 'text-muted-fg hover:text-fg',
            )}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setCycle('annual')}
            className={cn(
              'px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors flex items-center gap-2',
              cycle === 'annual' ? 'bg-primary text-primary-fg' : 'text-muted-fg hover:text-fg',
            )}
          >
            Anual
            <span className="text-[9px] px-1.5 py-0.5 bg-green-500 text-white rounded font-bold">-25%</span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className={cn(
        'grid grid-cols-1 gap-3 md:gap-4',
        isPlayer ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-2 lg:grid-cols-4',
      )}>
        <PlanCard
          name="FREE"
          accent="#1D9E75"
          tagIcon="⚡"
          price="$0"
          priceSuffix="para siempre"
          tagline={isPlayer ? 'Probá con tus primeros partidos' : 'Probá la app con tu equipo'}
          features={isPlayer ? [
            'Modo Rápido completo',
            'Hasta 10 partidos personales',
            'Stats básicas',
            'Historial completo',
          ] : [
            'Modo Rápido completo',
            'Equipos ilimitados',
            'Hasta 10 partidos',
            'Stats por jugador',
            'Stats de arquero',
          ]}
          ctaLabel="Empezar gratis"
          ctaTo={ctaTo}
        />

        <PlanCard
          name="PRO"
          accent="#378ADD"
          tagIcon="📊"
          price={
            isPlayer
              ? (cycle === 'annual' ? '$27' : '$3')
              : (cycle === 'annual' ? '$45' : '$5')
          }
          priceSuffix={cycle === 'annual' ? '/año' : '/mes'}
          priceSubtext={
            isPlayer
              ? (cycle === 'annual' ? '≈ 3.220 ARS/mes' : '≈ 4.290 ARS/mes')
              : (cycle === 'annual' ? '≈ 5.360 ARS/mes' : '≈ 7.150 ARS/mes')
          }
          tagline="Modo Completo desbloqueado"
          features={isPlayer ? [
            'Todo lo de Free',
            'Partidos ilimitados',
            'Mapa de tiros + zonas',
            'Cuadrante del arco',
            'Análisis por período',
          ] : [
            'Todo lo de Free',
            'Partidos ilimitados',
            'Modo Completo',
            'Mapa de tiros + zonas',
            'Exportar PDF',
          ]}
          ctaLabel="Probar 7 días gratis"
          ctaTo={ctaTo}
          recommended
        />

        {/* CLUB y ELITE solo para entrenadores */}
        {!isPlayer && (
          <>
            <PlanCard
              name="CLUB"
              accent="#1D9E75"
              tagIcon="🎬"
              price={cycle === 'annual' ? '$144' : '$15'}
              priceSuffix={cycle === 'annual' ? '/año' : '/mes'}
              priceSubtext="3 usuarios incluidos"
              tagline="Video + IA + cuerpo técnico"
              features={[
                'Todo lo de Pro',
                '3 cuentas DT/staff',
                '🎬 Video sincronizado',
                '🤖 IA y compilador',
                'Soporte WhatsApp',
              ]}
              ctaLabel="Probar 14 días gratis"
              ctaTo={ctaTo}
              starred
            />

            <PlanCard
              name="ELITE"
              accent="#BA7517"
              tagIcon="🏆"
              price="A consultar"
              priceSuffix=""
              priceSubtext="según necesidades"
              tagline="Personalización total"
              features={[
                'Todo lo de Club',
                'Usuarios ilimitados',
                'Multi-equipo',
                'Features a pedido',
                'Soporte dedicado',
              ]}
              ctaLabel="Hablemos por WhatsApp"
              ctaHref={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
              isElite
            />
          </>
        )}
      </div>

      {/* Trust footer */}
      <div className="mt-6 text-center">
        <p className="text-[10px] tracking-widest text-muted-fg uppercase mb-2">
          Pago seguro · Cancelá cuando quieras · Sin permanencia
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {['Tarjeta', 'MercadoPago', 'Transferencia'].map((m) => (
            <span
              key={m}
              className="text-[10px] px-2.5 py-1 rounded-md border border-border bg-surface text-muted-fg"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

const PlanCard = ({
  name, accent, tagIcon,
  price, priceSuffix, priceSubtext,
  tagline, features,
  ctaLabel, ctaTo, ctaHref,
  recommended = false, starred = false, isElite = false,
}: {
  name: string;
  accent: string;
  tagIcon: string;
  price: string;
  priceSuffix: string;
  priceSubtext?: string;
  tagline: string;
  features: string[];
  ctaLabel: string;
  ctaTo?: string;
  ctaHref?: string;
  recommended?: boolean;
  starred?: boolean;
  isElite?: boolean;
}) => {
  const ctaClasses = cn(
    'w-full px-3 py-2 rounded-md text-xs font-medium transition-colors text-center block',
    recommended && 'bg-primary text-primary-fg hover:bg-primary/90',
    starred && 'bg-green-600 text-white hover:bg-green-700',
    isElite && 'border border-amber-600 text-amber-400 hover:bg-amber-600/10',
    !recommended && !starred && !isElite && 'border border-border text-fg hover:bg-surface-2',
  );

  return (
    <div
      className={cn(
        'rounded-2xl bg-surface p-4 md:p-5 flex flex-col relative',
        recommended ? 'border-2' : starred ? 'border-2' : 'border',
      )}
      style={{
        borderColor: recommended || starred || isElite ? accent : undefined,
      }}
    >
      {recommended && (
        <span
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2.5 py-0.5 rounded-md font-semibold whitespace-nowrap text-white"
          style={{ background: accent }}
        >
          RECOMENDADO
        </span>
      )}
      {starred && (
        <span
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2.5 py-0.5 rounded-md font-semibold whitespace-nowrap text-white"
          style={{ background: accent }}
        >
          ⭐ MÁS VALOR
        </span>
      )}
      {isElite && (
        <span
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2.5 py-0.5 rounded-md font-semibold whitespace-nowrap text-white"
          style={{ background: accent }}
        >
          A MEDIDA
        </span>
      )}

      <div className="flex items-center gap-2 mb-2">
        <p className="text-[11px] tracking-widest font-bold text-muted-fg">{name}</p>
        <span
          className="text-base"
          style={{ color: accent }}
        >
          {tagIcon}
        </span>
      </div>

      <div className="mb-1">
        <span className={cn('font-bold', isElite ? 'text-base' : 'text-2xl md:text-3xl')}>
          {price}
        </span>
        {priceSuffix && (
          <span className="text-xs text-muted-fg ml-1">{priceSuffix}</span>
        )}
      </div>
      <p className="text-[10px] text-muted-fg mb-3 min-h-[14px]">{priceSubtext || ''}</p>

      <p
        className="text-[11px] font-semibold mb-3 leading-snug"
        style={{ color: accent }}
      >
        {tagline}
      </p>

      <ul className="space-y-1 text-xs flex-1 mb-4">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-1.5 text-fg/90 leading-relaxed">
            <span style={{ color: accent }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {ctaHref ? (
        <a href={ctaHref} target="_blank" rel="noopener noreferrer" className={ctaClasses}>
          {ctaLabel}
        </a>
      ) : (
        <Link to={ctaTo!} className={ctaClasses}>
          {ctaLabel}
        </Link>
      )}
    </div>
  );
};
