import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * /reset-password — destino del link de recuperación que manda Supabase.
 * El SDK detecta el token del hash de la URL automáticamente
 * (detectSessionInUrl) y deja una sesión de tipo recovery activa;
 * acá solo pedimos la contraseña nueva y llamamos updateUser.
 */
export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Esperar a que el SDK procese el token del hash
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
      setTimeout(() => navigate('/app'), 1800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col">
      <header className="px-4 md:px-6 h-14 flex items-center border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <img src="/statzpro-favicon.svg" alt="StatzPro" className="w-7 h-7 rounded-md" />
          <span className="text-sm font-semibold tracking-tight">StatzPro</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 md:p-8 space-y-5">
          <h1 className="text-2xl font-bold text-center">Nueva contraseña</h1>

          {!ready ? (
            <p className="text-sm text-muted-fg text-center py-4">Verificando el link…</p>
          ) : !hasSession ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-fg">
                El link expiró o no es válido. Pedí uno nuevo desde la pantalla de inicio de sesión.
              </p>
              <Link to="/login" className="inline-block text-sm text-primary hover:underline">
                ← Volver a iniciar sesión
              </Link>
            </div>
          ) : done ? (
            <p className="text-sm text-goal text-center py-4">
              ✅ Contraseña actualizada. Entrando a la app…
            </p>
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
        </div>
      </main>
    </div>
  );
};
