/**
 * LiveMatchFree — Modo FREE de carga en vivo.
 * Botones grandes + picker jugador opcional, sin arco/cancha.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { computeScore } from '@/domain/events';
import { EMPTY_DRAFT, buildEvent, rosterKindFor, splitRoster } from '@/domain/live';
import { eventChangesPossession, otherTeam } from '@/domain/recommendations';
import type { EventType, HandballEvent, PersonRef, Team } from '@/domain/types';
import { useMatchStore } from '@/lib/store';
import { softDeleteEventRemote, discardLiveMatchRemote } from '@/lib/sync';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Scoreboard } from './scoreboard';
import { PlayerPicker, type PickerKind } from './player-picker';
import { LiveStats } from './live-stats';
import { PlayerStatsList } from './player-stats-list';
import { EventTimeline } from './event-timeline';
import { EventEditDialog } from './event-edit-dialog';

const adhocPlayersFor = (events: HandballEvent[], team: Team): PersonRef[] => {
  const m = new Map<number, PersonRef>();
  for (const e of events) {
    if (e.team !== team) continue;
    for (const r of [e.shooter, e.sanctioned]) if (r) m.set(r.number, r);
  }
  return Array.from(m.values()).sort((a, b) => a.number - b.number);
};

const adhocGKFor = (events: HandballEvent[], attackingTeam: Team): PersonRef[] => {
  const m = new Map<number, PersonRef>();
  for (const e of events) {
    if (e.team !== attackingTeam || !e.goalkeeper) continue;
    m.set(e.goalkeeper.number, e.goalkeeper);
  }
  return Array.from(m.values()).sort((a, b) => a.number - b.number);
};

type ShotType = 'goal' | 'saved' | 'miss' | 'post';

type PendingStep =
  | { kind: 'shot_shooter'; shotType: ShotType; team: Team; is7m: boolean }
  | { kind: 'shot_gk'; shotType: ShotType; team: Team; is7m: boolean; shooter: PersonRef | null }
  | { kind: 'tagged'; type: Exclude<EventType, 'timeout' | 'half_time'>; team: Team };

const SHOT_BTNS = [
  { type: 'goal'  as ShotType, label: 'GOL',     cls: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30' },
  { type: 'saved' as ShotType, label: 'ATAJADA',  cls: 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30' },
  { type: 'miss'  as ShotType, label: 'ERRADO',   cls: 'bg-surface-2 border-border text-muted-fg hover:text-fg hover:bg-surface' },
  { type: 'post'  as ShotType, label: 'PALO',     cls: 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20' },
] as const;

export interface LiveMatchFreeProps {
  /** When provided, renders a Completo/Rápido toggle (used inside the Pro page). */
  modeSwitch?: {
    mode: 'quick' | 'full';
    onChange: (m: 'quick' | 'full') => void;
    fullLabel: string;
    quickLabel: string;
  };
}

