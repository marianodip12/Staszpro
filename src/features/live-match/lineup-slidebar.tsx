import { useMemo, useState } from 'react';
import { useMatchStore, selectHomeTeam } from '@/lib/store';
import type { Player } from '@/domain/types';
import { cn } from '@/lib/cn';
import {
  formatRemaining,
  getActiveExclusions,
  indexByNumber,
  type ActiveExclusion,
} from '@/domain/exclusions';

/**
 * 🧩 Slidebar de formación (En Vivo) — v2.
 *
 * Sobre v1 (v1 = 3 sectores + tap-select + max 6/7), v2 suma:
 *   • 🟨 Exclusiones activas derivadas de eventos + reloj de juego:
 *       - 2min: contador ⏱ m:ss basado en el clock del partido (pausa cuando pausa el clock).
 *       - Roja: chip fijo 🟥, no vuelve más en ese partido.
 *       - Los excluidos NO aparecen como suplentes disponibles.
 *       - Al expirar una 2min, el jugador reaparece automáticamente en el banco.
 *   • ✋ Drag & drop entre sectores (solo desktop — HTML5 drag no soporta touch).
 *       Coexiste con tap-select (v1) para que sirva en mobile también.
 *
 * Reglas cubiertas:
 *   1. Máx en cancha: 6 con arquero, 7 con arco vacío (validación en el store).
 *   2. Auto-sacar del lineup al cargar 2min o roja de mi equipo (en el store).
 *   3. Auto-vuelta al banco cuando expira la 2min (por re-render en tick del clock).
 *
 * NO cubierto (posible v3):
 *   • Precisión al segundo del timer (los eventos guardan `min` entero → error ≤ 59s).
 *   • Drag & drop en mobile (requeriría @dnd-kit u otra lib).
 *   • Suprimir exclusión (si el usuario editó/borró el evento, se recalcula automático,
 *     pero no hay UI para "amnistiar" a un jugador aparte del edit del evento).
 */

const MAX_FIELD_WITH_GK = 6;
const MAX_FIELD_NO_GK = 7;
const maxFieldFor = (gkNum: number | null) => (gkNum == null ? MAX_FIELD_NO_GK : MAX_FIELD_WITH_GK);

type Sector = 'arco' | 'campo' | 'banco';

interface DragPayload {
  num: number;
  from: Sector;
}

