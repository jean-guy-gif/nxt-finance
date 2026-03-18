import type { SupabaseClient } from '@supabase/supabase-js';
import type { Revenue } from '@/types/models';
import type { RevenueStatus, RevenueType } from '@/types/enums';
import { ensurePeriodExists } from '@/features/vat/services/auto-period';

// ============================================
// Revenue CRUD service
// All queries scoped by agency_id (RLS enforced).
// ============================================

export interface RevenueFilters {
  status?: RevenueStatus | 'all';
  type?: RevenueType | 'all';
  search?: string;
  month?: number;
  year?: number;
  /** Date range (takes precedence over month/year) */
  startDate?: string;
  endDate?: string;
}

export interface CreateRevenueInput {
  agency_id: string;
  label: string;
  type: RevenueType;
  source?: string;
  amount: number;
  amount_ht?: number;
  amount_ttc?: number;
  vat_amount?: number;
  date: string;
  period_id?: string;
  status: RevenueStatus;
  comment?: string;
  created_by: string;
}

export interface UpdateRevenueInput {
  label?: string;
  type?: RevenueType;
  source?: string;
  amount?: number;
  amount_ht?: number;
  amount_ttc?: number;
  vat_amount?: number;
  date?: string;
  period_id?: string | null;
  status?: RevenueStatus;
  comment?: string;
}

/**
 * Fetch revenues for an agency with optional filters.
 */
export async function fetchRevenues(
  supabase: SupabaseClient,
  agencyId: string,
  filters: RevenueFilters = {}
): Promise<Revenue[]> {
  let query = supabase
    .from('revenues')
    .select('*, creator:user_profiles!created_by(id, full_name, email)')
    .eq('agency_id', agencyId)
    .order('date', { ascending: false });

  // Date range filter (startDate/endDate takes precedence over month/year)
  if (filters.startDate && filters.endDate) {
    query = query.gte('date', filters.startDate).lt('date', filters.endDate);
  } else if (filters.month && filters.year) {
    const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
    const endMonth = filters.month === 12 ? 1 : filters.month + 1;
    const endYear = filters.month === 12 ? filters.year + 1 : filters.year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    query = query.gte('date', startDate).lt('date', endDate);
  }

  // Status filter
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  // Type filter
  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }

  // Search (label or source)
  if (filters.search) {
    query = query.or(
      `label.ilike.%${filters.search}%,source.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Revenue[];
}

/**
 * Fetch a single revenue by ID.
 */
export async function fetchRevenue(
  supabase: SupabaseClient,
  id: string
): Promise<Revenue | null> {
  const { data, error } = await supabase
    .from('revenues')
    .select('*, creator:user_profiles!created_by(id, full_name, email)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Revenue;
}

/**
 * Create a new revenue.
 */
export async function createRevenue(
  supabase: SupabaseClient,
  input: CreateRevenueInput
): Promise<Revenue> {
  // Auto-resolve period from the revenue date
  if (!input.period_id && input.date) {
    const d = new Date(input.date);
    const periodId = await ensurePeriodExists(
      supabase,
      input.agency_id,
      d.getMonth() + 1,
      d.getFullYear()
    );
    input.period_id = periodId;
  }

  const { data, error } = await supabase
    .from('revenues')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Revenue;
}

/**
 * Update an existing revenue.
 */
export async function updateRevenue(
  supabase: SupabaseClient,
  id: string,
  input: UpdateRevenueInput
): Promise<Revenue> {
  const { data, error } = await supabase
    .from('revenues')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Revenue;
}

/**
 * Delete a revenue (only drafts should be deletable).
 */
export async function deleteRevenue(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('revenues').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Fetch linked receipt documents for a revenue.
 */
export async function fetchRevenueReceipts(
  supabase: SupabaseClient,
  revenueId: string
) {
  const { data, error } = await supabase
    .from('receipt_documents')
    .select('*')
    .eq('related_type', 'revenue')
    .eq('related_id', revenueId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}
