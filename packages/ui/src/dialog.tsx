/**
 * @sportiq/ui/dialog — Modal dialog built on Radix Dialog.
 *
 * Why Radix: accessibility (focus trap, ESC handling, ARIA roles) and
 * portal-based mounting (no z-index wars). The wrapper just applies
 * SportIQ design tokens and a consistent animation.
 *
 * Usage:
 *   <Dialog open={open} onOpenChange={setOpen}>
 *     <DialogHeader title="Eliminar partido" />
 *     <DialogBody>¿Estás seguro?</DialogBody>
 *     <DialogFooter>
 *       <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
 *       <Button variant="danger"    onClick={confirm}>Eliminar</Button>
 *     </DialogFooter>
 *   </Dialog>
 */

'use client';

import { type ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from './utils';

export interface DialogProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  children:      ReactNode;
  maxWidth?:     'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const MAX_WIDTH_CLASSES: Record<NonNullable<DialogProps['maxWidth']>, string> = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-xl',
  '2xl': 'max-w-2xl',
};

export function Dialog({ open, onOpenChange, children, maxWidth = 'md' }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className="fixed inset-0 z-40"
          style={{
            background:     'rgba(3, 5, 15, .7)',
            backdropFilter: 'blur(4px)',
            animation:      'fadeIn .15s var(--ease-out)',
          }}
        />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full mx-4 rounded-2xl border shadow-2xl',
            'flex flex-col max-h-[90vh] overflow-hidden',
            MAX_WIDTH_CLASSES[maxWidth],
          )}
          style={{
            background:  'var(--surface-raised)',
            borderColor: 'var(--surface-border)',
            animation:   'fadeUp .2s var(--ease-spring)',
          }}
        >
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// ─── DialogHeader ─────────────────────────────────────────────────────────────

export interface DialogHeaderProps {
  title:        string;
  description?: string;
  onClose?:     () => void;
}

export function DialogHeader({ title, description, onClose }: DialogHeaderProps) {
  return (
    <div
      className="flex items-start justify-between p-5 border-b shrink-0"
      style={{ borderColor: 'var(--surface-border)' }}
    >
      <div>
        <RadixDialog.Title
          className="font-display font-bold text-xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </RadixDialog.Title>
        {description && (
          <RadixDialog.Description
            className="text-sm mt-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {description}
          </RadixDialog.Description>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
          aria-label="Cerrar"
        >
          <X size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
      )}
    </div>
  );
}

// ─── DialogBody ───────────────────────────────────────────────────────────────

export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5 overflow-y-auto flex-1', className)}>{children}</div>;
}

// ─── DialogFooter ─────────────────────────────────────────────────────────────

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 p-5 border-t shrink-0', className)}
      style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}
    >
      {children}
    </div>
  );
}
