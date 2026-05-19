/**
 * ClipList — Shows all clips created for the current match.
 *
 * Each clip can be played, edited (rename/notes), or deleted.
 * Clicking a clip seeks the video to its start time.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Clip } from '@/domain/video';

interface ClipListProps {
  clips: Clip[];
  currentTime: number;
  onPlayClip: (clip: Clip) => void;
  onRenameClip: (clip: Clip, newTitle: string) => void;
  onDeleteClip: (clip: Clip) => void;
}

const fmtTime = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

const fmtDuration = (start: number, end: number): string => {
  const dur = Math.max(0, end - start);
  return `${dur.toFixed(1)}s`;
};

export const ClipList = ({ clips, currentTime, onPlayClip, onRenameClip, onDeleteClip }: ClipListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  if (clips.length === 0) {
    return (
      <div className="text-xs text-muted-fg p-4 text-center border border-dashed border-border rounded-md">
        No hay clips todavía. Hacé click en el botón <span className="text-primary font-medium">+ Clip</span> al lado de un evento, o usá el botón <span className="text-primary font-medium">Crear clip aquí</span> debajo del video.
      </div>
    );
  }

  const startEdit = (clip: Clip) => {
    setEditingId(clip.id);
    setDraftTitle(clip.title);
  };

  const commitEdit = (clip: Clip) => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== clip.title) {
      onRenameClip(clip, trimmed);
    }
    setEditingId(null);
    setDraftTitle('');
  };

  return (
    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
      {clips.map((clip) => {
        const isPlaying =
          currentTime >= clip.start_sec && currentTime <= clip.end_sec;
        const isEditing = editingId === clip.id;

        return (
          <div
            key={clip.id}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md border transition-colors',
              isPlaying
                ? 'border-primary/50 bg-primary/10'
                : 'border-border bg-bg-elevated/40 hover:bg-bg-elevated',
            )}
          >
            {/* Play button */}
            <button
              type="button"
              onClick={() => onPlayClip(clip)}
              className={cn(
                'shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                'bg-primary/20 text-primary hover:bg-primary/30',
              )}
              aria-label="Reproducir clip"
            >
              <PlayIcon />
            </button>

            {/* Time range */}
            <div className="text-[10px] font-mono text-muted-fg shrink-0 tabular-nums">
              {fmtTime(clip.start_sec)} → {fmtTime(clip.end_sec)}
              <div className="text-[9px] text-muted-fg/70">{fmtDuration(clip.start_sec, clip.end_sec)}</div>
            </div>

            {/* Title (inline edit) */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onBlur={() => commitEdit(clip)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(clip);
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      setDraftTitle('');
                    }
                  }}
                  className="w-full px-1.5 py-0.5 text-xs rounded bg-bg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              ) : (
                <button
                  type="button"
                  onDoubleClick={() => startEdit(clip)}
                  className="text-xs font-medium text-fg truncate text-left w-full"
                  title="Doble-click para renombrar"
                >
                  {clip.title}
                </button>
              )}
              {clip.notes && (
                <div className="text-[10px] text-muted-fg truncate">{clip.notes}</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startEdit(clip)}
                className="h-6 w-6"
                aria-label="Renombrar"
              >
                <EditIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteClip(clip)}
                className="h-6 w-6 text-danger hover:bg-danger/10"
                aria-label="Eliminar clip"
              >
                <TrashIcon />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Inline icons ────────────────────────────────────────────────────────────

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);
