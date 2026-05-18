/**
 * @sportiq/ui/empty — "No data yet" placeholder.
 *
 * Usage:
 *   <EmptyState
 *     icon={Trophy}
 *     title="Sin temporadas activas"
 *     description="Creá una temporada para empezar a registrar partidos."
 *     action={<Button onClick={openModal}>Crear temporada</Button>}
 *   />
 */
'use client';

import { type ElementType, type ReactNode } from 'react';
import { cn } from './utils';

export interface EmptyStateProps {
  icon?:        ElementType;
  title:        string;
  description?: string;
  action?:      ReactNode;
  className?:   string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center py-12 px-6', className)}>
      {Icon && (
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.18)' }}
        >
          <Icon size={24} style={{ color: 'var(--blue-400)' }} />
        </div>
      )}
      <h3 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
