/**
 * @sportiq/ui/utils — Class name composition helpers.
 *
 * `cn()` combines clsx (conditional class lists) with tailwind-merge
 * (deduplicates conflicting Tailwind classes). Use it everywhere you
 * build className strings dynamically.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
