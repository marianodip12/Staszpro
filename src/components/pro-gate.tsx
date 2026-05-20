import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasCompleteMode, hasVideoAndAI, usePlan, type Plan } from '@/lib/use-plan';

interface ProGateProps {
  /** Contenido a mostrar si el usuario tiene el plan requerido */
  children: ReactNode;
  /**
   * Plan mínimo requerido.
   * - 'pro': Pro, Club o Elite (Modo Completo)
   * - 'club': Club o Elite (Video + IA)
   */
  requires?: 'pro' | 'club';
  /** Título del banner de upgrade */
  title?: string;
  /** Descripción del banner */
  description?: string;
  /** Lista de features que se desbloquean */
  features?: string[];
}

/**
 * Bloquea el contenido detrás de una pantalla de upgrade si el usuario no tiene el plan necesario.
 * El admin (is_admin=true) bypasea siempre.
 */
export const ProGate = ({
  children,
  requires = 'pro',
  title,
  description,
  features,
}: ProGateProps) => {
  const navigate = useNavigate();
  const { plan, loading, betaActive } = usePlan();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-fg">
        Cargando…
      </div>
    );
  }

  // El plan determina el acceso. El admin que se setea como Free ve como Free.
  // Durante la beta, betaActive desbloquea todo.
  const hasAccess = requires === 'club'
    ? hasVideoAndAI({ plan, betaActive })
    : hasCompleteMode({ plan, betaActive });
  if (hasAccess) return <>{children}</>;

  const cfg = requires === 'club' ? CLUB_CONFIG : PRO_CONFIG;

  return (
    <div className="max-w-2xl mx-auto py-8 md:py-12 px-4">
      <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-surface to-surface p-6 md:p-8 text-center">
        <div className="text-5xl mb-3">{cfg.icon}</div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-bold mb-2">
          {cfg.eyebrow}
        </p>
        <h2 className="text-xl md:text-2xl font-bold mb-2">{title ?? cfg.defaultTitle}</h2>
        <p className="text-sm text-muted-fg max-w-md mx-auto mb-6 leading-relaxed">
          {description ?? cfg.defaultDescription}
        </p>

        {/* Features */}
        <div className="text-left bg-bg/50 rounded-xl border border-border p-4 md:p-5 max-w-md mx-auto mb-6">
          <p className="text-[11px] uppercase tracking-widest text-muted-fg font-semibold mb-3">
            Lo que desbloqueás:
          </p>
          <ul className="space-y-2 text-sm">
            {(features ?? cfg.defaultFeatures).map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span className="text-fg/90 leading-snug">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-md mx-auto">
          <button
            type="button"
            onClick={() => navigate('/app/plans')}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-fg hover:bg-primary/90 transition-colors font-semibold text-sm shadow-lg shadow-primary/20"
          >
            {cfg.ctaPrimary} →
          </button>
          <button
            type="button"
            onClick={() => navigate('/app')}
            className="px-5 py-2.5 rounded-lg border border-border bg-surface hover:bg-surface-2 transition-colors font-medium text-sm text-muted-fg hover:text-fg"
          >
            Volver
          </button>
        </div>

        {/* Plan actual */}
        <p className="mt-5 text-[11px] text-muted-fg">
          Plan actual: <span className="font-semibold uppercase">{plan}</span>
        </p>
      </div>
    </div>
  );
};

const PRO_CONFIG = {
  icon: '📊',
  eyebrow: 'Modo Completo · desde Pro',
  defaultTitle: 'Desbloqueá el Modo Completo',
  defaultDescription:
    'Pasate al plan Pro para acceder al análisis profundo de cada partido: mapa de tiros, eficacia por zona, comparativas y mucho más.',
  defaultFeatures: [
    'Mapa de tiros por zona de la cancha',
    'Eficacia y stats por jugador',
    'Análisis del arquero por zona',
    'Comparativas entre partidos',
    'Tendencias por temporada',
    'Exportar análisis en PDF',
    'Compartir partidos con tu equipo',
    'Partidos ilimitados (Free tiene 10)',
  ],
  ctaPrimary: 'Ver planes y precios',
};

const CLUB_CONFIG = {
  icon: '🎬',
  eyebrow: 'Video + IA · desde Club',
  defaultTitle: 'Activá Video + IA con el plan Club',
  defaultDescription:
    'El plan Club agrega análisis de video sincronizado con eventos, compilador automático de jugadas e integración con YouTube.',
  defaultFeatures: [
    'Video sincronizado con eventos del partido',
    'Compilador automático de highlights',
    'Sube los videos al canal de YouTube del club',
    'Análisis con inteligencia artificial',
    '3 cuentas para DT y asistentes',
    'Branding del club en los reportes',
    'Soporte prioritario por WhatsApp',
  ],
  ctaPrimary: 'Conocer plan Club',
};

/**
 * Versión inline (más chica) para bloquear secciones dentro de una página
 * en vez de la página entera.
 */
export const ProGateInline = ({
  requires = 'pro',
  feature,
}: {
  requires?: 'pro' | 'club';
  feature: string;
}) => {
  const navigate = useNavigate();
  const label = requires === 'club' ? 'Plan Club' : 'Plan Pro';
  const accent = requires === 'club' ? 'text-green-400' : 'text-blue-400';
  const icon = requires === 'club' ? '🎬' : '📊';

  return (
    <button
      type="button"
      onClick={() => navigate('/app/plans')}
      className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-surface/50 hover:bg-surface p-4 text-left transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5">
            {feature} <span className={`text-xs ${accent}`}>· {label}</span>
          </p>
          <p className="text-xs text-muted-fg">
            Desbloqueá esta feature pasándote al {label}
          </p>
        </div>
        <span className="text-xs text-primary group-hover:translate-x-0.5 transition-transform">→</span>
      </div>
    </button>
  );
};

/**
 * Hook helper para chequear acceso programáticamente sin renderizar UI.
 */
export const useHasPlanAccess = (requires: 'pro' | 'club' = 'pro'): boolean => {
  const { plan, betaActive } = usePlan();
  return requires === 'club'
    ? hasVideoAndAI({ plan, betaActive })
    : hasCompleteMode({ plan, betaActive });
};

// Re-export for convenience
export type { Plan };
