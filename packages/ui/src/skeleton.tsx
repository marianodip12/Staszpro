/**
 * @sportiq/ui/skeleton — Shimmer placeholders for loading states.
 */
'use client';

import { type CSSProperties } from 'react';
import { cn } from './utils';

export interface SkeletonProps {
  className?: string;
  style?:     CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('rounded-md', className)}
      style={{
        background: 'linear-gradient(90deg, var(--navy-700) 0%, var(--navy-600) 50%, var(--navy-700) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.6s ease-in-out infinite',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: `${[100, 92, 78][i % 3]}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn('card p-5 space-y-4', className)}
    >
      <Skeleton className="h-4 w-1/3" />
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
