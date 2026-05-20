import { Link } from 'react-router-dom';

/**
 * Showcase visual de Modo Rápido vs Modo Completo.
 * Pensado para la landing — explica la diferencia entre Free y Pro.
 */
export const ModesShowcase = () => {
  return (
    <section id="modes" className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20 w-full">
      <div className="text-center mb-10 md:mb-12">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">
          Dos formas de usar la app
        </p>
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
          Modo Rápido o Modo Completo
        </h2>
        <p className="mt-3 text-sm md:text-base text-muted-fg max-w-2xl mx-auto leading-relaxed">
          Elegí el que necesites. El Modo Rápido es gratis para siempre. El Completo lo desbloqueás con el plan Pro y te da análisis profundo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Modo Rápido */}
        <ModeColumn
          variant="rapido"
          title="Modo Rápido"
          tag="FREE"
          accent="#1D9E75"
          icon="⚡"
          tagline="Registrá todo lo que pasa en 2 toques"
          description="Pensado para anotar el partido sin perder ninguna jugada. Botones grandes, sin distracciones."
          features={[
            'Goles y asistencias',
            'Atajadas y errores',
            'Lanzamientos al palo',
            '7 metros',
            'Faltas (2 minutos)',
            'Tarjetas amarilla, roja, azul',
            'Cambios y sustituciones',
            'Score y minuto en vivo',
          ]}
        />

        {/* Modo Completo */}
        <ModeColumn
          variant="completo"
          title="Modo Completo"
          tag="DESDE PRO"
          accent="#378ADD"
          icon="📊"
          tagline="Profundizá cuando lo necesites"
          description="Mismo Modo Rápido + análisis avanzado. Vení mañana al entreno con datos concretos sobre dónde y cómo se ganó o perdió el partido."
          features={[
            'Todo lo del Modo Rápido',
            'Mapa de tiros por zona',
            'Eficacia por jugador',
            'Heatmap de la cancha',
            'Comparativa entre partidos',
            'Tendencias por temporada',
            'Stats de arquero (zona del tiro)',
            'Exportar PDF + compartir',
          ]}
          highlight
        />
      </div>

      {/* Mini explainer */}
      <div className="mt-6 rounded-xl border border-border bg-surface/50 p-4 md:p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="text-2xl">💡</div>
        <div className="flex-1 text-sm">
          <p className="font-semibold mb-1">¿Tenés Pro y querés solo lo básico?</p>
          <p className="text-muted-fg leading-relaxed">
            En el plan Pro podés elegir registrar partidos en Modo Rápido o Modo Completo. El Modo Rápido sigue disponible para los días en que solo querés anotar y listo.
          </p>
        </div>
        <Link
          to="/app/plans"
          className="text-xs px-4 py-2 rounded-md bg-primary text-primary-fg hover:bg-primary/90 transition-colors font-semibold whitespace-nowrap"
        >
          Ver planes →
        </Link>
      </div>
    </section>
  );
};

