'use client';

import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AlertLevel } from '@/types/enums';

const levelConfig: Record<
  AlertLevel,
  { icon: typeof Info; bg: string; border: string; text: string }
> = {
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
  },
  vigilance: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
  critical: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
  },
};

interface AlertBannerProps {
  level: AlertLevel;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** If provided, clicking the alert navigates to this URL */
  href?: string;
  onDismiss?: () => void;
  className?: string;
}

export function AlertBanner({
  level,
  message,
  action,
  href,
  onDismiss,
  className,
}: AlertBannerProps) {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3',
        config.bg,
        config.border,
        config.text,
        href && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={href ? () => window.location.href = href : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <p className="flex-1 text-sm">{message}</p>
      {action && (
        <Button
          variant="ghost"
          size="sm"
          className={cn('text-xs font-medium', config.text)}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6', config.text)}
          onClick={onDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
