import { useRef } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TURNOVER_REASONS, TURNOVER_REASON_ORDER } from '@/domain/constants';
import type { TurnoverReason } from '@/domain/types';

export interface TurnoverReasonDialogProps {
  open: boolean;
  onClose: () => void;
  /** reason === null → "Sin especificar". Sigue el flujo (después pide jugador). */
  onPick: (reason: TurnoverReason | null) => void;
}

export const TurnoverReasonDialog = ({ open, onClose, onPick }: TurnoverReasonDialogProps) => {
  // Anti-doble-tap, igual que en ShotOutcomeDialog.
  const lockedRef = useRef(false);

  const handlePick = (reason: TurnoverReason | null) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setTimeout(() => { lockedRef.current = false; }, 500);
    onPick(reason);
  };

  const handleClose = () => {
    lockedRef.current = false;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="¿Por qué se perdió la pelota?">
      <div className="grid grid-cols-1 gap-2 mb-3">
        {TURNOVER_REASON_ORDER.map((r) => (
          <Button
            key={r}
            variant="secondary"
            onClick={() => handlePick(r)}
            className="h-12 text-sm justify-start gap-2"
          >
            <span className="text-base leading-none">{TURNOVER_REASONS[r].icon}</span>
            {TURNOVER_REASONS[r].label}
          </Button>
        ))}
      </div>

      <Button
        variant="ghost"
        onClick={() => handlePick(null)}
        className="w-full h-11 text-sm text-muted-fg border border-border"
      >
        Sin especificar
      </Button>
    </Dialog>
  );
};
