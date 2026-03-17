'use client';

import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  useAlertsV3,
  useMarkAlertReadV3,
  useMarkAlertTreated,
  useSnoozeAlert,
  useDismissAlertV3,
} from '../hooks/use-alerts-v3';
import {
  ALERT_DOMAINS,
  ALERT_DOMAIN_LABELS,
  ALERT_LEVEL_LABELS,
  type AlertDomain,
  type AlertLevel,
} from '@/types/enums';
import { AlertCard } from './alert-card';

// ---------------------------------------------------------------------------

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  // --- Filters ---
  const [domainFilter, setDomainFilter] = useState<AlertDomain | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AlertLevel | 'all'>('all');
  const [actionOnly, setActionOnly] = useState(false);

  // --- Data ---
  const { data: alerts, isLoading } = useAlertsV3();

  // --- Mutations ---
  const markRead = useMarkAlertReadV3();
  const markTreated = useMarkAlertTreated();
  const snooze = useSnoozeAlert();
  const dismiss = useDismissAlertV3();

  // --- Filtered alerts ---
  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    let result = alerts;

    if (domainFilter !== 'all') {
      result = result.filter((a) => a.alert_domain === domainFilter);
    }
    if (severityFilter !== 'all') {
      result = result.filter((a) => a.level === severityFilter);
    }
    if (actionOnly) {
      result = result.filter((a) => a.lifecycle === 'active');
    }

    return result;
  }, [alerts, domainFilter, severityFilter, actionOnly]);

  // --- Helpers ---
  function handleSnooze(alertId: string) {
    const until = new Date();
    until.setDate(until.getDate() + 7);
    snooze.mutate({ alertId, until: until.toISOString() });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle>Alertes</SheetTitle>
          <SheetDescription className="sr-only">
            Centre de notifications et alertes
          </SheetDescription>
        </SheetHeader>

        {/* Filters */}
        <div className="px-4 pb-3 space-y-2 border-b">
          <div className="flex items-center gap-2">
            {/* Domain filter */}
            <select
              value={domainFilter}
              onChange={(e) =>
                setDomainFilter(e.target.value as AlertDomain | 'all')
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Tous les domaines</option>
              {ALERT_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {ALERT_DOMAIN_LABELS[d]}
                </option>
              ))}
            </select>

            {/* Severity filter */}
            <select
              value={severityFilter}
              onChange={(e) =>
                setSeverityFilter(e.target.value as AlertLevel | 'all')
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Toutes sévérités</option>
              {(['critical', 'vigilance', 'info'] as const).map((l) => (
                <option key={l} value={l}>
                  {ALERT_LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
          </div>

          {/* Action-only checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={actionOnly}
              onChange={(e) => setActionOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              Nécessite action uniquement
            </span>
          </label>
        </div>

        {/* Alert list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Chargement...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Aucune alerte active.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Votre agence fonctionne bien.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onRead={() => markRead.mutate(alert.id)}
                  onTreat={() => markTreated.mutate(alert.id)}
                  onSnooze={() => handleSnooze(alert.id)}
                  onDismiss={() => dismiss.mutate(alert.id)}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