export const LineupSlidebar = ({ className }: { className?: string }) => {
  const myTeam = useMatchStore(selectHomeTeam);
  const lineup = useMatchStore((s) => s.liveLineup);
  const events = useMatchStore((s) => s.liveEvents);
  const clock = useMatchStore((s) => s.liveClock);
  const swapFieldPlayer = useMatchStore((s) => s.swapFieldPlayer);
  const setGoalkeeper = useMatchStore((s) => s.setGoalkeeper);
  const setLiveLineup = useMatchStore((s) => s.setLiveLineup);

  const [selectedField, setSelectedField] = useState<number | null>(null);
  const [benchPage, setBenchPage] = useState(0);
  const [dragOverSector, setDragOverSector] = useState<Sector | null>(null);
  const [draggedNum, setDraggedNum] = useState<number | null>(null);

  const players = myTeam?.players ?? [];
  const byNumber = useMemo(() => {
    const m = new Map<number, Player>();
    for (const p of players) m.set(p.number, p);
    return m;
  }, [players]);

  const nameOf = (num: number) => byNumber.get(num)?.name ?? `#${num}`;

  const fieldNums = lineup.field;
  const gkNum = lineup.goalkeeper;
  const maxField = maxFieldFor(gkNum);
  const isFieldFull = fieldNums.length >= maxField;

  // 🟨 Exclusiones activas derivadas de events + clock
  const activeExclusions = useMemo(
    () => getActiveExclusions(events, 'home', clock),
    [events, clock],
  );
  const exclusionByNum = useMemo(() => indexByNumber(activeExclusions), [activeExclusions]);
  const isExcluded = (num: number) => exclusionByNum.has(num);

  // Banco = plantel que no está en campo, no es arquero, y no está excluido
  const benchPlayers = useMemo(
    () =>
      players
        .filter((p) => !fieldNums.includes(p.number) && p.number !== gkNum && !isExcluded(p.number))
        .sort((a, b) => a.number - b.number),
    [players, fieldNums, gkNum, exclusionByNum], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const goalkeeperCandidates = useMemo(
    () => benchPlayers.filter((p) => /arq|gk|portero|golero/i.test(p.position)),
    [benchPlayers],
  );

  // Paginación banco
  const BENCH_PER_PAGE = 4;
  const totalBenchPages = Math.max(1, Math.ceil(benchPlayers.length / BENCH_PER_PAGE));
  const clampedPage = Math.min(benchPage, totalBenchPages - 1);
  const benchNeedsPaging = benchPlayers.length > BENCH_PER_PAGE;
  const benchVisible = benchNeedsPaging
    ? benchPlayers.slice(clampedPage * BENCH_PER_PAGE, clampedPage * BENCH_PER_PAGE + BENCH_PER_PAGE)
    : benchPlayers;

  // ─── Handlers TAP ──────────────────────────────────────────────
  const handleBenchClick = (num: number) => {
    if (isExcluded(num)) return; // no debería llegar acá pero por si acaso
    const p = byNumber.get(num);
    // Si el suplente es arquero y el arco está vacío → arquero directo
    if (p && gkNum == null && /arq|gk|portero|golero/i.test(p.position) && selectedField == null) {
      setGoalkeeper(num);
      return;
    }
    if (selectedField != null) {
      swapFieldPlayer(selectedField, num);
      setSelectedField(null);
      return;
    }
    if (isFieldFull) return;
    swapFieldPlayer(null, num);
  };

  const handleFieldClick = (num: number) => {
    if (selectedField === num) {
      setLiveLineup({
        field: fieldNums.filter((n) => n !== num),
        goalkeeper: gkNum,
      });
      setSelectedField(null);
    } else {
      setSelectedField(num);
    }
  };

  const handleClearGoalkeeper = () => setGoalkeeper(null);

  // ─── Handlers DRAG & DROP ──────────────────────────────────────
  const handleDragStart = (payload: DragPayload) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNum(payload.num);
  };
  const handleDragEnd = () => {
    setDraggedNum(null);
    setDragOverSector(null);
  };
  const allowDrop = (sector: Sector) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSector !== sector) setDragOverSector(sector);
  };
  const handleDrop = (sector: Sector) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSector(null);
    setDraggedNum(null);
    let payload: DragPayload | null = null;
    try {
      payload = JSON.parse(e.dataTransfer.getData('application/json')) as DragPayload;
    } catch {
      return;
    }
    if (!payload) return;
    if (isExcluded(payload.num)) return;
    const { num, from } = payload;
    if (from === sector) return; // sin cambio

    if (sector === 'arco') {
      // Si venía del campo, sacar del campo antes de poner de arquero
      // (setGoalkeeper del store ya limpia el field si num estaba ahí)
      setGoalkeeper(num);
      return;
    }
    if (sector === 'campo') {
      if (from === 'arco') {
        // Sacar de arquero y meter al campo
        setGoalkeeper(null);
        swapFieldPlayer(null, num);
        return;
      }
      // from = banco → agregar respetando max
      if (isFieldFull) return;
      swapFieldPlayer(null, num);
      return;
    }
    if (sector === 'banco') {
      if (from === 'arco') {
        setGoalkeeper(null);
        return;
      }
      // from = campo → sacar
      setLiveLineup({
        field: fieldNums.filter((n) => n !== num),
        goalkeeper: gkNum,
      });
    }
  };

  if (!myTeam) {
    return (
      <div className={cn('rounded-lg border border-dashed border-border bg-surface p-3', className)}>
        <p className="text-[10px] text-muted-fg text-center leading-tight">
          Elegí tu equipo para gestionar la formación.
        </p>
      </div>
    );
  }

  const highlightArco = dragOverSector === 'arco';
  const highlightCampo = dragOverSector === 'campo';
  const highlightBanco = dragOverSector === 'banco';

  return (
    <div className={cn('flex flex-col gap-1.5 h-full', className)}>
      {/* ── ARCO ──────────────────────────────────────────────── */}
      <div
        onDragOver={allowDrop('arco')}
        onDragLeave={() => setDragOverSector((s) => (s === 'arco' ? null : s))}
        onDrop={handleDrop('arco')}
      >
        <SectorFrame label="ARCO" tone="info" highlight={highlightArco}>
          {gkNum != null ? (
            <PlayerChip
              number={gkNum}
              name={nameOf(gkNum)}
              tone="info"
              onClick={handleClearGoalkeeper}
              onDragStart={handleDragStart({ num: gkNum, from: 'arco' })}
              onDragEnd={handleDragEnd}
              title="Tocar para sacar / arrastrar a otro sector"
            />
          ) : (
            <div className="px-1 py-2 text-center">
              <div className="text-base leading-none text-warning">⊘</div>
              <div className="text-[8px] text-muted-fg mt-1 leading-tight">Sin arquero</div>
            </div>
          )}
          {gkNum == null && goalkeeperCandidates.length > 0 && (
            <div className="border-t border-border">
              {goalkeeperCandidates.slice(0, 2).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setGoalkeeper(p.number)}
                  className="w-full py-1 text-center hover:bg-surface-2 transition-colors opacity-80 border-b border-border last:border-b-0"
                  title="Poner de arquero"
                >
                  <div className="text-sm font-semibold leading-none text-info">{p.number}</div>
                  <div className="text-[8px] text-muted-fg mt-0.5 truncate px-0.5">{p.name}</div>
                </button>
              ))}
            </div>
          )}
        </SectorFrame>
      </div>

      {/* ── CAMPO ─────────────────────────────────────────────── */}
      <div
        onDragOver={allowDrop('campo')}
        onDragLeave={() => setDragOverSector((s) => (s === 'campo' ? null : s))}
        onDrop={handleDrop('campo')}
      >
        <SectorFrame label="CAMPO" tone="success" count={`${fieldNums.length}/${maxField}`} highlight={highlightCampo}>
          {fieldNums.length === 0 ? (
            <p className="text-[9px] text-muted-fg text-center py-2 px-1 leading-tight">
              Tocá suplentes o arrastralos acá
            </p>
          ) : (
            fieldNums.map((num) => (
              <PlayerChip
                key={num}
                number={num}
                name={nameOf(num)}
                tone="success"
                selected={selectedField === num}
                onClick={() => handleFieldClick(num)}
                onDragStart={handleDragStart({ num, from: 'campo' })}
                onDragEnd={handleDragEnd}
              />
            ))
          )}
          {isFieldFull && (
            <div className="text-[8px] text-warning text-center px-1 py-1 border-t border-border leading-tight">
              Cancha llena
            </div>
          )}
        </SectorFrame>
      </div>

      {/* ── BANCO ─────────────────────────────────────────────── */}
      <div
        onDragOver={allowDrop('banco')}
        onDragLeave={() => setDragOverSector((s) => (s === 'banco' ? null : s))}
        onDrop={handleDrop('banco')}
        className="flex-1 min-h-0"
      >
        <SectorFrame label="BANCO" tone="muted" grow highlight={highlightBanco}>
          {benchNeedsPaging && (
            <button
              type="button"
              onClick={() => setBenchPage((p) => Math.max(0, p - 1))}
              disabled={clampedPage === 0}
              className="w-full py-0.5 text-muted-fg text-xs hover:bg-surface-2 disabled:opacity-30 transition-colors"
              aria-label="Anterior"
            >
              ▲
            </button>
          )}
          {benchVisible.length === 0 && activeExclusions.length === 0 ? (
            <p className="text-[9px] text-muted-fg text-center py-2 leading-tight">Sin suplentes</p>
          ) : (
            benchVisible.map((p) => (
              <PlayerChip
                key={p.id}
                number={p.number}
                name={p.name}
                tone="muted"
                onClick={() => handleBenchClick(p.number)}
                onDragStart={handleDragStart({ num: p.number, from: 'banco' })}
                onDragEnd={handleDragEnd}
                disabled={isFieldFull && selectedField == null && !(gkNum == null && /arq|gk|portero|golero/i.test(p.position))}
              />
            ))
          )}
          {benchNeedsPaging && (
            <button
              type="button"
              onClick={() => setBenchPage((p) => Math.min(totalBenchPages - 1, p + 1))}
              disabled={clampedPage === totalBenchPages - 1}
              className="w-full py-0.5 text-muted-fg text-xs hover:bg-surface-2 disabled:opacity-30 transition-colors"
              aria-label="Siguiente"
            >
              ▼
            </button>
          )}

          {/* 🟨 Sancionados — al pie del banco */}
          {activeExclusions.length > 0 && (
            <div className="border-t border-warning/30 mt-1">
              <div className="text-[8px] font-bold tracking-widest text-warning/80 text-center py-0.5 bg-warning/10">
                SANCIONADOS
              </div>
              {activeExclusions.map((ex) => (
                <ExclusionChip key={`ex-${ex.playerNum}`} exclusion={ex} />
              ))}
            </div>
          )}
        </SectorFrame>
      </div>

      {/* ── Portería vacía sticky ─────────────────────────────── */}
      {gkNum != null && (
        <button
          type="button"
          onClick={handleClearGoalkeeper}
          className="rounded-lg border border-warning/40 bg-warning/10 hover:bg-warning/20 transition-colors py-2 px-1 text-center"
          title="Sacar arquero para poder meter 7mo de campo"
        >
          <div className="text-lg leading-none text-warning">⊘</div>
          <div className="text-[8px] text-warning mt-1 leading-tight">Portería<br />vacía</div>
        </button>
      )}

      {selectedField != null && (
        <p className="text-[9px] text-info text-center px-1 leading-tight">
          #{selectedField} seleccionado. Tocá suplente para cambiar, o de nuevo para sacar.
        </p>
      )}

      {draggedNum != null && (
        <p className="text-[9px] text-info text-center px-1 leading-tight">
          Arrastrando #{draggedNum}
        </p>
      )}
    </div>
  );
};

