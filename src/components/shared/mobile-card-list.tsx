'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileCardListProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => ReactNode;
  onItemClick?: (item: T) => void;
  className?: string;
}

/**
 * Mobile-first card list — alternative to DataTable for small screens.
 * Each item renders as a card via the renderCard function.
 * Visible on mobile/tablet, hidden on desktop where DataTable takes over.
 */
export function MobileCardList<T>({
  data,
  renderCard,
  onItemClick,
  className,
}: MobileCardListProps<T>) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {data.map((item, index) => (
        <div
          key={index}
          onClick={() => onItemClick?.(item)}
          className={cn(
            'rounded-lg border bg-card p-3',
            onItemClick && 'cursor-pointer hover:bg-muted/30 transition-colors active:bg-muted/50'
          )}
        >
          {renderCard(item, index)}
        </div>
      ))}
    </div>
  );
}

// --- Helpers for consistent card layouts ---

interface CardRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/** Label/value row inside a mobile card */
export function CardRow({ label, children, className }: CardRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{children}</span>
    </div>
  );
}

interface CardHeaderRowProps {
  title: string;
  badge?: ReactNode;
  subtitle?: string;
}

/** Title row with optional badge for top of a mobile card */
export function CardHeaderRow({ title, badge, subtitle }: CardHeaderRowProps) {
  return (
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {badge}
    </div>
  );
}
