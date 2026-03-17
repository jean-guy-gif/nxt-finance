'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useUiStore } from '@/stores/ui-store';
import type { Alert } from '@/types/models';
import type { AlertDomain } from '@/types/enums';
import {
  computeAndSyncV3Alerts,
  markAlertRead,
  markAlertTreated,
  snoozeAlert,
  dismissAlert,
} from '../services/alert-engine-v3';

// ============================================
// V3 Alert Hooks — React Query hooks for V3 alerts with lifecycle management
// ============================================

/** Severity sort order: critical first, then vigilance, then info. */
const LEVEL_ORDER: Record<string, number> = {
  critical: 0,
  vigilance: 1,
  info: 2,
};

function sortBySeverity(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const levelDiff = (LEVEL_ORDER[a.level] ?? 3) - (LEVEL_ORDER[b.level] ?? 3);
    if (levelDiff !== 0) return levelDiff;
    // Same level: most recent first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

// --- 1. useAlertsV3 ---

/**
 * Fetch active/read V3 alerts, optionally filtered by domain.
 * Sorted by severity (critical first) then by created_at desc.
 */
export function useAlertsV3(domain?: AlertDomain) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);

  return useQuery({
    queryKey: ['alerts-v3', agencyId, domain],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('alerts')
        .select('*')
        .eq('agency_id', agencyId!)
        .in('lifecycle', ['active', 'read'])
        .order('created_at', { ascending: false });

      if (domain) {
        query = query.eq('alert_domain', domain);
      }

      const { data, error } = await query;
      if (error) throw error;
      return sortBySeverity((data ?? []) as Alert[]);
    },
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// --- 2. useAlertsByDomain ---

/**
 * Fetch ALL active/read alerts and group by domain client-side.
 */
export function useAlertsByDomain() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);

  return useQuery({
    queryKey: ['alerts-v3-by-domain', agencyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('agency_id', agencyId!)
        .in('lifecycle', ['active', 'read'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const alerts = (data ?? []) as Alert[];
      const grouped: Record<string, Alert[]> = {};

      for (const alert of alerts) {
        const key = alert.alert_domain ?? 'unknown';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(alert);
      }

      // Sort each domain group by severity
      for (const key of Object.keys(grouped)) {
        grouped[key] = sortBySeverity(grouped[key]);
      }

      return grouped as Record<AlertDomain, Alert[]>;
    },
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// --- 3. useAlertCount ---

/**
 * Count active alerts (lifecycle='active') for badge display.
 */
export function useAlertCount() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);

  return useQuery({
    queryKey: ['alerts-v3-count', agencyId],
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId!)
        .eq('lifecycle', 'active');

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// --- 4. useComputeAlerts ---

/**
 * Mutation to run the V3 alert engine (compute + sync + LLM recommendations).
 * Uses the currently selected month/year from the UI store.
 */
export function useComputeAlerts() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const settings = useAgencyStore((s) => s.activeAgency?.settings) as
    | Record<string, unknown>
    | undefined;
  const month = useUiStore((s) => s.selectedMonth);
  const year = useUiStore((s) => s.selectedYear);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      await computeAndSyncV3Alerts(supabase, agencyId!, month, year, settings ?? {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-v3'] });
    },
  });
}

// --- 5. useMarkAlertRead ---

/**
 * Mutation to mark a single alert as read (lifecycle → 'read').
 */
export function useMarkAlertReadV3() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => {
      const supabase = createClient();
      return markAlertRead(supabase, alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-v3'] });
    },
  });
}

// --- 6. useMarkAlertTreated ---

/**
 * Mutation to mark an alert as treated (lifecycle → 'treated').
 */
export function useMarkAlertTreated() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => {
      const supabase = createClient();
      return markAlertTreated(supabase, alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-v3'] });
    },
  });
}

// --- 7. useSnoozeAlert ---

/**
 * Mutation to snooze an alert until a given date.
 */
export function useSnoozeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, until }: { alertId: string; until: string }) => {
      const supabase = createClient();
      return snoozeAlert(supabase, alertId, until);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-v3'] });
    },
  });
}

// --- 8. useDismissAlertV3 ---

/**
 * V3 dismiss: updates lifecycle to 'dismissed' (not just is_dismissed flag).
 */
export function useDismissAlertV3() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => {
      const supabase = createClient();
      return dismissAlert(supabase, alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-v3'] });
    },
  });
}
