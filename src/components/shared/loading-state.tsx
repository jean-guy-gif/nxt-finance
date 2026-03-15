'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  /** Message displayed under the spinner */
  message?: string;
  /** Full page height or inline */
  fullPage?: boolean;
  className?: string;
}

/**
 * Reusable loading state for pages and sections.
 */
export function LoadingState({
  message = 'Chargement...',
  fullPage = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        fullPage ? 'h-[60vh]' : 'py-16',
        className
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
