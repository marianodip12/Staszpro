import { useState } from 'react';
import { ProfileType } from '@/lib/personal-profile-api';
import { useSetProfileType } from '@/lib/use-profile-type';

interface Props {
  onDone: (type: ProfileType) => void;
}

export function RoleSelectorDialog({ onDone }: Props) {
  const [selected, setSelected] = useState<ProfileType | null>(null);
  const setType = useSetProfileType();

  async function handleConfirm() {
    if (!selected) return;
    try {
      await setType.mutateAsync(selected);
      onDone(selected);
    } catch (e) {
      console.error('set_my_profile_type failed', e);
      alert('No pudimos guardar tu elección. Intentá de nuevo.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <h2 className="mb-2 text-2xl font-bold">¿Cómo usás StatzPro?</h2>
        <p className="mb-6 text-sm text-neutral-500">
          Elegí tu rol. Esto define qué ves en la app.
        </p>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setSelected('coach')}
            className={`rounded-xl border-2 p-4 text-left transition ${
              selected === 'coach'
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'
            }`}
          >
            <div className="text-lg font-semibold">Soy DT / entrenador</div>
            <div className="text-sm text-neutral-500">
              Registro equipos, planteles, tácticas y estadísticas de mis partidos.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelected('player')}
            className={`rounded-xl border-2 p-4 text-left transition ${
              selected === 'player'
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'
            }`}
          >
            <div className="text-lg font-semibold">Soy jugador</div>
            <div className="text-sm text-neutral-500">
              Registro mis propias estadísticas partido a partido.
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selected || setType.isPending}
          className="mt-6 w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {setType.isPending ? 'Guardando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}
