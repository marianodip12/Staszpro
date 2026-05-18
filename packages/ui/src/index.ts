/**
 * @sportiq/ui — Shared UI primitives for SportIQ apps.
 *
 * Pure React components. No business logic, no Supabase, no domain types
 * beyond minimal plan/feature enums needed for ProGate.
 *
 * Convention: subpath imports work for tree-shaking-friendly bundles, e.g.
 *   import { Button }       from '@sportiq/ui/button';
 *   import { useToast }     from '@sportiq/ui/toast';
 *   import { ProGate }      from '@sportiq/ui/pro-gate';
 *
 * The barrel below exists for convenience when grabbing multiple primitives
 * in a single import.
 */

export { cn } from './utils';

export {
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './button';

export {
  Input,
  Field,
  Textarea,
  type InputProps,
  type FieldProps,
  type TextareaProps,
} from './input';

export {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  type DialogProps,
  type DialogHeaderProps,
} from './dialog';

export {
  ToastProvider,
  useToast,
  type Toast,
  type ToastVariant,
  type ToastOptions,
} from './toast';

export {
  ProGate,
  useFeatureGate,
  planHasFeature,
  type ProGateProps,
  type PlanFeatureName,
  type OrgPlan,
} from './pro-gate';

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  type SkeletonProps,
} from './skeleton';

export {
  EmptyState,
  type EmptyStateProps,
} from './empty';

export {
  Spinner,
  FullPageSpinner,
  type SpinnerProps,
} from './spinner';

export {
  ErrorFallback,
  type ErrorFallbackProps,
} from './error-fallback';
