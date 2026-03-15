'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useUiStore } from '@/stores/ui-store';
import { computeAlerts, syncAlerts } from '../services/alert-engine';
import {
  fetchPriorityAlerts,
  dismissAlert,
  markAlertRead,
} from '../services/alerts-service';
import type { AgencySettings } from '@/types/models';

/**
 * Run the alert engine for the active period.
 *
 * Rate limiting strategy:
 * - staleTime: 10 minutes — won't re-compute if data is fresh
 * - gcTime: 15 minutes — keeps the result in cache even after unmount
 * - refetchOnMount: false — won't re-run when navigating back to dashboard
 * - refetchOnWindowFocus: false — won't re-run on tab switch
 * - refetchOnReconnect: false — won't re-run on network reconnect
 * - Explicit queryKey includes agency + month + year — only re-runs on period change
 *
 * The engine is NOT invalidated by mutation callbacks.
 * It only re-runs when:
 * 1. The period changes (month/year selector)
 * 2. The cache expires (10 minutes)
 * 3. The user manually refreshes the page
 */
export function useAlertEngine() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const settings = useAgencyStore((s) => s.activeAgency?.settings) as AgencySettings | undefined;
  const month = useUiStore((s) => s.selectedMonth);
  const year = useUiStore((s) => s.selectedYear);

  return useQuery({
    queryKey: ['alert-engine', agencyId, month, year],
    queryFn: async () => {
      const supabase = createClient();
      const computed = await computeAlerts(
        supabase,
        agencyId!,
        month,
        year,
        settings ?? {}
      );
      await syncAlerts(supabase, agencyId!, computed);
      return computed;
    },
    enabled: !!agencyId,
    staleTime: 10 * 60 * 1000,      // 10 minutes
    gcTime: 15 * 60 * 1000,          // 15 minutes — keep in cache after unmount
    refetchOnMount: false,            // Don't re-run on navigation
    refetchOnWindowFocus: false,      // Don't re-run on tab switch
    refetchOnReconnect: false,        // Don't re-run on network reconnect
    retry: 1,                         // Only 1 retry on failure
  });
}

/**
 * Fetch alerts for display (dashboard, notification bell).
 * Lighter than the engine — just reads from the alerts table.
 */
export function useAlerts(limit?: number) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['alerts', 'list', agencyId, limit],
    queryFn: () => {
      const supabase = createClient();
      return fetchPriorityAlerts(supabase, agencyId!, limit);
    },
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,        // 2 minutes
    refetchOnWindowFocus: false,
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => {
      const supabase = createClient();
      return dismissAlert(supabase, alertId);
    },
    onSuccess: () => {
      // Only invalidate the display list, NOT the engine
      queryClient.invalidateQueries({ queryKey: ['alerts', 'list'] });
    },
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => {
      const supabase = createClient();
      return markAlertRead(supabase, alertId);
    },
    onSuccess: () => {
      // Only invalidate the display list and unread count
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
