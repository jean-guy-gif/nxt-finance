'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useAuthStore } from '@/stores/auth-store';
import { writeAuditLog } from '@/lib/audit';
import {
  fetchBalanceSheets,
  fetchBalanceSheet,
  createBalanceSheet,
  validateBalanceSheetItem,
  validateBalanceSheet,
  rejectBalanceSheet,
  runCoherenceChecks,
  uploadBilanFile,
} from '../services/balance-sheet-service';
import { createJob } from '@/features/shared/services/job-orchestrator';
import type { BalanceSheetSourceType } from '@/types/enums';

// ============================================
// Queries
// ============================================

/**
 * Fetch all balance sheets for the active agency, optionally filtered by fiscal year.
 */
export function useBalanceSheets(fiscalYear?: number) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['balance-sheets', agencyId, fiscalYear],
    queryFn: () => {
      const supabase = createClient();
      return fetchBalanceSheets(supabase, agencyId!, fiscalYear);
    },
    enabled: !!agencyId,
  });
}

/**
 * Fetch a single balance sheet by id, with items and checks.
 */
export function useBalanceSheet(id: string | null) {
  return useQuery({
    queryKey: ['balance-sheet', id],
    queryFn: () => {
      const supabase = createClient();
      return fetchBalanceSheet(supabase, id!);
    },
    enabled: !!id,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Upload a file, create a balance sheet, and enqueue a parsing job.
 * Returns `{ balanceSheet, jobId }`.
 */
export function useUploadAndCreateBalanceSheet() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: {
      file: File;
      fiscalYear: number;
      sourceType: BalanceSheetSourceType;
    }) => {
      const supabase = createClient();

      // a) Upload file
      const filePath = await uploadBilanFile(supabase, agencyId!, input.file);

      // b) Create balance_sheet record
      const balanceSheet = await createBalanceSheet(supabase, {
        agencyId: agencyId!,
        fiscalYear: input.fiscalYear,
        sourceType: input.sourceType,
        sourceFilePath: filePath,
      });

      // c) Create processing job
      const jobResult = await createJob(supabase, {
        agencyId: agencyId!,
        jobType: 'bilan_parsing',
        relatedType: 'balance_sheet',
        relatedId: balanceSheet.id,
        triggeredBy: userId,
      });

      return { balanceSheet, jobId: jobResult.job.id };
    },
    onSuccess: (data) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!,
        userId: userId!,
        action: 'created',
        entityType: 'balance_sheet',
        entityId: data.balanceSheet.id,
        metadata: {
          fiscal_year: data.balanceSheet.fiscal_year,
          source_type: data.balanceSheet.source_type,
          job_id: data.jobId,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['balance-sheets'] });
    },
  });
}

/**
 * Validate a single balance sheet item, optionally correcting its amount.
 */
export function useValidateBalanceSheetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, correctedAmount }: { itemId: string; correctedAmount?: number }) => {
      const supabase = createClient();
      return validateBalanceSheetItem(supabase, itemId, correctedAmount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
    },
  });
}

/**
 * Validate a balance sheet (archives previous versions, sets status to 'validated').
 */
export function useValidateBalanceSheet() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (id: string) => {
      const supabase = createClient();
      return validateBalanceSheet(supabase, id, userId!);
    },
    onSuccess: (data, id) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!,
        userId: userId!,
        action: 'validated',
        entityType: 'balance_sheet',
        entityId: id,
      });
      queryClient.invalidateQueries({ queryKey: ['balance-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet', id] });
    },
  });
}

/**
 * Reject a balance sheet with a reason.
 */
export function useRejectBalanceSheet() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => {
      const supabase = createClient();
      return rejectBalanceSheet(supabase, id, reason);
    },
    onSuccess: (_, variables) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!,
        userId: userId!,
        action: 'updated',
        entityType: 'balance_sheet',
        entityId: variables.id,
        metadata: { reason: variables.reason },
      });
      queryClient.invalidateQueries({ queryKey: ['balance-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet', variables.id] });
    },
  });
}

/**
 * Run coherence checks on a balance sheet and recompute confidence.
 */
export function useRunCoherenceChecks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (balanceSheetId: string) => {
      const supabase = createClient();
      return runCoherenceChecks(supabase, balanceSheetId);
    },
    onSuccess: (_, balanceSheetId) => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet', balanceSheetId] });
    },
  });
}
