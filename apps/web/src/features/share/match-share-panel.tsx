'use client';

/**
 * MatchSharePanel — panel de compartir partido.
 * Embeddable en la página de análisis.
 * Genera/revoca share tokens y muestra el link copiable.
 */

import { useState } from 'react';
import { Share2, Copy, Check, X, Eye, EyeOff } from 'lucide-react';
import { useMatchActions } from '@/hooks/useMatchActions';

interface MatchSharePanelProps {
  matchId:        string;
  orgId:          string;
  orgSlug:        string;
  currentToken:   string | null;
  matchStatus:    string;
}

export function MatchSharePanel({
  matchId, orgId, orgSlug, currentToken, matchStatus,
}: MatchSharePanelProps) {
  const { closeMatch, generateShare, revokeShare, shareUrl, loading, error } =
    useMatchActions({ matchId, orgId, orgSlug });

  const [copied, setCopied] = useState(false);
  const [localToken, setLocalToken] = useState(currentToken);

  const displayUrl = shareUrl ?? (localToken
    ? `${process.env.NEXT_PUBLIC_APP_URL}/share/${localToken}`
    : null);

  const handleGenerate = async () => {
    const url = await generateShare();
    if (url) {
      // Extract token from URL
      const token = url.split('/share/')[1];
      if (token) setLocalToken(token);
    }
  };

  const handleRevoke = async () => {
    await revokeShare();
    setLocalToken(null);
  };

  const handleCopy = async () => {
    if (!displayUrl) return;
    await navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Share2 size={15} style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Compartir partido</p>
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--red-400)' }}>{error}</p>
      )}

      {!displayUrl ? (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Generá un link público para compartir el marcador y las estadísticas de este partido sin necesitar cuenta.
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'var(--blue-600)', color: 'white' }}
          >
            {loading ? <span className="animate-spin text-xs">⟳</span> : <Eye size={13} />}
            Generar link público
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-lg"
               style={{ background: 'var(--navy-700)', border: '1px solid var(--surface-border)' }}>
            <span className="text-xs font-mono truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
              {displayUrl}
            </span>
            <button onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs flex-shrink-0 transition-all"
                    style={{ color: copied ? 'var(--lime-400)' : 'var(--blue-400)' }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs transition-all hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
          >
            <EyeOff size={11} /> Revocar acceso público
          </button>
        </div>
      )}

      {/* Close match button — only if match is live or idle */}
      {(matchStatus === 'live' || matchStatus === 'half_time' || matchStatus === 'idle') && (
        <div className="pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
          <button
            onClick={closeMatch}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium w-full justify-center transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'var(--navy-700)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}
          >
            {loading ? <span className="animate-spin text-xs">⟳</span> : <Check size={13} />}
            Cerrar partido y generar analytics
          </button>
        </div>
      )}
    </div>
  );
}
