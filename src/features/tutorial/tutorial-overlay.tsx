import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMatchStore } from '@/lib/store';
import { DEMO_MATCH_ID } from '@/lib/seed';
import { isSupabaseReady, supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

const TUTORIAL_KEY = 'hp_tutorial_completed';

interface TutorialStep {
  title: string;
  description: string;
  tip?: string;          // tip secundario en letra chica
  icon: string;
  route?: string;        // navega a esta ruta al activarse el paso
  position?: 'center' | 'bottom' | 'top';
}

const useTutorialSteps = (): TutorialStep[] => {
  const completed = useMatchStore((s) => s.completed);
  const hasDemo = completed.some((m) => m.id === DEMO_MATCH_ID);

  return useMemo(() => {
    const steps: TutorialStep[] = [
      {
        title: '¡Bienvenido a StatzPro! 🤾',
        description:
          'La app para registrar y analizar partidos de handball en tiempo real. Te mostramos todo en un par de minutos — y te dejamos un partido de ejemplo cargado para que toques sin miedo.',
        tip: 'Podés salir cuando quieras y volver a ver este tutorial desde el menú (❓ Tutorial).',
        icon: '👋',
        position: 'center',
      },
      {
        title: 'Tus equipos',
        description:
          'Acá creás y administrás tus equipos: nombre, color y plantel con número, nombre y posición de cada jugador. Ya te dejamos "Mi Equipo" armado con un plantel de ejemplo que podés editar o borrar.',
        tip: 'Las posiciones importan: el análisis agrupa el rendimiento por puesto y recomienda tiradores según la zona.',
        icon: '👥',
        route: '/app/teams',
        position: 'center',
      },
      {
        title: 'El partido en vivo',
        description:
          'Desde "En Vivo" arrancás un partido: elegís los dos equipos, la competencia, y empezás a registrar. Hay dos formas de cargar: Modo Rápido (un toque por evento, ideal si estás solo en la tribuna) y Modo Completo (zona de tiro + sector del arco + jugador).',
        tip: 'Podés alternar entre los dos modos durante el mismo partido.',
        icon: '📍',
        route: '/app/live',
        position: 'center',
      },
      {
        title: 'Registrar un tiro completo',
        description:
          'En Modo Completo cada tiro son 3 toques: 1) la zona de la cancha desde donde se tiró, 2) el sector del arco a donde fue, 3) quién lo tiró. Si el jugador no está en el plantel, lo agregás ahí mismo con número, nombre y posición — queda guardado para siempre.',
        tip: 'También registrás atajadas, palos, errados, pérdidas, exclusiones de 2\u2032, tarjetas y timeouts.',
        icon: '🎯',
        position: 'center',
      },
      {
        title: 'El reloj y los tiempos',
        description:
          'El cronómetro corre con el partido: pausalo en los timeouts, marcá el entretiempo y la app separa todo entre primer y segundo tiempo automáticamente. Cada evento queda con su minuto exacto.',
        icon: '⏱️',
        position: 'center',
      },
      {
        title: 'Tu partido de ejemplo 📊',
        description: hasDemo
          ? 'Esto que ves es el análisis de un partido demo que te dejamos cargado: Mi Equipo 26–22 Rival Ejemplo. Mapa de calor de tiros, eficacia por zona, sectores del arco, rendimiento por jugador y línea de tiempo. Tocá y explorá — es tuyo, no rompés nada.'
          : 'Cuando termina un partido, desde "Partidos" entrás a su Análisis: mapa de calor de tiros, eficacia por zona, sectores del arco, rendimiento por jugador y línea de tiempo.',
        tip: 'Filtrá por equipo, por tiempo (1°/2°) o por situación numérica con los controles de arriba.',
        icon: '📊',
        route: hasDemo ? `/app/analysis/${DEMO_MATCH_ID}` : '/app',
        position: 'center',
      },
      {
        title: 'Análisis con IA ✨',
        description:
          'Arriba de cada análisis tenés el botón de Análisis IA: lee todos los eventos del partido y te devuelve una lectura táctica de entrenador — fortalezas, debilidades, recomendaciones para el próximo entrenamiento y jugadores destacados, con números.',
        tip: 'Probalo con el partido demo cuando termines el tutorial.',
        icon: '✨',
        position: 'center',
      },
      {
        title: 'Stats y Evolución',
        description:
          'En "Stats" tenés los acumulados de la temporada: goleadores, eficacia global, arqueros. En "Evolución" ves las tendencias partido a partido para detectar rachas y caídas de rendimiento.',
        icon: '📈',
        route: '/app/stats',
        position: 'center',
      },
      {
        title: 'Video y compartir',
        description:
          'Cada partido tiene una sección de Video para analizar grabaciones y recortar clips de jugadas. Y con el botón Compartir generás un link público del análisis para mandarle al cuerpo técnico o a los jugadores.',
        icon: '🎬',
        position: 'center',
      },
      {
        title: 'Beta: todo desbloqueado 🚀',
        description:
          'Estás en la beta de StatzPro: todas las funciones pagas están desbloqueadas. Si la app te sirve, podés apoyar el proyecto con el botón ☕ Apoyar del banner — todo lo recaudado va al mantenimiento de servidores. Y cualquier problema, lo reportás desde Soporte.',
        tip: 'Este tutorial queda siempre disponible en el menú: ❓ Tutorial.',
        icon: '🚀',
        route: '/app',
        position: 'center',
      },
    ];
    return steps;
  }, [hasDemo]);
};

/**
 * El tutorial se muestra solo automáticamente la PRIMERA vez que el usuario
 * entra a la plataforma. La marca de "ya lo vio" vive en dos lados:
 *  - localStorage (respuesta instantánea, y única fuente para anónimos)
 *  - user_plans.tutorial_done en Supabase (sobrevive upgrades de versión,
 *    cambios de dispositivo y limpiezas de cache)
 * Después solo se abre de forma optativa desde el menú (❓ Tutorial).
 */
export const useShouldShowTutorial = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        if (localStorage.getItem(TUTORIAL_KEY)) return; // ya visto en este dispositivo
      } catch { return; }

      // Chequear server-side antes de mostrar (evita re-mostrar tras un wipe)
      if (isSupabaseReady()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data } = await supabase.rpc('get_tutorial_done');
            if (data === true) {
              try { localStorage.setItem(TUTORIAL_KEY, 'true'); } catch { /* noop */ }
              return;
            }
          }
        } catch { /* si falla el server, caemos al comportamiento local */ }
      }

      if (!cancelled) setShow(true);
    };

    void check();
    return () => { cancelled = true; };
  }, []);

  return { show, setShow };
};

