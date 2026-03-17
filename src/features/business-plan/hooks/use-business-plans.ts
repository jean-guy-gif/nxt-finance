'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useAuthStore } from '@/stores/auth-store';
import { writeAuditLog } from '@/lib/audit';
import {
  fetchBusinessPlans,
  fetchBusinessPlan,
  createBusinessPlan,
  updateHypothesis,
} from '../services/bp-engine';
import type { BpProjection, BpHypothesis } from '@/types/models';
import type { BpScenario } from '@/types/enums';

// ============================================
// Queries
// ============================================

/**
 * Fetch all business plans for the active agency.
 */
export function useBusinessPlans() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['business-plans', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchBusinessPlans(supabase, agencyId!);
    },
    enabled: !!agencyId,
  });
}

/**
 * Fetch a single business plan by id, with hypotheses, projections, and narratives.
 * Polls every 5s while the plan is still computing.
 */
export function useBusinessPlan(id: string | null) {
  return useQuery({
    queryKey: ['business-plan', id],
    queryFn: () => {
      const supabase = createClient();
      return fetchBusinessPlan(supabase, id!);
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'computing' ? 5000 : false;
    },
  });
}

/**
 * Fetch projections for a business plan, optionally filtered by scenario.
 * Ordered by scenario, month.
 */
export function useProjections(planId: string | null, scenario?: BpScenario) {
  return useQuery({
    queryKey: ['bp-projections', planId, scenario],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('bp_projections')
        .select('*')
        .eq('business_plan_id', planId!);

      if (scenario) {
        query = query.eq('scenario', scenario);
      }

      const { data, error } = await query
        .order('scenario')
        .order('month');

      if (error) throw error;
      return data as BpProjection[];
    },
    enabled: !!planId,
  });
}

/**
 * Fetch hypotheses for a business plan, optionally filtered by scenario.
 * Ordered by sort_order.
 */
export function useHypotheses(planId: string | null, scenario?: BpScenario) {
  return useQuery({
    queryKey: ['bp-hypotheses', planId, scenario],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('bp_hypotheses')
        .select('*')
        .eq('business_plan_id', planId!);

      if (scenario) {
        query = query.eq('scenario', scenario);
      }

      const { data, error } = await query.order('sort_order');

      if (error) throw error;
      return data as BpHypothesis[];
    },
    enabled: !!planId,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Create a new business plan and enqueue the computation job.
 * Returns { planId, jobId }.
 */
export function useCreateBusinessPlan() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: { targetYear: number; analysisId?: string }) => {
      const supabase = createClient();
      return createBusinessPlan(supabase, agencyId!, input.targetYear, input.analysisId);
    },
    onSuccess: (data) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!,
        userId: userId!,
        action: 'created',
        entityType: 'business_plan',
        entityId: data.planId,
        metadata: {
          job_id: data.jobId,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['business-plans'] });
    },
  });
}

/**
 * Update a single hypothesis value.
 * Invalidates hypotheses, projections, and business plan queries.
 */
export function useUpdateHypothesis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { hypothesisId: string; value: number }) => {
      const supabase = createClient();
      return updateHypothesis(supabase, input.hypothesisId, input.value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bp-hypotheses'] });
      queryClient.invalidateQueries({ queryKey: ['bp-projections'] });
      queryClient.invalidateQueries({ queryKey: ['business-plan'] });
    },
  });
}

/**
 * Archive a business plan (set is_current=false, status='archived').
 */
export function useArchiveBusinessPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('business_plans')
        .update({
          is_current: false,
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-plans'] });
    },
  });
}
