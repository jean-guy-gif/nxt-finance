import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountantComment, AccountingPeriod } from '@/types/models';
import type { CommentType } from '@/types/enums';

// ============================================
// Accountant collaboration service
// ============================================

export interface CommentFilters {
  related_type?: 'expense' | 'receipt' | 'period' | 'all';
  type?: CommentType | 'all';
  is_resolved?: boolean | 'all';
}

export interface CreateCommentInput {
  agency_id: string;
  author_id: string;
  related_type: 'expense' | 'receipt' | 'period';
  related_id: string;
  content: string;
  type: CommentType;
}

/**
 * Fetch comments for an agency with filters.
 */
export async function fetchComments(
  supabase: SupabaseClient,
  agencyId: string,
  filters: CommentFilters = {}
): Promise<AccountantComment[]> {
  let query = supabase
    .from('accountant_comments')
    .select('*, author:user_profiles!author_id(id, full_name, email)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (filters.related_type && filters.related_type !== 'all') {
    query = query.eq('related_type', filters.related_type);
  }
  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }
  if (filters.is_resolved !== undefined && filters.is_resolved !== 'all') {
    query = query.eq('is_resolved', filters.is_resolved);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AccountantComment[];
}

/**
 * Fetch comments for a specific entity.
 */
export async function fetchEntityComments(
  supabase: SupabaseClient,
  agencyId: string,
  relatedType: 'expense' | 'receipt' | 'period',
  relatedId: string
): Promise<AccountantComment[]> {
  const { data, error } = await supabase
    .from('accountant_comments')
    .select('*, author:user_profiles!author_id(id, full_name, email)')
    .eq('agency_id', agencyId)
    .eq('related_type', relatedType)
    .eq('related_id', relatedId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AccountantComment[];
}

/**
 * Create a comment/request/validation/annotation.
 */
export async function createComment(
  supabase: SupabaseClient,
  input: CreateCommentInput
): Promise<AccountantComment> {
  const { data, error } = await supabase
    .from('accountant_comments')
    .insert(input)
    .select('*, author:user_profiles!author_id(id, full_name, email)')
    .single();

  if (error) throw error;
  return data as AccountantComment;
}

/**
 * Mark a comment/request as resolved.
 */
export async function resolveComment(
  supabase: SupabaseClient,
  commentId: string
): Promise<void> {
  const { error } = await supabase
    .from('accountant_comments')
    .update({ is_resolved: true })
    .eq('id', commentId);

  if (error) throw error;
}

/**
 * Fetch periods shared with accountant.
 */
export async function fetchSharedPeriods(
  supabase: SupabaseClient,
  agencyId: string
): Promise<AccountingPeriod[]> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('shared_with_accountant', true)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AccountingPeriod[];
}

/**
 * Summary stats for the accountant dashboard.
 */
export interface AccountantStats {
  pendingRequests: number;
  unresolvedComments: number;
  sharedPeriods: number;
  validationsCount: number;
}

export async function fetchAccountantStats(
  supabase: SupabaseClient,
  agencyId: string
): Promise<AccountantStats> {
  const [requests, unresolved, periods, validations] = await Promise.all([
    supabase
      .from('accountant_comments')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('type', 'request')
      .eq('is_resolved', false),
    supabase
      .from('accountant_comments')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('is_resolved', false),
    supabase
      .from('accounting_periods')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('shared_with_accountant', true),
    supabase
      .from('accountant_comments')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('type', 'validation'),
  ]);

  return {
    pendingRequests: requests.count ?? 0,
    unresolvedComments: unresolved.count ?? 0,
    sharedPeriods: periods.count ?? 0,
    validationsCount: validations.count ?? 0,
  };
}
