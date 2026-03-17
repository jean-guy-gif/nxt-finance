import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProcessingJob } from '@/types/models';
import type { JobType } from '@/types/enums';
import { JOB_MAX_RETRIES } from '@/lib/constants';

// ============================================
// Interfaces
// ============================================

export interface CreateJobInput {
  agencyId: string;
  jobType: JobType;
  relatedType: string;
  relatedId: string;
  payload?: Record<string, unknown>;
  triggeredBy?: string;
}

export interface JobResult {
  job: ProcessingJob;
  isExisting: boolean;
}

// ============================================
// Job lifecycle
// ============================================

/**
 * Create a processing job (idempotent).
 * If an active job (queued/processing) already exists for the same target, return it.
 */
export async function createJob(
  supabase: SupabaseClient,
  input: CreateJobInput
): Promise<JobResult> {
  // Check for existing active job
  const { data: existing } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('related_type', input.relatedType)
    .eq('related_id', input.relatedId)
    .eq('job_type', input.jobType)
    .in('status', ['queued', 'processing'])
    .maybeSingle();

  if (existing) {
    return { job: existing as ProcessingJob, isExisting: true };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('processing_jobs')
    .insert({
      agency_id: input.agencyId,
      job_type: input.jobType,
      status: 'queued',
      related_type: input.relatedType,
      related_id: input.relatedId,
      progress: 0,
      payload_json: input.payload ?? null,
      triggered_by: input.triggeredBy ?? null,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) throw error;

  return { job: data as ProcessingJob, isExisting: false };
}

/**
 * Start a job (logical lock: only if status is 'queued').
 */
export async function startJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<ProcessingJob> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('processing_jobs')
    .update({
      status: 'processing',
      started_at: now,
      updated_at: now,
    })
    .eq('id', jobId)
    .eq('status', 'queued')
    .select('*')
    .single();

  if (error) throw new Error(`Failed to start job ${jobId}: lock failed or job not found`);

  return data as ProcessingJob;
}

/**
 * Update job progress (clamped 0-100, only if processing).
 */
export async function updateJobProgress(
  supabase: SupabaseClient,
  jobId: string,
  progress: number
): Promise<void> {
  const clamped = Math.max(0, Math.min(100, progress));

  await supabase
    .from('processing_jobs')
    .update({
      progress: clamped,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'processing');
}

/**
 * Mark a job as completed.
 */
export async function completeJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<ProcessingJob> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('processing_jobs')
    .update({
      status: 'completed',
      progress: 100,
      completed_at: now,
      updated_at: now,
    })
    .eq('id', jobId)
    .select('*')
    .single();

  if (error) throw error;

  return data as ProcessingJob;
}

/**
 * Mark a job as failed with an error message.
 */
export async function failJob(
  supabase: SupabaseClient,
  jobId: string,
  errorMessage: string
): Promise<ProcessingJob> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('processing_jobs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: now,
      updated_at: now,
    })
    .eq('id', jobId)
    .select('*')
    .single();

  if (error) throw error;

  return data as ProcessingJob;
}

/**
 * Cancel a job (only if still queued).
 */
export async function cancelJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<void> {
  await supabase
    .from('processing_jobs')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'queued');
}

// ============================================
// Queries
// ============================================

/**
 * Fetch a single job by id.
 */
export async function fetchJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<ProcessingJob | null> {
  const { data } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  return (data as ProcessingJob) ?? null;
}

/**
 * Fetch active jobs (queued or processing) for an agency.
 */
export async function fetchActiveJobs(
  supabase: SupabaseClient,
  agencyId: string
): Promise<ProcessingJob[]> {
  const { data, error } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('agency_id', agencyId)
    .in('status', ['queued', 'processing'])
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data as ProcessingJob[];
}

/**
 * Fetch recent jobs for an agency (all statuses).
 */
export async function fetchRecentJobs(
  supabase: SupabaseClient,
  agencyId: string,
  limit = 20
): Promise<ProcessingJob[]> {
  const { data, error } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data as ProcessingJob[];
}

/**
 * Check if a job can be retried (failed count < JOB_MAX_RETRIES).
 */
export async function canRetryJob(
  supabase: SupabaseClient,
  relatedType: string,
  relatedId: string,
  jobType: JobType
): Promise<boolean> {
  const { count } = await supabase
    .from('processing_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('related_type', relatedType)
    .eq('related_id', relatedId)
    .eq('job_type', jobType)
    .eq('status', 'failed');

  return (count ?? 0) < JOB_MAX_RETRIES;
}
