'use client';

import type { ReactNode } from 'react';
import { BackButton } from './back-button';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Action buttons rendered on the right */
  actions?: ReactNode;
  /** If provided, shows a back button with this fallback URL */
  backFallback?: string;
  /** Label for the back button */
  backLabel?: string;
}

/**
 * Consistent page header across all modules.
 * Title + description on the left, actions on the right.
 * Optional back button when navigating from another module.
 */
export function PageHeader({
  title,
  description,
  actions,
  backFallback,
  backLabel,
}: PageHeaderProps) {
  return (
    <div className="space-y-2">
      {backFallback && (
        <BackButton fallback={backFallback} label={backLabel} />
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
