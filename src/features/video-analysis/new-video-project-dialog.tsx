import { useState } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

/**
 * 🎥 Nuevo análisis de video — sin cargar un partido.
 *
 * Para alguien que NO quiere trackear estadísticas en vivo (sin reloj, sin
 * planilla, sin "Finalizar"): solo pone los nombres de los dos equipos y
 * entra directo al editor de video (clips, dibujo, etc.). Por dentro, esto
 * crea un `MatchSummary` mínimo (sin eventos) que sirve de contenedor para
 * los video_events/video_players — el mismo mecanismo que ya usa el video
 * análisis de un partido normal, solo que sin pasar por "en vivo".
 */
export interface NewVideoProjectValues {
  home: string;
  away: string;
  competition: string;
}

export interface NewVideoProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (v: NewVideoProjectValues) => void;
}

export const NewVideoProjectDialog = ({ open, onClose, onCreate }: NewVideoProjectDialogProps) => {
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [competition, setCompetition] = useState('');

  const canCreate = home.trim() !== '' && away.trim() !== '';

  const reset = () => { setHome(''); setAway(''); setCompetition(''); };
  const handleClose = () => { reset(); onClose(); };
  const handleCreate = () => {
    if (!canCreate) return;
    onCreate({ home: home.trim(), away: away.trim(), competition: competition.trim() });
    reset();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="🎥 Nuevo análisis de video">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted-fg leading-relaxed">
          Para analizar un video sin cargar estadísticas en vivo. Poné los dos
          equipos y entrás directo al editor: subís el video (o pegás un link
          de YouTube) y marcás jugadas, jugadores y clips.
        </p>

        <section>
          <Label htmlFor="home-team">Equipo local</Label>
          <Input id="home-team" placeholder="Ej: Mi equipo" value={home}
            onChange={(e) => setHome(e.target.value)} className="mt-2" autoComplete="off" />
        </section>

        <section>
          <Label htmlFor="away-team">Rival</Label>
          <Input id="away-team" placeholder="Ej: Rival" value={away}
            onChange={(e) => setAway(e.target.value)} className="mt-2" autoComplete="off" />
        </section>

        <section>
          <Label htmlFor="competition">Competición (opcional)</Label>
          <Input id="competition" placeholder="Ej: Liga, Amistoso" value={competition}
            onChange={(e) => setCompetition(e.target.value)} className="mt-2" autoComplete="off" />
        </section>
      </div>

      <DialogFooter className="sm:justify-end">
        <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleCreate} disabled={!canCreate}>Ir al video →</Button>
      </DialogFooter>
    </Dialog>
  );
};
