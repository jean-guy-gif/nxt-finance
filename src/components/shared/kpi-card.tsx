'use client';

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  /** If provided, the card becomes clickable and navigates */
  href?: string;
}

const variantStyles = {
  default: 'text-primary bg-primary/10',
  success: 'text-emerald-600 bg-emerald-500/10',
  warning: 'text-amber-600 bg-amber-500/10',
  danger: 'text-red-600 bg-red-500/10',
};

const trendColors = {
  positive: 'text-emerald-600',
  negative: 'text-red-600',
  neutral: 'text-muted-foreground',
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  href,
}: KpiCardProps) {
  const trendColor = trend
    ? trend.value > 0
      ? trendColors.positive
      : trend.value < 0
        ? trendColors.negative
        : trendColors.neutral
    : null;

  const content = (
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && trendColor && (
            <p className={cn('text-xs font-medium', trendColor)}>
              {trend.value > 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            variantStyles[variant]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <a href={href}>
        <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
          {content}
        </Card>
      </a>
    );
  }

  return <Card>{content}</Card>;
}
