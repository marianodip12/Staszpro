import { useState, type FormEvent } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Cambio de contraseña desde adentro de la app (cuenta logueada). */
export const ChangePasswordDialog = ({ open, onClose }: ChangePasswordDialogProps) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Mínimo 6 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) { setError(err.message); return; }
      setDone(true);
      setTimeout(() => { setDone(false); setPassword(''); setConfirm(''); onClose(); }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="🔒 Cambiar contraseña">
      {done ? (
        <p className="text-sm text-goal text-center py-4">✅ Contraseña actualizada.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-fg mb-1.5">Nueva contraseña</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md bg-bg border border-border text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-fg mb-1.5">Repetir contraseña</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md bg-bg border border-border text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-fg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      )}
    </Dialog>
  );
};
