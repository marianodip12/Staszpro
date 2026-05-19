import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';

const TUTORIAL_KEY = 'hp_tutorial_completed';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  route?: string;        // Navigate to this route when step activates
  highlight?: string;     // CSS selector to highlight (optional)
  position?: 'center' | 'bottom' | 'top';
}

const useTutorialSteps = (): TutorialStep[] => {
  return [
    {
      title: '¡Bienvenido a StatzPro! 🤾',
      description: 'Te vamos a mostrar cómo funciona la app en 6 pasos rápidos. Podés saltearlo cuando quieras.',
      icon: '👋',
      position: 'center',
    },
    {
      title: '1. Creá tu equipo',
      description: 'Empezá creando tu equipo con nombre, color y la lista de jugadores. Podés tener varios equipos.',
      icon: '👥',
      route: '/app/teams',
      position: 'center',
    },
    {
      title: '2. Registrá un partido en vivo',
      description: 'Tocá "En Vivo" para arrancar un partido. Elegí los equipos, y empezá a registrar jugadas en tiempo real.',
      icon: '📍',
      route: '/app/live',
      position: 'center',
    },
    {
      title: '3. Registrá cada tiro',
      description: 'Tocá la zona de la cancha de donde salió el tiro, después la zona del arco a donde fue. En 2 toques, evento registrado.',
      icon: '🎯',
      position: 'center',
    },
    {
      title: '4. Analizá el partido',
      description: 'Cuando termines, desde "Partidos" tocá "Análisis" para ver el mapa de calor, eficacia por zona y rendimiento de cada jugador.',
      icon: '📊',
      route: '/app',
      position: 'center',
    },
    {
      title: '5. Seguí la evolución',
      description: 'En "Stats" y "Evolución" vas a ver cómo rinde tu equipo a lo largo de la temporada. Comparativas, tendencias y más.',
      icon: '📈',
      route: '/app/stats',
      position: 'center',
    },
    {
      title: '¡Listo! Empezá ahora 🚀',
      description: 'Ya sabés lo esencial. Creá tu primer equipo y registrá tu primer partido. ¡Éxitos!',
      icon: '✅',
      route: '/app',
      position: 'center',
    },
  ];
};

export const useShouldShowTutorial = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_KEY);
    if (!done) setShow(true);
  }, []);
  return { show, setShow };
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
    localStorage.setItem(TUTORIAL_KEY, 'true');
    onClose();
    navigate('/app');
  };

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_KEY, 'true');
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
        <div className="p-6 md:p-8 text-center space-y-4">
          <div className="text-5xl mb-2">{current.icon}</div>
          <h2 className="text-xl md:text-2xl font-bold">{current.title}</h2>
          <p className="text-sm text-muted-fg leading-relaxed max-w-sm mx-auto">
            {current.description}
          </p>
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
