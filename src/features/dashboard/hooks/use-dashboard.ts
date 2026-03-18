'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useUiStore } from '@/stores/ui-store';
import { getDateRange, getMonthsInRange } from '@/lib/period-utils';
import {
  fetchDashboardKpis,
  fetchDashboardAdminStats,
  fetchDashboardVat,
  fetchTreasury,
} from '../services/dashboard-service';
import { fetchPriorityAlerts, countUnreadAlerts } from '@/features/alerts/services/alerts-service';

/**
 * All dashboard queries, keyed by agency + period.
 * Each query runs independently so partial data can display while others load.
 */

function useDashboardKeys() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const month = useUiStore((s) => s.selectedMonth);
  const year = useUiStore((s) => s.selectedYear);
  const periodView = useUiStore((s) => s.periodView);
  const { startDate, endDate } = getDateRange(periodView, month, year);
  const months = getMonthsInRange(startDate, endDate);
  return { agencyId, month, year, periodView, startDate, endDate, months };
}

export function useDashboardKpis() {
  const { agencyId, periodView, month, year, startDate, endDate } = useDashboardKeys();
  return useQuery({
    queryKey: ['dashboard', 'kpis', agencyId, periodView, month, year],
    queryFn: () => {
      const supabase = createClient();
      return fetchDashboardKpis(supabase, agencyId!, startDate, endDate);
    },
    enabled: !!agencyId,
  });
}

export function useDashboardAdminStats() {
  const { agencyId, periodView, month, year, startDate, endDate } = useDashboardKeys();
  return useQuery({
    queryKey: ['dashboard', 'admin', agencyId, periodView, month, year],
    queryFn: () => {
      const supabase = createClient();
      return fetchDashboardAdminStats(supabase, agencyId!, startDate, endDate);
    },
    enabled: !!agencyId,
  });
}

export function useDashboardVat() {
  const { agencyId, periodView, month, year, months } = useDashboardKeys();
  return useQuery({
    queryKey: ['dashboard', 'vat', agencyId, periodView, month, year],
    queryFn: () => {
      const supabase = createClient();
      return fetchDashboardVat(supabase, agencyId!, months);
    },
    enabled: !!agencyId,
  });
}

export function useTreasury() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['dashboard', 'treasury', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchTreasury(supabase, agencyId!);
    },
    enabled: !!agencyId,
    // Treasury is less time-sensitive, cache longer
    staleTime: 5 * 60 * 1000,
  });
}

export function usePriorityAlerts() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['dashboard', 'alerts', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchPriorityAlerts(supabase, agencyId!);
    },
    enabled: !!agencyId,
  });
}

export function useUnreadAlertCount() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['alerts', 'unread-count', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return countUnreadAlerts(supabase, agencyId!);
    },
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,        // 2 minutes — no need for real-time
    refetchOnWindowFocus: false,
  });
}
