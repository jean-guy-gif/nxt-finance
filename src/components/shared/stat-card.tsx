'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  iconClassName?: string;
  className?: string;
  /** If provided, the card becomes clickable */
  href?: string;
}

/**
 * Compact stat block used in summary sections (dashboard admin status, period details).
 * Lighter than KpiCard — meant for secondary metrics grouped together.
 */
export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconClassName,
  className,
  href,
}: StatCardProps) {
  const content = (
    <>
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          iconClassName ?? 'bg-primary/10 text-primary'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xl font-semibold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sublabel && (
          <p className="text-[10px] text-muted-foreground/70">{sublabel}</p>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors',
          className
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg bg-muted/50', className)}>
      {content}
    </div>
  );
}
