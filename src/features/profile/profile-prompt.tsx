import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { inClubContext } from '@/lib/club-context';
import { getMyProfile, updateMyProfile, ROLE_TAGS, type RoleTag } from '@/lib/profile-api';
import { cn } from '@/lib/cn';

/**
 * Prompt de completar perfil. Aparece UNA vez por sesión si el perfil no tiene
 * nombre cargado, para que dejemos de tener perfiles vacíos. Se puede posponer
 * ("Ahora no") — vuelve a aparecer en la próxima sesión hasta que se complete.
 *
 * No aparece: viendo datos de un club ajeno, ni si ya se completó el nombre.
 */
const SNOOZE_KEY = 'statzpro_profile_prompt_snoozed';

const inputCls = cn(
  'w-full h-10 px-3 rounded-md bg-surface-2 border border-border text-sm text-fg',
  'placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-primary/50',
);

export const ProfilePrompt = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clubName, setClubName] = useState('');
  const [roleTag, setRoleTag] = useState<RoleTag | ''>('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!user || inClubContext()) return;
    let snoozed = false;
    try { snoozed = sessionStorage.getItem(SNOOZE_KEY) === '1'; } catch { /* ignore */ }
    if (snoozed) return;

    let alive = true;
    getMyProfile()
      .then((p) => {
        if (!alive) return;
        // Ya tiene nombre → no molestamos.
        if (p?.first_name && p.first_name.trim()) return;
        setOpen(true);
      })
      .catch(() => { /* si falla la lectura, no bloqueamos la app */ });
    return () => { alive = false; };
  }, [user]);

  const snooze = () => {
    try { sessionStorage.setItem(SNOOZE_KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateMyProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        club_name: clubName,
        role_tag: roleTag || null,
      });
      try { sessionStorage.setItem(SNOOZE_KEY, '1'); } catch { /* ignore */ }
      setOpen(false);
    } catch {
      // Dejamos el modal abierto; el usuario puede reintentar o posponer.
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={snooze} title="👋 Contanos quién sos">
      <p className="text-xs text-muted-fg mb-4">
        Un minuto para completar tu perfil. Nos ayuda a conocerte y mejorar StatzPro para vos.
      </p>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
            placeholder="Nombre" className={inputCls} autoComplete="given-name" />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)}
            placeholder="Apellido" className={inputCls} autoComplete="family-name" />
        </div>

        <input value={clubName} onChange={(e) => setClubName(e.target.value)}
          placeholder="¿De qué club sos?" className={inputCls} autoComplete="organization" />

        <select value={roleTag} onChange={(e) => setRoleTag(e.target.value as RoleTag | '')} className={inputCls}>
          <option value="">¿Qué sos? (jugador, entrenador…)</option>
          {ROLE_TAGS.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>

        <input value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono (opcional)" className={inputCls} type="tel" autoComplete="tel" inputMode="tel" />
      </div>

      <div className="flex gap-2 mt-5">
        <Button variant="ghost" onClick={snooze} className="flex-1 border border-border">
          Ahora no
        </Button>
        <Button onClick={() => void save()} disabled={saving} className="flex-[2]">
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </Dialog>
  );
};
