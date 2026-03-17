'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useAuthStore } from '@/stores/auth-store';
import { JOB_POLL_INTERVAL } from '@/lib/constants';
import {
  createJob,
  fetchJob,
  fetchActiveJobs,
  fetchRecentJobs,
  cancelJob,
  type CreateJobInput,
} from '../services/job-orchestrator';

// ============================================
// Job status polling
// ============================================

/**
 * Poll a single job by id.
 * Stops polling when the job reaches a terminal status (completed/failed/cancelled).
 */
export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['job-status', jobId],
    queryFn: () => {
      const supabase = createClient();
      return fetchJob(supabase, jobId!);
    },
    enabled: !!jobId,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        return false;
      }
      return JOB_POLL_INTERVAL;
    },
  });
}

// ============================================
// Active jobs for current agency
// ============================================

/**
 * Fetch active jobs (queued/processing) for the current agency.
 * Polls at JOB_POLL_INTERVAL to keep the list fresh.
 */
export function useActiveJobs() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);

  return useQuery({
    queryKey: ['jobs', 'active', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchActiveJobs(supabase, agencyId!);
    },
    enabled: !!agencyId,
    refetchInterval: JOB_POLL_INTERVAL,
    staleTime: 0,
  });
}

// ============================================
// Recent jobs for monitoring
// ============================================

/**
 * Fetch recent jobs (all statuses) for the current agency.
 */
export function useRecentJobs(limit = 20) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);

  return useQuery({
    queryKey: ['jobs', 'recent', agencyId, limit],
    queryFn: () => {
      const supabase = createClient();
      return fetchRecentJobs(supabase, agencyId!, limit);
    },
    enabled: !!agencyId,
    staleTime: 30 * 1000,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Create a new processing job.
 * Auto-injects agencyId and triggeredBy from stores.
 */
export function useCreateJob() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: Omit<CreateJobInput, 'agencyId' | 'triggeredBy'>) => {
      const supabase = createClient();
      return createJob(supabase, {
        ...input,
        agencyId: agencyId!,
        triggeredBy: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

/**
 * Cancel a queued job.
 */
export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => {
      const supabase = createClient();
      return cancelJob(supabase, jobId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}
