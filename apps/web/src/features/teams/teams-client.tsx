'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Users, ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import { useSupabase } from '@/lib/supabase-provider';
import type { Team, Player, PlayerPosition } from '@sportiq/core';

const POSITIONS: Array<{ id: PlayerPosition; label: string }> = [
  { id: 'goalkeeper',  label: 'Arquero'         },
  { id: 'left_wing',   label: 'Extremo Izq.'    },
  { id: 'right_wing',  label: 'Extremo Der.'    },
  { id: 'left_back',   label: 'Lateral Izq.'    },
  { id: 'right_back',  label: 'Lateral Der.'    },
  { id: 'center_back', label: 'Central'         },
  { id: 'pivot',       label: 'Pivote'          },
  { id: 'other',       label: 'Otro'            },
];

const TEAM_COLORS = [
  '#3B82F6','#EF4444','#22C55E','#F59E0B','#8B5CF6',
  '#EC4899','#14B8A6','#F97316','#6366F1','#84CC16',
];

interface TeamsClientProps {
  orgId:   string;
  orgSlug: string;
  teams:   Team[];
  players: Player[];
}

export function TeamsClient({ orgId, orgSlug, teams: initTeams, players: initPlayers }: TeamsClientProps) {
  const supabase = useSupabase();
  const router   = useRouter();

  const [teams,         setTeams]         = useState<Team[]>(initTeams);
  const [players,       setPlayers]       = useState<Player[]>(initPlayers);
  const [expandedTeam,  setExpandedTeam]  = useState<string | null>(teams[0]?.id ?? null);
  const [showNewTeam,   setShowNewTeam]   = useState(false);
  const [showNewPlayer, setShowNewPlayer] = useState<string | null>(null);   // team id
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // ── Team CRUD ──────────────────────────────────────────────────────────────

  const createTeam = useCallback(async (name: string, color: string) => {
    setSaving(true); setError(null);
    const { data, error: err } = await supabase
      .from('teams')
      .insert({ org_id: orgId, name, color })
      .select('*').single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    setTeams((t) => [...t, data as Team]);
    setShowNewTeam(false);
    setExpandedTeam(data.id);
  }, [orgId, supabase]);

  const deleteTeam = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar equipo y todos sus jugadores?')) return;
    const { error: err } = await supabase.from('teams').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    setTeams((t) => t.filter((x) => x.id !== id));
    setPlayers((p) => p.filter((x) => x.team_id !== id));
  }, [supabase]);

  // ── Player CRUD ────────────────────────────────────────────────────────────

  const createPlayer = useCallback(async (
    teamId: string, name: string, number: number, position: PlayerPosition | null,
  ) => {
    setSaving(true); setError(null);
    const { data, error: err } = await supabase
      .from('players')
      .insert({ org_id: orgId, team_id: teamId, name, number, position })
      .select('*').single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    setPlayers((p) => [...p, data as Player]);
    setShowNewPlayer(null);
  }, [orgId, supabase]);

  const updatePlayer = useCallback(async (
    id: string, updates: Partial<Pick<Player, 'name' | 'number' | 'position'>>,
  ) => {
    setSaving(true); setError(null);
    const { error: err } = await supabase.from('players').update(updates).eq('id', id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setPlayers((p) => p.map((x) => x.id === id ? { ...x, ...updates } : x));
    setEditingPlayer(null);
  }, [supabase]);

  const deletePlayer = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('players').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    setPlayers((p) => p.filter((x) => x.id !== id));
  }, [supabase]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Equipos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {teams.length} equipo{teams.length !== 1 ? 's' : ''} · {players.length} jugador{players.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowNewTeam(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
          style={{ background: 'var(--blue-600)', color: 'white' }}
        >
          <Plus size={15} /> Nuevo equipo
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
             style={{ background: 'rgba(239,68,68,.08)', color: 'var(--red-400)', border: '1px solid rgba(239,68,68,.2)' }}>
          <X size={14} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* New team form */}
      {showNewTeam && (
        <NewTeamForm
          onSave={createTeam}
          onCancel={() => setShowNewTeam(false)}
          saving={saving}
        />
      )}

      {/* Teams list */}
      {teams.length === 0 && !showNewTeam ? (
        <div className="card p-10 text-center">
          <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Todavía no hay equipos. Creá el primero.</p>
        </div>
      ) : (
        teams.map((team) => {
          const teamPlayers = players.filter((p) => p.team_id === team.id);
          const isOpen = expandedTeam === team.id;
          return (
            <div key={team.id} className="card overflow-hidden">
              {/* Team header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:brightness-105 transition-all"
                style={{ borderBottom: isOpen ? '1px solid var(--surface-border)' : 'none' }}
                onClick={() => setExpandedTeam(isOpen ? null : team.id)}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: team.color }} />
                <span className="font-display font-bold text-lg flex-1" style={{ color: 'var(--text-primary)' }}>
                  {team.name}
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {teamPlayers.length} jugador{teamPlayers.length !== 1 ? 'es' : ''}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTeam(team.id); }}
                  className="p-1.5 rounded transition-all hover:text-red-400"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={13} />
                </button>
                {isOpen ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                        : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
              </div>

              {/* Players list */}
              {isOpen && (
                <div>
                  {teamPlayers.length === 0 ? (
                    <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                      Sin jugadores. Añadí el primero.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                          {['#', 'Nombre', 'Posición', ''].map((h) => (
                            <th key={h} className="px-4 py-2 text-left text-xs font-mono"
                                style={{ color: 'var(--text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {teamPlayers
                          .sort((a, b) => a.number - b.number)
                          .map((p) => (
                            <PlayerRow
                              key={p.id}
                              player={p}
                              isEditing={editingPlayer === p.id}
                              onEdit={() => setEditingPlayer(p.id)}
                              onSave={(updates) => updatePlayer(p.id, updates)}
                              onCancel={() => setEditingPlayer(null)}
                              onDelete={() => deletePlayer(p.id)}
                              saving={saving}
                            />
                          ))}
                      </tbody>
                    </table>
                  )}

                  {/* New player form */}
                  {showNewPlayer === team.id ? (
                    <NewPlayerForm
                      onSave={(name, number, pos) => createPlayer(team.id, name, number, pos)}
                      onCancel={() => setShowNewPlayer(null)}
                      saving={saving}
                      existingNumbers={teamPlayers.map((p) => p.number)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowNewPlayer(team.id)}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-all hover:brightness-110"
                      style={{
                        color: 'var(--text-muted)', borderTop: '1px solid var(--surface-border)',
                        background: 'transparent',
                      }}
                    >
                      <Plus size={13} /> Añadir jugador
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── PlayerRow ────────────────────────────────────────────────────────────────

function PlayerRow({ player, isEditing, onEdit, onSave, onCancel, onDelete, saving }: {
  player: Player; isEditing: boolean;
  onEdit: () => void;
  onSave: (u: Partial<Pick<Player,'name'|'number'|'position'>>) => void;
  onCancel: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [name,   setName]   = useState(player.name);
  const [number, setNumber] = useState(String(player.number));
  const [pos,    setPos]    = useState<PlayerPosition | null>(player.position);

  if (isEditing) {
    return (
      <tr style={{ background: 'var(--navy-700)' }}>
        <td className="px-3 py-2">
          <input type="number" value={number} onChange={(e) => setNumber(e.target.value)}
                 className="w-14 px-2 py-1 rounded text-sm font-mono text-center"
                 style={{ background: 'var(--navy-600)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' }}
                 min={1} max={99} />
        </td>
        <td className="px-3 py-2">
          <input value={name} onChange={(e) => setName(e.target.value)}
                 className="w-full px-2 py-1 rounded text-sm"
                 style={{ background: 'var(--navy-600)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' }} />
        </td>
        <td className="px-3 py-2">
          <select value={pos ?? ''} onChange={(e) => setPos((e.target.value || null) as PlayerPosition | null)}
                  className="px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--navy-600)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}>
            <option value="">—</option>
            {POSITIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <button onClick={() => onSave({ name, number: parseInt(number), position: pos })}
                    disabled={saving}
                    className="p-1 rounded" style={{ color: 'var(--lime-400)' }}>
              <Check size={13} />
            </button>
            <button onClick={onCancel} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
              <X size={13} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b hover:brightness-105 transition-all group"
        style={{ borderColor: 'var(--surface-border)' }}>
      <td className="px-4 py-2 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
        {player.number}
      </td>
      <td className="px-4 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>
        {player.name}
      </td>
      <td className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        {POSITIONS.find((p) => p.id === player.position)?.label ?? '—'}
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 rounded hover:text-blue-400 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
            <Pencil size={12} />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:text-red-400 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── NewTeamForm ──────────────────────────────────────────────────────────────

function NewTeamForm({ onSave, onCancel, saving }: {
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name,  setName]  = useState('');
  const [color, setColor] = useState(TEAM_COLORS[0]!);
  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Nuevo equipo</p>
      <div className="flex gap-3">
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del equipo"
          className="flex-1 px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--navy-700)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' }}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onSave(name.trim(), color); }}
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Color:</span>
        {TEAM_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-all hover:scale-110"
                  style={{ background: c, outline: color === c ? `2px solid white` : 'none', outlineOffset: 2 }} />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => name.trim() && onSave(name.trim(), color)}
          disabled={!name.trim() || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--blue-600)', color: 'white' }}
        >
          <Check size={13} /> Crear equipo
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded text-sm"
                style={{ background: 'var(--navy-700)', color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── NewPlayerForm ────────────────────────────────────────────────────────────

function NewPlayerForm({ onSave, onCancel, saving, existingNumbers }: {
  onSave: (name: string, number: number, pos: PlayerPosition | null) => void;
  onCancel: () => void;
  saving: boolean;
  existingNumbers: number[];
}) {
  const [name,   setName]   = useState('');
  const [number, setNumber] = useState('');
  const [pos,    setPos]    = useState<PlayerPosition | null>(null);
  const numVal  = parseInt(number);
  const numTaken = existingNumbers.includes(numVal);
  const valid    = name.trim().length > 0 && numVal >= 1 && numVal <= 99 && !numTaken;

  return (
    <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid var(--surface-border)', background: 'var(--navy-800)' }}>
      <div className="flex gap-2">
        <input type="number" value={number} onChange={(e) => setNumber(e.target.value)}
               placeholder="N°" min={1} max={99}
               className="w-16 px-2 py-1.5 rounded text-sm font-mono text-center"
               style={{
                 background:  numTaken ? 'rgba(239,68,68,.1)' : 'var(--navy-700)',
                 color:       numTaken ? 'var(--red-400)' : 'var(--text-primary)',
                 border:      `1px solid ${numTaken ? 'rgba(239,68,68,.3)' : 'var(--surface-border)'}`,
               }}
               autoFocus />
        <input value={name} onChange={(e) => setName(e.target.value)}
               placeholder="Nombre del jugador"
               className="flex-1 px-2 py-1.5 rounded text-sm"
               style={{ background: 'var(--navy-700)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' }}
               onKeyDown={(e) => { if (e.key === 'Enter' && valid) onSave(name.trim(), numVal, pos); }} />
        <select value={pos ?? ''} onChange={(e) => setPos((e.target.value || null) as PlayerPosition | null)}
                className="px-2 py-1.5 rounded text-xs"
                style={{ background: 'var(--navy-700)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}>
          <option value="">Posición</option>
          {POSITIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <button onClick={() => valid && onSave(name.trim(), numVal, pos)}
                disabled={!valid || saving}
                className="px-3 py-1.5 rounded text-sm disabled:opacity-40 transition-all"
                style={{ background: 'var(--blue-600)', color: 'white' }}>
          <Check size={14} />
        </button>
        <button onClick={onCancel} className="px-2 py-1.5 rounded"
                style={{ color: 'var(--text-muted)' }}>
          <X size={14} />
        </button>
      </div>
      {numTaken && (
        <p className="text-xs" style={{ color: 'var(--red-400)' }}>El número {numVal} ya está en uso.</p>
      )}
    </div>
  );
}