// ─── Subcomponentes ────────────────────────────────────────────────

const SECTOR_HEADER: Record<string, string> = {
  info: 'bg-info/20 text-info',
  success: 'bg-success/20 text-success',
  muted: 'bg-surface-2 text-muted-fg',
};

const SECTOR_BORDER: Record<string, string> = {
  info: 'border-info/30',
  success: 'border-success/30',
  muted: 'border-border',
};

const SectorFrame = ({
  label, tone, count, grow, highlight, children,
}: {
  label: string;
  tone: keyof typeof SECTOR_HEADER;
  count?: string;
  grow?: boolean;
  highlight?: boolean;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      'rounded-lg border bg-surface overflow-hidden flex flex-col transition-colors',
      SECTOR_BORDER[tone],
      grow && 'h-full min-h-0',
      highlight && 'ring-2 ring-primary/60 border-primary',
    )}
  >
    <div className={cn('px-1.5 py-0.5 flex items-center justify-between', SECTOR_HEADER[tone])}>
      <span className="text-[8px] font-bold tracking-widest">{label}</span>
      {count && <span className="text-[8px] opacity-80">{count}</span>}
    </div>
    <div className={cn('flex flex-col', grow && 'flex-1 overflow-y-auto')}>{children}</div>
  </div>
);

