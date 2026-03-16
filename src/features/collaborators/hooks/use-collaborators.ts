'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useAuthStore } from '@/stores/auth-store';
import { writeAuditLog } from '@/lib/audit';
import {
  fetchCollaborators,
  fetchActiveCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  type CreateCollaboratorInput,
  type UpdateCollaboratorInput,
} from '../services/collaborator-service';
import {
  fetchSplitByRevenue,
  upsertSplit,
  deleteSplit,
  updatePayoutStatus,
  fetchPayoutSummary,
} from '../services/commission-service';
import type { PayoutStatus, CollaboratorType } from '@/types/enums';

// --- Collaborator hooks ---

export function useCollaborators() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['collaborators', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchCollaborators(supabase, agencyId!);
    },
    enabled: !!agencyId,
  });
}

export function useActiveCollaborators() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['collaborators', 'active', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchActiveCollaborators(supabase, agencyId!);
    },
    enabled: !!agencyId,
  });
}

export function useCreateCollaborator() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: Omit<CreateCollaboratorInput, 'agency_id'>) => {
      const supabase = createClient();
      return createCollaborator(supabase, { ...input, agency_id: agencyId! });
    },
    onSuccess: (data) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'created', entityType: 'collaborator', entityId: data.id,
        metadata: { full_name: data.full_name, type: data.type, rate: data.default_split_rate },
      });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
  });
}

export function useUpdateCollaborator() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCollaboratorInput & { id: string }) => {
      const supabase = createClient();
      return updateCollaborator(supabase, id, input);
    },
    onSuccess: (data, variables) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'updated', entityType: 'collaborator', entityId: variables.id,
        metadata: { full_name: data.full_name },
      });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
  });
}

export function useDeleteCollaborator() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (id: string) => {
      const supabase = createClient();
      return deleteCollaborator(supabase, id);
    },
    onSuccess: (_, id) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'deleted', entityType: 'collaborator', entityId: id,
      });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
  });
}

// --- Commission split hooks ---

export function useCommissionSplit(revenueId: string) {
  return useQuery({
    queryKey: ['commission-split', revenueId],
    queryFn: () => {
      const supabase = createClient();
      return fetchSplitByRevenue(supabase, revenueId);
    },
    enabled: !!revenueId,
  });
}

export function useUpsertSplit() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: {
      revenueId: string;
      collaboratorId: string;
      collaboratorType: CollaboratorType;
      grossAmount: number;
      networkRate: number;
      collaboratorRate: number;
    }) => {
      const supabase = createClient();
      return upsertSplit(
        supabase,
        input.revenueId,
        input.collaboratorId,
        input.collaboratorType,
        input.grossAmount,
        input.networkRate,
        input.collaboratorRate
      );
    },
    onSuccess: (data, variables) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'created', entityType: 'commission_split', entityId: data.id,
        metadata: {
          revenue_id: variables.revenueId,
          collaborator_amount: data.collaborator_amount,
          agency_amount: data.agency_amount,
          network_amount: data.network_amount,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['commission-split', variables.revenueId] });
      queryClient.invalidateQueries({ queryKey: ['revenue', variables.revenueId] });
      queryClient.invalidateQueries({ queryKey: ['payout-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteSplit() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (revenueId: string) => {
      const supabase = createClient();
      return deleteSplit(supabase, revenueId);
    },
    onSuccess: (_, revenueId) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'deleted', entityType: 'commission_split', entityId: revenueId,
      });
      queryClient.invalidateQueries({ queryKey: ['commission-split', revenueId] });
      queryClient.invalidateQueries({ queryKey: ['revenue', revenueId] });
      queryClient.invalidateQueries({ queryKey: ['payout-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePayoutStatus() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: ({ splitId, status }: { splitId: string; status: PayoutStatus }) => {
      const supabase = createClient();
      return updatePayoutStatus(supabase, splitId, status);
    },
    onSuccess: (data) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'status_changed', entityType: 'commission_split', entityId: data.id,
        changes: { payout_status: { from: null, to: data.payout_status } },
        metadata: { collaborator_amount: data.collaborator_amount },
      });
      queryClient.invalidateQueries({ queryKey: ['commission-split'] });
      queryClient.invalidateQueries({ queryKey: ['payout-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// --- Dashboard KPI hooks ---

/**
 * Returns { pendingReversement, estimatedPayroll } for the active agency.
 * - pendingReversement: sum of collaborator_amount where compensation_type='reversement' AND payout_status='pending'
 * - estimatedPayroll: sum of collaborator_amount where compensation_type='masse_salariale' (all statuses)
 */
export function usePayoutSummary() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['payout-summary', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchPayoutSummary(supabase, agencyId!);
    },
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,
  });
}
