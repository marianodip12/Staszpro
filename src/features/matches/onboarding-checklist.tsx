import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { DEMO_MATCH_ID } from '@/lib/seed';
import { cn } from '@/lib/cn';

const DISMISS_KEY = 'statzpro_onboarding_done';

/**
 * ✅ Checklist de primeros pasos.
 *
 * Guía al usuario nuevo por el camino que genera retención:
 *   1) Crear un equipo (con plantel propio)
 *   2) Cargar un partido
 *   3) Ver el análisis
 *
 * Los pasos se tachan solos según el estado real. Cuando los tres están
 * completos, el checklist desaparece (y se recuerda en localStorage para
 * no volver a molestar). El partido/equipo demo NO cuenta como "propio".
 */
export const OnboardingChecklist = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Marca de "ocultado" por usuario, no global del dispositivo: así una cuenta
  // nueva (p. ej. recién creada con Google) ve el checklist aunque en este
  // dispositivo otro usuario ya lo hubiera cerrado.
  const dismissKey = user?.id ? `${DISMISS_KEY}:${user.id}` : DISMISS_KEY;
  const teams = useMatchStore((s) => s.teams);
  const completed = useMatchStore((s) => s.completed);
  const [dismissed, setDismissed] = useState(false);

  // Equipo propio = uno con plantel que NO sea el demo precargado.
  // El seed crea "Mi Equipo" (id 'team-demo-1') y "Rival Ejemplo" — esos no
  // cuentan. El paso se completa cuando el usuario crea su equipo de verdad,
  // o cuando renombra el demo (señal de que lo hizo propio).
  const hasOwnTeam = useMemo(
    () =>
      teams.some(
        (t) =>
          t.players.length > 0 &&
          t.id !== 'team-demo-1' &&
          t.id !== 'team-demo-2' &&
          t.name !== 'Mi Equipo' &&
          t.name !== 'Rival Ejemplo',
      ),
    [teams],
  );

  // Partido propio = completado que no sea el demo.
  const ownMatches = useMemo(
    () => completed.filter((m) => m.id !== DEMO_MATCH_ID),
    [completed],
  );
  const hasOwnMatch = ownMatches.length > 0;
  // "Vio análisis" lo aproximamos a tener al menos un partido propio cargado
  // (el análisis es el paso natural siguiente y queremos empujarlo).
  const hasMatch = hasOwnMatch;

  const alreadyDone = typeof localStorage !== 'undefined' &&
    localStorage.getItem(dismissKey) === '1';

  const steps = [
    {
      done: hasOwnTeam,
      title: 'Creá tu equipo',
      desc: 'Cargá tu plantel: nombre, número y posición de cada jugador.',
      cta: 'Ir a Equipos',
      action: () => navigate('/app/teams'),
    },
    {
      done: hasMatch,
      title: 'Cargá un partido',
      desc: 'Registrá un partido en vivo, o probá con el de ejemplo.',
      cta: 'Empezar partido',
      action: () => navigate('/app/live'),
    },
    {
      done: hasMatch,
      title: 'Mirá tu análisis',
      desc: 'Estadísticas, mapa de tiros y eficacia por jugador y zona.',
      cta: 'Ver análisis',
      action: () => {
        const m = ownMatches[0];
        if (m) navigate(`/app/analysis/${m.id}`);
        else navigate('/app');
      },
    },
  ];

  const allDone = steps.every((s) => s.done);

  // No mostrar si ya completó todo (ahora o antes), o si lo ocultó.
  if (allDone || alreadyDone || dismissed) {
    // Marcamos como hecho la primera vez que se completa.
    if (allDone && !alreadyDone && typeof localStorage !== 'undefined') {
      localStorage.setItem(dismissKey, '1');
    }
    return null;
  }

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className={cn('rounded-xl border border-primary/30 bg-primary/5 p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">🚀 Primeros pasos</h3>
          <p className="text-[11px] text-muted-fg mt-0.5">
            {doneCount} de {steps.length} · empezá a sacarle jugo a StatzPro
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (typeof localStorage !== 'undefined') localStorage.setItem(dismissKey, '1');
            setDismissed(true);
          }}
          className="text-[11px] text-muted-fg hover:text-fg"
        >
          Ocultar
        </button>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
              step.done
                ? 'border-goal/30 bg-goal/5'
                : 'border-border bg-surface',
            )}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                step.done
                  ? 'bg-goal text-white'
                  : 'border-2 border-border text-muted-fg',
              )}
            >
              {step.done ? '✓' : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-xs font-medium', step.done ? 'text-muted-fg line-through' : 'text-fg')}>
                {step.title}
              </p>
              {!step.done && (
                <p className="text-[11px] text-muted-fg mt-0.5">{step.desc}</p>
              )}
            </div>
            {!step.done && (
              <button
                type="button"
                onClick={step.action}
                className="text-[11px] font-medium text-primary hover:underline flex-shrink-0"
              >
                {step.cta} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