const CHIP_TONE: Record<string, string> = {
  info: 'text-info',
  success: 'text-success',
  muted: 'text-fg',
};

const PlayerChip = ({
  number, name, tone, selected, onClick, onDragStart, onDragEnd, disabled, title,
}: {
  number: number;
  name: string;
  tone: keyof typeof CHIP_TONE;
  selected?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  disabled?: boolean;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    draggable={!disabled && !!onDragStart}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    className={cn(
      'w-full py-1 px-0.5 text-center border-b border-border last:border-b-0 transition-colors',
      selected ? 'bg-primary/25 ring-1 ring-primary/60' : 'hover:bg-surface-2',
      tone === 'muted' && !selected && 'opacity-75',
      disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent',
      !disabled && onDragStart && 'cursor-grab active:cursor-grabbing',
    )}
  >
    <div className={cn('text-lg font-bold leading-none', CHIP_TONE[tone])}>{number}</div>
    <div className="text-[8px] text-muted-fg mt-0.5 truncate leading-tight">{name}</div>
  </button>
);

const ExclusionChip = ({ exclusion }: { exclusion: ActiveExclusion }) => {
  const isRed = exclusion.type === 'red_card';
  return (
    <div
      className={cn(
        'w-full py-1 px-0.5 text-center border-b border-border last:border-b-0 opacity-70 cursor-not-allowed',
        isRed ? 'bg-danger/10' : 'bg-warning/5',
      )}
      title={isRed ? 'Expulsado con tarjeta roja' : `Exclusión 2min — restan ${formatRemaining(exclusion.remainingSec ?? 0)}`}
    >
      <div className={cn('text-lg font-bold leading-none', isRed ? 'text-danger' : 'text-warning')}>
        {exclusion.playerNum}
      </div>
      <div className="text-[8px] text-muted-fg mt-0.5 truncate leading-tight">{exclusion.playerName}</div>
      <div className={cn('text-[9px] font-semibold mt-0.5 leading-none', isRed ? 'text-danger' : 'text-warning')}>
        {isRed ? '🟥' : `⏱ ${formatRemaining(exclusion.remainingSec ?? 0)}`}
      </div>
    </div>
  );
};
