'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useAuthStore } from '@/stores/auth-store';
import { writeAuditLog } from '@/lib/audit';
import {
  createAnalysis,
  fetchAnalyses,
  fetchAnalysis,
  archiveAnalysis,
} from '../services/analysis-engine';
import type { FinancialRatio, FinancialInsight } from '@/types/models';

// ============================================
// Queries
// ============================================

/**
 * Fetch all analyses for the active agency, optionally filtered by fiscal year.
 */
export function useAnalyses(fiscalYear?: number) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['analyses', agencyId, fiscalYear],
    queryFn: () => {
      const supabase = createClient();
      return fetchAnalyses(supabase, agencyId!, fiscalYear);
    },
    enabled: !!agencyId,
  });
}

/**
 * Fetch a single analysis by id, with ratios and insights.
 * Polls every 5s while the analysis is still computing.
 */
export function useAnalysis(id: string | null) {
  return useQuery({
    queryKey: ['analysis', id],
    queryFn: () => {
      const supabase = createClient();
      return fetchAnalysis(supabase, id!);
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'computing' ? 5000 : false;
    },
  });
}

/**
 * Fetch ratios for a given analysis.
 */
export function useRatios(analysisId: string | null) {
  return useQuery({
    queryKey: ['analysis-ratios', analysisId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('financial_ratios')
        .select('*')
        .eq('analysis_id', analysisId!)
        .order('ratio_key');

      if (error) throw error;
      return data as FinancialRatio[];
    },
    enabled: !!analysisId,
  });
}

/**
 * Fetch insights for a given analysis.
 * Polls every 5s while fewer than 5 insights have arrived (LLM generation in progress).
 */
export function useInsights(analysisId: string | null) {
  return useQuery({
    queryKey: ['analysis-insights', analysisId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('financial_insights')
        .select('*')
        .eq('analysis_id', analysisId!)
        .order('created_at');

      if (error) throw error;
      return data as FinancialInsight[];
    },
    enabled: !!analysisId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling once we have insights OR after ~30s (6 polls × 5s)
      if (data && data.length >= 3) return false;
      const fetchCount = query.state.dataUpdateCount;
      if (fetchCount >= 6) return false; // Stop after 30s
      return 5000;
    },
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Create a new financial analysis and enqueue the computation job.
 * Returns { analysisId, jobId }.
 */
export function useCreateAnalysis() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: { fiscalYear: number; balanceSheetId?: string }) => {
      const supabase = createClient();
      return createAnalysis(supabase, agencyId!, input.fiscalYear, input.balanceSheetId);
    },
    onSuccess: (data) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!,
        userId: userId!,
        action: 'created',
        entityType: 'financial_analysis',
        entityId: data.analysisId,
        metadata: {
          job_id: data.jobId,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
    },
  });
}

/**
 * Archive an analysis with a reason.
 */
export function useArchiveAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => {
      const supabase = createClient();
      return archiveAnalysis(supabase, id, reason);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      queryClient.invalidateQueries({ queryKey: ['analysis', variables.id] });
    },
  });
}
