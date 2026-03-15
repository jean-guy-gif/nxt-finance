'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { writeAuditLog } from '@/lib/audit';
import {
  fetchRevenues,
  fetchRevenue,
  createRevenue,
  updateRevenue,
  deleteRevenue,
  fetchRevenueReceipts,
  type RevenueFilters,
  type CreateRevenueInput,
  type UpdateRevenueInput,
} from '../services/revenue-service';

function useRevenueKeys() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const month = useUiStore((s) => s.selectedMonth);
  const year = useUiStore((s) => s.selectedYear);
  return { agencyId, month, year };
}

export function useRevenues(filters: Omit<RevenueFilters, 'month' | 'year'> = {}) {
  const { agencyId, month, year } = useRevenueKeys();
  return useQuery({
    queryKey: ['revenues', agencyId, month, year, filters],
    queryFn: () => {
      const supabase = createClient();
      return fetchRevenues(supabase, agencyId!, { ...filters, month, year });
    },
    enabled: !!agencyId,
  });
}

export function useRevenue(id: string) {
  return useQuery({
    queryKey: ['revenue', id],
    queryFn: () => {
      const supabase = createClient();
      return fetchRevenue(supabase, id);
    },
    enabled: !!id,
  });
}

export function useRevenueReceipts(revenueId: string) {
  return useQuery({
    queryKey: ['revenue-receipts', revenueId],
    queryFn: () => {
      const supabase = createClient();
      return fetchRevenueReceipts(supabase, revenueId);
    },
    enabled: !!revenueId,
  });
}

export function useCreateRevenue() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: Omit<CreateRevenueInput, 'agency_id' | 'created_by'>) => {
      const supabase = createClient();
      return createRevenue(supabase, {
        ...input,
        agency_id: agencyId!,
        created_by: userId!,
      });
    },
    onSuccess: (data) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'created', entityType: 'revenue', entityId: data.id,
        metadata: { label: data.label, amount: data.amount },
      });
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateRevenue() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateRevenueInput & { id: string }) => {
      const supabase = createClient();
      return updateRevenue(supabase, id, input);
    },
    onSuccess: (data, variables) => {
      const supabase = createClient();
      const isStatusChange = variables.status !== undefined;
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: isStatusChange ? 'status_changed' : 'updated',
        entityType: 'revenue', entityId: variables.id,
        changes: variables.status ? { status: { from: null, to: variables.status } } : undefined,
        metadata: { label: data.label },
      });
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['revenue', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteRevenue() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (id: string) => {
      const supabase = createClient();
      return deleteRevenue(supabase, id);
    },
    onSuccess: (_, id) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'deleted', entityType: 'revenue', entityId: id,
      });
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