export const LiveMatchFree = ({ modeSwitch }: LiveMatchFreeProps = {}) => {
  const t           = useT();
  const navigate    = useNavigate();
  const status        = useMatchStore((s) => s.status);
  const match         = useMatchStore((s) => s.liveMatch);
  const events        = useMatchStore((s) => s.liveEvents);
  const clock         = useMatchStore((s) => s.liveClock);
  const setClock      = useMatchStore((s) => s.setLiveClock);
  const addEvent      = useMatchStore((s) => s.addLiveEvent);
  const updateEvent   = useMatchStore((s) => s.updateLiveEvent);
  const removeEventRaw = useMatchStore((s) => s.removeLiveEvent);
  const removeEvent = (id: string) => {
    removeEventRaw(id);
    void softDeleteEventRemote(id);
  };
  const finishLive    = useMatchStore((s) => s.finishLive);
  const closeLive     = useMatchStore((s) => s.closeLive);
  const teams         = useMatchStore((s) => s.teams);
  const autoSwitch    = useMatchStore((s) => s.autoSwitchAttacker);
  const setAutoSwitch = useMatchStore((s) => s.setAutoSwitchAttacker);

  const [attacker, setAttacker] = useState<Team>('home');
  const [pending, setPending]   = useState<PendingStep | null>(null);
  const [editing, setEditing]   = useState<HandballEvent | null>(null);

  const score = computeScore(events);

  const maybeSwitch = (type: EventType, team: Team) => {
    if (autoSwitch && eventChangesPossession(type)) setAttacker(otherTeam(team));
  };

  const commitShot = (shotType: ShotType, team: Team, is7m: boolean, shooter: PersonRef | null, goalkeeper: PersonRef | null) => {
    addEvent(buildEvent({
      type: shotType,
      draft: { ...EMPTY_DRAFT, team, shooter, goalkeeper, courtZone: is7m ? '7m' : null },
      clock,
      quickMode: true,
    }));
    maybeSwitch(shotType, team);
  };

  const commitTagged = (type: Exclude<EventType, 'timeout' | 'half_time'>, team: Team, person: PersonRef | null) => {
    const kind = rosterKindFor(type);
    addEvent(buildEvent({
      type,
      draft: { ...EMPTY_DRAFT, team, shooter: kind === 'possession' ? person : null },
      clock,
      quickMode: true,
      sanctioned: kind === 'sanctioned' ? person : null,
    }));
    maybeSwitch(type, team);
  };

  const commitInstant = (type: EventType, team: Team) => {
    addEvent(buildEvent({ type, draft: { ...EMPTY_DRAFT, team }, clock, quickMode: true }));
    maybeSwitch(type, team);
  };

  const handleShot = (shotType: ShotType, is7m = false) =>
    setPending({ kind: 'shot_shooter', shotType, team: attacker, is7m });

  const handleNonShot = (type: Exclude<EventType, 'timeout' | 'half_time'>) => {
    if (rosterKindFor(type) === 'none') commitInstant(type, attacker);
    else setPending({ kind: 'tagged', type, team: attacker });
  };

  const handlePick = (person: PersonRef | null) => {
    if (!pending) return;
    if (pending.kind === 'shot_shooter') {
      const { shotType, team, is7m } = pending;
      const needsGK = shotType === 'goal' || shotType === 'saved';
      if (needsGK) setPending({ kind: 'shot_gk', shotType, team, is7m, shooter: person });
      else { commitShot(shotType, team, is7m, person, null); setPending(null); }
      return;
    }
    if (pending.kind === 'shot_gk') {
      const { shotType, team, is7m, shooter } = pending;
      commitShot(shotType, team, is7m, shooter, person);
      setPending(null);
      return;
    }
    if (pending.kind === 'tagged') {
      commitTagged(pending.type, pending.team, person);
      setPending(null);
    }
  };

  const pickerCtx = useMemo(() => {
    if (!pending) return null;
    if (pending.kind === 'shot_shooter') {
      const { team } = pending;
      const name  = team === 'home' ? match.home : match.away;
      const color = team === 'home' ? match.homeColor : match.awayColor;
      const teamObj = teams.find((t) => t.name === name);
      const { fieldPlayers } = splitRoster(teamObj?.players ?? []);
      return { kind: 'shooter' as PickerKind, teamId: teamObj?.id ?? null, players: fieldPlayers, adhoc: adhocPlayersFor(events, team), color, name };
    }
    if (pending.kind === 'shot_gk') {
      const gkTeam: Team = pending.team === 'home' ? 'away' : 'home';
      const name  = gkTeam === 'home' ? match.home : match.away;
      const color = gkTeam === 'home' ? match.homeColor : match.awayColor;
      const teamObj = teams.find((t) => t.name === name);
      const { goalkeepers } = splitRoster(teamObj?.players ?? []);
      return { kind: 'goalkeeper' as PickerKind, teamId: teamObj?.id ?? null, players: goalkeepers, adhoc: adhocGKFor(events, pending.team), color, name };
    }
    if (pending.kind === 'tagged') {
      const { type, team } = pending;
      const name  = team === 'home' ? match.home : match.away;
      const color = team === 'home' ? match.homeColor : match.awayColor;
      const kind: PickerKind = rosterKindFor(type) === 'sanctioned' ? 'sanctioned' : 'shooter';
      const teamObj = teams.find((t) => t.name === name);
      return { kind, teamId: teamObj?.id ?? null, players: teamObj?.players ?? [], adhoc: adhocPlayersFor(events, team), color, name };
    }
    return null;
  }, [pending, match, teams, events]);

  const handleFinish = () => {
    if (window.confirm(t.live_finish_confirm)) { finishLive(); navigate('/app'); }
  };
  const handleDiscard = () => {
    if (window.confirm(t.live_discard_confirm)) { void discardLiveMatchRemote(); closeLive(); navigate('/app'); }
  };

  if (status !== 'live' || !match.home) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">En vivo</h1>
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted-fg mb-3">No hay ningún partido en curso.</p>
          <Button onClick={() => navigate('/app')}>Ir a Partidos</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      <Scoreboard
        home={match.home} away={match.away}
        homeColor={match.homeColor} awayColor={match.awayColor}
        homeScore={score.h} awayScore={score.a}
        clock={clock} onClockChange={setClock}
      />

      {/* Mode switch — only shown when embedded in the Pro page */}
      {modeSwitch && (
        <div className="rounded-lg border border-border bg-surface p-1 flex">
          {(['full', 'quick'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => modeSwitch.onChange(m)}
              className={cn(
                'flex-1 h-8 text-xs font-medium rounded-md transition-colors',
                modeSwitch.mode === m ? 'bg-primary/20 text-primary' : 'text-muted-fg hover:text-fg',
              )}
            >
              {m === 'full' ? modeSwitch.fullLabel : modeSwitch.quickLabel}
            </button>
          ))}
        </div>
      )}

      {/* Equipo atacante */}
      <div className="rounded-lg border border-border bg-surface p-1 flex gap-1">
        {(['home', 'away'] as const).map((side) => {
          const active = attacker === side;
          const label  = side === 'home' ? match.home : match.away;
          const color  = side === 'home' ? match.homeColor : match.awayColor;
          return (
            <button key={side} type="button" onClick={() => setAttacker(side)}
              className={cn('flex-1 h-9 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 truncate px-2',
                active ? 'bg-primary/15 border border-primary/40 text-primary' : 'text-muted-fg hover:text-fg')}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => setAutoSwitch(!autoSwitch)}
          className={cn('h-7 px-3 rounded-lg border text-[10px] font-medium transition-colors flex items-center gap-1.5',
            autoSwitch ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-surface text-muted-fg')}>
          ⇄ Auto: {autoSwitch ? 'ON' : 'OFF'}
        </button>
      </div>

      <LiveStats events={events} home={match.home} away={match.away}
        homeColor={match.homeColor} awayColor={match.awayColor} focus={attacker} />

      {/* TIRO */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">Tiro</p>
        <div className="grid grid-cols-2 gap-2">
          {SHOT_BTNS.map(({ type, label, cls }) => (
            <button key={type} type="button" onClick={() => handleShot(type)}
              className={cn('h-16 rounded-xl border text-base font-bold tracking-wide transition-all duration-fast active:scale-[0.97]', cls)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => handleShot('goal', true)}
          className="w-full h-11 rounded-xl border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 active:scale-[0.98] text-sm font-bold transition-all duration-fast">
          7M
        </button>
      </section>

      {/* SANCIONES */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">Sanciones</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { type: 'exclusion'   as const, label: '2 MIN',     cls: 'border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' },
            { type: 'yellow_card' as const, label: '🟨 AMARILLA', cls: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' },
            { type: 'red_card'    as const, label: '🟥 ROJA',    cls: 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20' },
          ].map(({ type, label, cls }) => (
            <button key={type} type="button" onClick={() => handleNonShot(type)}
              className={cn('h-14 rounded-xl border text-xs font-bold transition-all duration-fast active:scale-[0.97]', cls)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => handleNonShot('blue_card')}
          className="w-full h-10 rounded-xl border border-blue-400/30 bg-blue-400/5 text-blue-400 hover:bg-blue-400/15 active:scale-[0.98] text-xs font-bold transition-all duration-fast">
          🟦 AZUL
        </button>
      </section>

      {/* OTROS */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">Otros</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '🔄 Pérdida', fn: () => handleNonShot('turnover') },
            { label: '✋ T.M.',    fn: () => commitInstant('timeout', attacker) },
            { label: '⏸ Descanso', fn: () => commitInstant('half_time', attacker) },
          ].map(({ label, fn }) => (
            <button key={label} type="button" onClick={fn}
              className="h-12 rounded-xl border border-border bg-surface-2 text-fg hover:bg-surface active:scale-[0.97] text-xs font-medium transition-all duration-fast">
              {label}
            </button>
          ))}
        </div>
      </section>

      <PlayerStatsList
        events={events}
        team={attacker}
        teamName={attacker === 'home' ? match.home : match.away}
        teamColor={attacker === 'home' ? match.homeColor : match.awayColor}
      />

      <EventTimeline events={events} homeColor={match.homeColor} awayColor={match.awayColor}
        onDelete={removeEvent} onEdit={(ev) => setEditing(ev)} />

      <div className="flex gap-2 pt-1">
        <Button variant="danger" size="sm" onClick={handleDiscard} className="flex-1">{t.live_discard}</Button>
        <Button onClick={handleFinish} className="flex-[2]">{t.live_finish}</Button>
      </div>

      <EventEditDialog open={!!editing} onClose={() => setEditing(null)} event={editing}
        homeName={match.home} awayName={match.away}
        onSave={(patch) => { if (!editing) return; updateEvent(editing.id, patch); setEditing(null); }}
        onDelete={() => { if (!editing) return; removeEvent(editing.id); setEditing(null); }} />

      {pickerCtx && (
        <PlayerPicker open onClose={() => setPending(null)} onPick={handlePick}
          players={pickerCtx.players} teamId={pickerCtx.teamId} adhocPlayers={pickerCtx.adhoc}
          teamColor={pickerCtx.color} teamName={pickerCtx.name}
          kind={pickerCtx.kind} allowSkip />
      )}
    </div>
  );
};
