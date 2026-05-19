import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MatchSummary } from '@/domain/types';
import { loadSharedMatch } from '@/lib/share';
import { MatchAnalysisPage } from '@/features/match-analysis/match-analysis-page';

/**
 * Página pública para ver un partido compartido por link.
 * Reutiliza el MatchAnalysisPage completo en modo readonly:
 * - Misma UI, mismos filtros (período, equipo, cuadrante, etc.)
 * - Sin botones de editar/compartir/volver
 * - No requiere login ni plan
 */
export const SharePage = () => {
  const { token } = useParams<{ token: string }>();
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No hay token en la URL');
      setLoading(false);
      return;
    }
    loadSharedMatch(token)
      .then((data) => {
        if (!data) setError('No se encontró el partido o el link expiró.');
        else setMatch(data.match);
      })
      .catch(() => setError('Error al cargar el partido.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="animate-pulse text-muted-fg">Cargando partido…</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <div className="text-2xl">😕</div>
            <p className="text-sm text-muted-fg">{error ?? 'Partido no encontrado.'}</p>
            <Link to="/" className="inline-block text-sm text-primary hover:underline">
              Ir a StatzPro
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Header con branding StatzPro */}
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/statzpro-favicon.svg" alt="StatzPro" className="w-7 h-7 rounded-md" />
            <span className="text-sm font-semibold">StatzPro</span>
          </Link>
          <div className="flex items-center gap-2">
            <Badge tone="primary">📊 Análisis compartido</Badge>
          </div>
        </div>
      </header>

      {/* Análisis completo en modo readonly */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <MatchAnalysisPage externalMatch={match} readonly />
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 pb-8">
        <Card>
          <CardContent className="p-4 text-center text-xs text-muted-fg">
            Análisis generado con{' '}
            <Link to="/" className="text-primary hover:underline">StatzPro</Link>
            {' · '}
            <Link to="/signup" className="text-primary hover:underline">
              Crear mi cuenta gratis
            </Link>
          </CardContent>
        </Card>
      </footer>
    </div>
  );
};
