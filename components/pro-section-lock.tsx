import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHasPlanAccess } from './pro-gate';

/**
 * Wrap una sección que solo es visible para Pro+. Si el plan es Free,
 * muestra un overlay bloqueado en su lugar manteniendo el resto de la página accesible.
 *
 * Si `disabled=true`, siempre muestra el contenido (útil para vistas compartidas
 * donde se ve todo sin importar el plan del que mira).
 */
export const ProSectionLock = ({
  title,
  description,
  children,
  requires = 'pro',
  disabled = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  requires?: 'pro' | 'club';
  disabled?: boolean;
}) => {
  const hasAccess = useHasPlanAccess(requires);
  const navigate = useNavigate();

  if (disabled || hasAccess) return <>{children}</>;

  const planLabel = requires === 'club' ? 'Plan Club' : 'Plan Pro';
  const accent = requires === 'club' ? '#1D9E75' : '#378ADD';

  return (
    <section className="relative">
      {/* Versión "blurreada" del contenido detrás */}
      <div className="pointer-events-none select-none opacity-30 blur-sm">
        {children}
      </div>

      {/* Overlay con CTA */}
      <button
        type="button"
        onClick={() => navigate('/app/plans')}
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 rounded-xl border-2 border-dashed transition-all hover:scale-[1.01] cursor-pointer group"
        style={{
          background: 'rgba(11, 18, 32, 0.85)',
          borderColor: `${accent}60`,
        }}
      >
        <div className="text-3xl mb-2">🔒</div>
        <p
          className="text-[10px] tracking-[0.2em] uppercase font-bold mb-1.5"
          style={{ color: accent }}
        >
          {planLabel}
        </p>
        <h3 className="text-base md:text-lg font-bold mb-1.5 text-white">{title}</h3>
        <p className="text-xs text-muted-fg max-w-sm leading-relaxed mb-4">{description}</p>
        <span
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white transition-transform group-hover:translate-y-[-1px]"
          style={{ background: accent }}
        >
          Desbloquear con {planLabel} →
        </span>
      </button>
    </section>
  );
};
