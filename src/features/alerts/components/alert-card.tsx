'use client';

import { AlertCircle, AlertTriangle, Info, Check, Clock, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types/models';
import type { AlertLevel } from '@/types/enums';
import { ALERT_DOMAIN_LABELS } from '@/types/enums';

// ---------------------------------------------------------------------------

const severityConfig: Record<
  AlertLevel,
  { icon: typeof Info; color: string; border: string; bg: string; label: string }
> = {
  critical: {
    icon: AlertCircle,
    color: 'text-red-500',
    border: 'border-l-red-500',
    bg: 'bg-red-50 dark:bg-red-950/20',
    label: 'Critique',
  },
  vigilance: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    border: 'border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    label: 'Vigilance',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    border: 'border-l-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    label: 'Information',
  },
};

// ---------------------------------------------------------------------------

export interface AlertCardProps {
  alert: Alert;
  /** Compact mode: no action buttons, smaller text (for dashboard widgets). */
  compact?: boolean;
  onRead?: () => void;
  onTreat?: () => void;
  onSnooze?: () => void;
  onDismiss?: () => void;
}

export function AlertCard({
  alert,
  compact = false,
  onRead,
  onTreat,
  onSnooze,
  onDismiss,
}: AlertCardProps) {
  const config = severityConfig[alert.level] ?? severityConfig.info;
  const Icon = config.icon;
  const domainLabel =
    alert.alert_domain && ALERT_DOMAIN_LABELS[alert.alert_domain]
      ? ALERT_DOMAIN_LABELS[alert.alert_domain]
      : null;

  const showValues =
    alert.measured_value !== null && alert.threshold_value !== null;

  return (
    <div
      className={cn(
        'rounded-md border-l-4 p-3',
        config.border,
        config.bg,
        compact && 'p-2',
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <Icon
          className={cn('h-4 w-4 mt-0.5 shrink-0', config.color)}
        />
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium leading-snug',
              compact && 'text-xs',
            )}
          >
            {alert.message}
          </p>

          {/* Subtitle: entity name + domain badge */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {alert.related_entity_name && (
              <span className="text-xs text-muted-foreground">
                {alert.related_entity_name}
              </span>
            )}
            {domainLabel && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {domainLabel}
              </Badge>
            )}
          </div>

          {/* Measured / threshold values */}
          {showValues && (
            <p className="text-xs text-muted-foreground mt-1">
              Valeur&nbsp;: {alert.measured_value} / Seuil&nbsp;: {alert.threshold_value}
            </p>
          )}

          {/* Recommendation */}
          {alert.recommendation && (
            <p className="mt-1.5 text-xs italic text-muted-foreground bg-muted/50 rounded px-2 py-1">
              {alert.recommendation}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons (only in non-compact mode) */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-6">
          {alert.lifecycle === 'active' && onRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={onRead}
            >
              <Eye className="h-3 w-3 mr-1" />
              Marquer lue
            </Button>
          )}
          {(alert.lifecycle === 'active' || alert.lifecycle === 'read') &&
            onTreat && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={onTreat}
              >
                <Check className="h-3 w-3 mr-1" />
                Marquer traitée
              </Button>
            )}
          {(alert.lifecycle === 'active' || alert.lifecycle === 'read') &&
            onSnooze && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={onSnooze}
              >
                <Clock className="h-3 w-3 mr-1" />
                Reporter 7j
              </Button>
            )}
          {(alert.lifecycle === 'active' || alert.lifecycle === 'read') &&
            onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={onDismiss}
              >
                <X className="h-3 w-3 mr-1" />
                Ignorer
              </Button>
            )}
        </div>
      )}
    </div>
  );
}