/** Marca el tutorial como visto en localStorage + Supabase. */
const markTutorialDone = () => {
  try { localStorage.setItem(TUTORIAL_KEY, 'true'); } catch { /* noop */ }
  if (isSupabaseReady()) {
    void supabase.rpc('set_tutorial_done').then(
      () => {},
      () => {},
    );
  }
};

export const TutorialOverlay = ({ onClose }: { onClose: () => void }) => {
  const steps = useTutorialSteps();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  const progress = ((step + 1) / steps.length) * 100;

  const goToStep = useCallback(
    (newStep: number) => {
      setAnimating(true);
      setTimeout(() => {
        setStep(newStep);
        const s = steps[newStep];
        if (s.route && location.pathname !== s.route) {
          navigate(s.route);
        }
        setAnimating(false);
      }, 200);
    },
    [navigate, location.pathname, steps],
  );

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      goToStep(step + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) goToStep(step - 1);
  };

  const handleFinish = () => {
    markTutorialDone();
    onClose();
    navigate('/app');
  };

  const handleSkip = () => {
    markTutorialDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Card */}
      <div
        className={cn(
          'relative z-10 w-[90vw] max-w-md mx-4 rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden transition-opacity duration-200',
          animating ? 'opacity-0' : 'opacity-100',
        )}
      >
        {/* Progress bar */}
        <div className="h-1 bg-surface-2">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 text-center space-y-3">
          <div className="text-5xl mb-2">{current.icon}</div>
          <h2 className="text-xl md:text-2xl font-bold">{current.title}</h2>
          <p className="text-sm text-muted-fg leading-relaxed max-w-sm mx-auto">
            {current.description}
          </p>
          {current.tip && (
            <p className="text-[11px] text-muted-fg/80 leading-snug max-w-sm mx-auto border border-border bg-surface-2/60 rounded-md px-3 py-2">
              💡 {current.tip}
            </p>
          )}
        </div>

        {/* Step indicator dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToStep(i)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                i === step ? 'bg-primary w-6' : i < step ? 'bg-primary/40' : 'bg-border',
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="border-t border-border p-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-fg hover:text-fg transition-colors px-3 py-2"
          >
            Saltar tutorial
          </button>

          <div className="flex gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-md border border-border bg-surface-2 text-sm font-medium hover:bg-surface transition-colors"
              >
                ← Atrás
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-md bg-primary text-primary-fg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {isLast ? '¡Empezar!' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
