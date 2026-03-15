'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useAuthStore } from '@/stores/auth-store';
import { writeAuditLog } from '@/lib/audit';
import {
  fetchPeriods,
  fetchPeriod,
  computePeriodStats,
  updatePeriodStatus,
  refreshVatSnapshot,
  togglePeriodSharing,
} from '../services/period-service';
import type { PeriodStatus } from '@/types/enums';
import type { PeriodComputed } from '../services/period-service';

export function usePeriods() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['periods', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchPeriods(supabase, agencyId!);
    },
    enabled: !!agencyId,
  });
}

export function usePeriod(periodId: string) {
  return useQuery({
    queryKey: ['period', periodId],
    queryFn: () => {
      const supabase = createClient();
      return fetchPeriod(supabase, periodId);
    },
    enabled: !!periodId,
  });
}

export function usePeriodComputed(
  periodId: string,
  agencyId: string | undefined,
  month: number,
  year: number
) {
  return useQuery({
    queryKey: ['period-computed', periodId, agencyId, month, year],
    queryFn: () => {
      const supabase = createClient();
      return computePeriodStats(supabase, agencyId!, periodId, month, year);
    },
    enabled: !!agencyId && !!periodId,
    staleTime: 30 * 1000,
  });
}

export function useUpdatePeriodStatus() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: ({
      periodId,
      status,
      computed,
    }: {
      periodId: string;
      status: PeriodStatus;
      computed?: PeriodComputed;
    }) => {
      const supabase = createClient();
      return updatePeriodStatus(supabase, periodId, status, computed);
    },
    onSuccess: (data, variables) => {
      const supabase = createClient();
      const action = variables.status === 'transmitted' ? 'transmitted' as const : 'status_changed' as const;
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action,
        entityType: 'period', entityId: variables.periodId,
        changes: { status: { from: null, to: variables.status } },
        metadata: { month: data.month, year: data.year },
      });
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['period', variables.periodId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRefreshVatSnapshot() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: ({
      periodId,
      month,
      year,
    }: {
      periodId: string;
      month: number;
      year: number;
    }) => {
      const supabase = createClient();
      return refreshVatSnapshot(supabase, agencyId!, periodId, month, year);
    },
    onSuccess: (data, variables) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'updated', entityType: 'period', entityId: variables.periodId,
        metadata: {
          action_detail: 'vat_snapshot_refreshed',
          vat_collected: data.vat_collected,
          vat_deductible: data.vat_deductible,
          vat_balance: data.vat_balance,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['period', variables.periodId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useTogglePeriodSharing() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: ({
      periodId,
      shared,
    }: {
      periodId: string;
      shared: boolean;
    }) => {
      const supabase = createClient();
      return togglePeriodSharing(supabase, periodId, shared);
    },
    onSuccess: (_, variables) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'updated', entityType: 'period', entityId: variables.periodId,
        changes: { shared_with_accountant: { from: !variables.shared, to: variables.shared } },
      });
      queryClient.invalidateQueries({ queryKey: ['period', variables.periodId] });
      queryClient.invalidateQueries({ queryKey: ['periods'] });
    },
  });
}
