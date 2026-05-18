'use client';

/**
 * MatchForm — crear un nuevo partido.
 * Client Component: selección de equipos de la org, fecha, competencia.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Calendar, Trophy } from 'lucide-react';
import { useSupabase } from '@/lib/supabase';
import { useLiveMatchStore } from '@/stores/live-match.store';
import type { Team } from '@sportiq/core';

interface MatchFormProps {
  orgId:   string;
  orgSlug: string;
  teams:   Team[];
}

export function MatchForm({ orgId, orgSlug, teams }: MatchFormProps) {
  const supabase = useSupabase();
  const router   = useRouter();
  const { startSession } = useLiveMatchStore.getState();

  const [homeTeamId,   setHomeTeamId]   = useState(teams[0]?.id ?? '');
  const [awayTeamId,   setAwayTeamId]   = useState(teams[1]?.id ?? '');
  const [awayName,     setAwayName]     = useState('');    // manual if not in teams
  const [competition,  setCompetition]  = useState('');
  const [matchDate,    setMatchDate]    = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [mode,         setMode]         = useState<'select' | 'manual'>('select');

  const homeTeam = teams.find((t) => t.id === homeTeamId);
  const awayTeam = mode === 'select' ? teams.find((t) => t.id === awayTeamId) : null;

  const handleCreate = useCallback(async () => {
    if (!homeTeam) { setError('Seleccioná el equipo local.'); return; }
    if (mode === 'select' && !awayTeam) { setError('Seleccioná el equipo visitante.'); return; }
    if (mode === 'manual' && !awayName.trim()) { setError('Ingresá el nombre del rival.'); return; }
    if (homeTeamId === awayTeamId && mode === 'select') { setError('Local y visitante no pueden ser el mismo equipo.'); return; }

    setSaving(true); setError(null);

    const { data, error: err } = await supabase
      .from('matches')
      .insert({
        org_id:          orgId,
        home_team_id:    homeTeamId,
        away_team_id:    mode === 'select' ? awayTeamId : null,
        home_team_name:  homeTeam.name,
        away_team_name:  mode === 'select' ? (awayTeam?.name ?? '') : awayName.trim(),
        home_team_color: homeTeam.color,
        away_team_color: mode === 'select' ? (awayTeam?.color ?? '#EF4444') : '#EF4444',
        competition:     competition.trim() || null,
        match_date:      matchDate || null,
        status:          'idle',
      })
      .select('id')
      .single();

    setSaving(false);
    if (err) { setError(err.message); return; }

    // Initialize the live match store session
    startSession(data.id, orgId);

    // Navigate directly to the live recording page
    router.push(`/${orgSlug}/matches/${data.id}/live`);
  }, [
    orgId, orgSlug, homeTeam, awayTeam, awayName, homeTeamId, awayTeamId,
    competition, matchDate, mode, supabase, router, startSession,
  ]);

  return (
    <div className="max-w-lg mx-auto p-4 md:p-6 space-y-5 animate-fade-up">

      <div>
        <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
          Nuevo partido
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Configurá el partido y empezá a registrar eventos.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
             style={{ background: 'rgba(239,68,68,.08)', color: 'var(--red-400)', border: '1px solid rgba(239,68,68,.2)' }}>
          <X size={14} /> {error}
        </div>
      )}

      {/* Team selection */}
      <div className="card p-4 space-y-4">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Equipos</p>

        {/* Home team */}
        <div>
          <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>EQUIPO LOCAL</label>
          {teams.length > 0 ? (
            <select
              value={homeTeamId}
              onChange={(e) => setHomeTeamId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--navy-700)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' }}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No hay equipos. <a href={`/${orgSlug}/teams`} style={{ color: 'var(--blue-400)' }}>Creá uno primero.</a>
            </p>
          )}
        </div>

        {/* Away team toggle */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>EQUIPO VISITANTE</label>
            <div className="flex rounded overflow-hidden border" style={{ borderColor: 'var(--surface-border)' }}>
              {(['select', 'manual'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="px-2 py-0.5 text-xs transition-all"
                  style={{
                    background: mode === m ? 'var(--navy-600)' : 'var(--navy-800)',
                    color:      mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {m === 'select' ? 'De mis equipos' : 'Escribir nombre'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'select' && teams.length > 1 ? (
            <select
              value={awayTeamId}
              onChange={(e) => setAwayTeamId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--navy-700)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' }}
            >
              {teams.filter((t) => t.id !== homeTeamId).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : (
            <input
              value={awayName}
              onChange={(e) => setAwayName(e.target.value)}
              placeholder="Nombre del equipo rival"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--navy-700)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' }}
            />
          )}
        </div>

        {/* Preview */}
        {homeTeam && (
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--navy-800)' }}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-3 h-3 rounded-full" style={{ background: homeTeam.color }} />
              <span className="font-display font-bold text-base truncate" style={{ color: 'var(--text-primary)' }}>
                {homeTeam.name}
              </span>
            </div>
            <span className="font-mono font-bold text-lg" style={{ color: 'var(--text-muted)' }}>vs</span>
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="font-display font-bold text-base truncate" style={{ color: 'var(--text-primary)' }}>
                {mode === 'select' ? (awayTeam?.name ?? '—') : (awayName || '—')}
              </span>
              <div className="w-3 h-3 rounded-full"
                   style={{ background: mode === 'select' ? (awayTeam?.color ?? '#EF4444') : '#EF4444' }} />
            </div>
          </div>
        )}
      </div>

      {/* Optional metadata */}
      <div className="card p-4 space-y-3">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Información adicional (opcional)</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>
              <Trophy size={10} className="inline mr-1" />COMPETENCIA
            </label>
            <input
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              placeholder="Ej: Liga Provincial"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--navy-700)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' }}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-mono mb-1 block" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={10} className="inline mr-1" />FECHA
            </label>
            <input
              type="datetime-local"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--navy-700)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' }}
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleCreate}
        disabled={saving || !homeTeam}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all hover:brightness-110 disabled:opacity-50"
        style={{ background: 'var(--blue-600)', color: 'white' }}
      >
        {saving ? (
          <span className="animate-spin">⟳</span>
        ) : (
          <><Check size={16} /> Crear partido e iniciar</>
        )}
      </button>
    </div>
  );
}
