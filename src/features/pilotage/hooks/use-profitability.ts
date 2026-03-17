'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useUiStore } from '@/stores/ui-store';
import {
  computeAllProfitability,
  getDirectorSummary,
  computeCollaboratorProfitability,
} from '../services/profitability-engine';
import type { ProfitabilitySnapshot } from '@/types/models';
import type { ProfitabilityScope } from '@/types/enums';

// ============================================
// Queries
// ============================================

/**
 * Fetch profitability snapshots for the active agency and selected period.
 * Optionally filter by scope (agency | collaborator | activity).
 */
export function useProfitabilitySnapshots(scope?: ProfitabilityScope) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const month = useUiStore((s) => s.selectedMonth);
  const year = useUiStore((s) => s.selectedYear);

  return useQuery({
    queryKey: ['profitability', agencyId, month, year, scope],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('profitability_snapshots')
        .select('*')
        .eq('agency_id', agencyId!)
        .eq('period_month', month)
        .eq('period_year', year);

      if (scope) {
        query = query.eq('scope', scope);
      }

      const { data, error } = await query.order('margin', { ascending: false });

      if (error) throw error;
      return data as ProfitabilitySnapshot[];
    },
    enabled: !!agencyId,
  });
}

/**
 * Fetch profitability snapshot for a single collaborator,
 * including last 12 months for trend chart.
 */
export function useCollaboratorProfitability(collaboratorId: string | null) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);

  return useQuery({
    queryKey: ['profitability-collaborator', collaboratorId, agencyId],
    queryFn: async () => {
      const supabase = createClient();

      // Fetch last 12 months of snapshots for trend chart
      const { data, error } = await supabase
        .from('profitability_snapshots')
        .select('*')
        .eq('agency_id', agencyId!)
        .eq('scope', 'collaborator')
        .eq('scope_id', collaboratorId!)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as ProfitabilitySnapshot[];
    },
    enabled: !!collaboratorId && !!agencyId,
  });
}

/**
 * Build the director summary for the active agency and selected period.
 * 100% deterministic — reads from profitability_snapshots.
 */
export function useDirectorSummary() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const month = useUiStore((s) => s.selectedMonth);
  const year = useUiStore((s) => s.selectedYear);

  return useQuery({
    queryKey: ['director-summary', agencyId, month, year],
    queryFn: () => {
      const supabase = createClient();
      return getDirectorSummary(supabase, agencyId!, month, year);
    },
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch profitability snapshots scoped to activity for the selected period.
 * Ordered by revenue_total descending.
 */
export function useActivityProfitability() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const month = useUiStore((s) => s.selectedMonth);
  const year = useUiStore((s) => s.selectedYear);

  return useQuery({
    queryKey: ['profitability-activity', agencyId, month, year],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profitability_snapshots')
        .select('*')
        .eq('agency_id', agencyId!)
        .eq('period_month', month)
        .eq('period_year', year)
        .eq('scope', 'activity')
        .order('revenue_total', { ascending: false });

      if (error) throw error;
      return data as ProfitabilitySnapshot[];
    },
    enabled: !!agencyId,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Refresh all profitability snapshots (collaborator + activity + agency)
 * for the selected period. Invalidates related queries on success.
 */
export function useRefreshProfitability() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const month = useUiStore((s) => s.selectedMonth);
  const year = useUiStore((s) => s.selectedYear);

  return useMutation({
    mutationFn: () => {
      const supabase = createClient();
      return computeAllProfitability(supabase, agencyId!, month, year);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitability'] });
      queryClient.invalidateQueries({ queryKey: ['director-summary'] });
      queryClient.invalidateQueries({ queryKey: ['profitability-collaborator'] });
      queryClient.invalidateQueries({ queryKey: ['profitability-activity'] });
    },
  });
}
