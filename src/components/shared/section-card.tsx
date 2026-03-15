'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  /** Optional action button/link in the header */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Remove default padding from CardContent */
  noPadding?: boolean;
}

/**
 * Consistent section card used inside pages.
 * Title + optional action in header, content below.
 */
export function SectionCard({
  title,
  action,
  children,
  className,
  noPadding = false,
}: SectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className={cn(noPadding && 'p-0')}>{children}</CardContent>
    </Card>
  );
}