const ModeColumn = ({
  variant,
  title,
  tag,
  accent,
  icon,
  tagline,
  description,
  features,
  highlight = false,
}: {
  variant: 'rapido' | 'completo';
  title: string;
  tag: string;
  accent: string;
  icon: string;
  tagline: string;
  description: string;
  features: string[];
  highlight?: boolean;
}) => {
  return (
    <div
      className="rounded-2xl border bg-surface p-5 md:p-6 flex flex-col"
      style={{
        borderColor: highlight ? accent : undefined,
        borderWidth: highlight ? '1.5px' : '0.5px',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl grid place-items-center text-xl"
          style={{ background: accent }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg md:text-xl font-bold">{title}</h3>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded tracking-wider"
              style={{ background: accent, color: '#fff' }}
            >
              {tag}
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-fg mt-0.5">{tagline}</p>
        </div>
      </div>

      <p className="text-sm text-muted-fg leading-relaxed mb-4">{description}</p>

      {/* Mini visual mockup */}
      <div className="rounded-lg border border-border bg-bg/40 p-3 mb-4 min-h-[120px]">
        {variant === 'rapido' ? <RapidoMockup accent={accent} /> : <CompletoMockup accent={accent} />}
      </div>

      {/* Features */}
      <ul className="space-y-1.5 text-sm">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 text-xs" style={{ color: accent }}>✓</span>
            <span className="text-fg/90 leading-snug">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Mockup del Modo Rápido — botones de eventos como en el live real
const RapidoMockup = ({ accent }: { accent: string }) => (
  <div className="space-y-2">
    {/* Fila 1: GOL / ATAJADA */}
    <div className="grid grid-cols-2 gap-2">
      <div
        className="h-9 rounded-md grid place-items-center text-[11px] font-bold tracking-wider text-white"
        style={{ background: accent }}
      >
        ⚽ GOL
      </div>
      <div className="h-9 rounded-md grid place-items-center text-[11px] font-bold tracking-wider text-white" style={{ background: '#378ADD' }}>
        🧤 ATAJADA
      </div>
    </div>
    {/* Fila 2: ERRADO / PALO */}
    <div className="grid grid-cols-2 gap-2">
      <div className="h-9 rounded-md grid place-items-center text-[11px] font-bold tracking-wider border" style={{ background: 'transparent', borderColor: '#3F3F46', color: '#A1A1AA' }}>
        ✕ ERRADO
      </div>
      <div className="h-9 rounded-md grid place-items-center text-[11px] font-bold tracking-wider border" style={{ background: 'transparent', borderColor: '#BA7517', color: '#FAC775' }}>
        ▮ PALO
      </div>
    </div>
    {/* Fila 3: 7m / 2 min / TM */}
    <div className="grid grid-cols-3 gap-2">
      <div className="h-7 rounded-md grid place-items-center text-[10px] font-bold tracking-wider text-white" style={{ background: '#7C3AED' }}>
        7M
      </div>
      <div className="h-7 rounded-md grid place-items-center text-[10px] font-bold tracking-wider text-white" style={{ background: '#DC2626' }}>
        2 MIN
      </div>
      <div className="h-7 rounded-md grid place-items-center text-[10px] font-bold tracking-wider border" style={{ background: 'transparent', borderColor: '#3F3F46', color: '#A1A1AA' }}>
        T.M.
      </div>
    </div>
    {/* Fila 4: tarjetas */}
    <div className="grid grid-cols-3 gap-2">
      <div className="h-6 rounded grid place-items-center text-[9px] font-bold text-white" style={{ background: '#EAB308' }}>
        AMARILLA
      </div>
      <div className="h-6 rounded grid place-items-center text-[9px] font-bold text-white" style={{ background: '#3B82F6' }}>
        AZUL
      </div>
      <div className="h-6 rounded grid place-items-center text-[9px] font-bold text-white" style={{ background: '#DC2626' }}>
        ROJA
      </div>
    </div>
  </div>
);

// Mockup del Modo Completo — cuadrante 3x3 del arco + cancha con zona
const CompletoMockup = ({ accent }: { accent: string }) => (
  <div className="space-y-2">
    {/* Cuadrante 3x3 del arco */}
    <div>
      <p className="text-[9px] text-muted-fg uppercase tracking-widest mb-1">¿A qué cuadrante fue?</p>
      <div className="relative h-[68px] rounded grid grid-cols-3 grid-rows-3 gap-px p-px overflow-hidden border-2" style={{ borderColor: '#DC2626', borderStyle: 'dashed' }}>
        {[
          { arrow: '↖', filled: false }, { arrow: '↑', filled: false }, { arrow: '↗', filled: true },
          { arrow: '←', filled: false }, { arrow: '·', filled: false }, { arrow: '→', filled: false },
          { arrow: '↙', filled: false }, { arrow: '↓', filled: false }, { arrow: '↘', filled: false },
        ].map((c, i) => (
          <div
            key={i}
            className="grid place-items-center text-[11px] font-semibold"
            style={{
              background: c.filled ? `${accent}40` : 'rgba(255,255,255,0.02)',
              color: c.filled ? accent : '#71717A',
            }}
          >
            {c.arrow}
          </div>
        ))}
      </div>
    </div>

    {/* Mini cancha con zonas marcadas */}
    <div>
      <p className="text-[9px] text-muted-fg uppercase tracking-widest mb-1">¿Desde dónde tiró?</p>
      <div className="relative h-[44px] rounded bg-gradient-to-b from-blue-950/40 to-blue-900/20 border border-blue-700/30 overflow-hidden">
        {/* Curva de área */}
        <div className="absolute inset-x-0 top-0 h-[80%] border-b border-dashed border-white/20" style={{
          borderRadius: '0 0 50% 50%',
          background: 'transparent',
        }} />
        {/* 7m mark */}
        <div className="absolute left-1/2 top-[35%] -translate-x-1/2 px-1.5 py-0.5 text-[8px] rounded bg-bg/80 border border-white/20 text-white/80">
          7m
        </div>
        {/* Zona destacada (lateral der.) */}
        <div className="absolute right-[18%] bottom-0 w-[22%] h-[60%]" style={{ background: `${accent}50`, border: `1px solid ${accent}` }} />
      </div>
    </div>
  </div>
);
