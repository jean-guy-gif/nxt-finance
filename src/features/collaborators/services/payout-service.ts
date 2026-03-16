import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommissionSplit } from '@/types/models';

export interface PayoutListItem extends Omit<CommissionSplit, 'collaborator'> {
  revenue: {
    id: string;
    label: string;
    date: string;
    amount: number;
    agency_id: string;
  };
  collaborator: {
    id: string;
    full_name: string;
    type: string;
  };
}

export interface PayoutFilters {
  status?: string;
  collaboratorId?: string;
  month?: number;
  year?: number;
}

export interface PayoutKpis {
  totalPending: number;
  totalPaidPeriod: number;
  countPending: number;
  countPaidPeriod: number;
}

/**
 * Fetch all commission splits for an agency with revenue + collaborator details.
 */
export async function fetchPayouts(
  supabase: SupabaseClient,
  agencyId: string,
  filters: PayoutFilters = {}
): Promise<PayoutListItem[]> {
  let query = supabase
    .from('commission_splits')
    .select('*, revenue:revenues!inner(id, label, date, amount, agency_id), collaborator:collaborators!inner(id, full_name, type)')
    .eq('revenue.agency_id', agencyId)
    .eq('compensation_type', 'reversement')
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    query = query.eq('payout_status', filters.status);
  }

  if (filters.collaboratorId && filters.collaboratorId !== 'all') {
    query = query.eq('collaborator_id', filters.collaboratorId);
  }

  const { data, error } = await query;
  if (error) throw error;

  let results = (data ?? []) as PayoutListItem[];

  // Post-filter by period (revenue date)
  if (filters.month && filters.year) {
    const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
    const endMonth = filters.month === 12 ? 1 : filters.month + 1;
    const endYear = filters.month === 12 ? filters.year + 1 : filters.year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    results = results.filter((r) => r.revenue.date >= startDate && r.revenue.date < endDate);
  }

  return results;
}

/**
 * Fetch KPIs for the payout page.
 */
export async function fetchPayoutKpis(
  supabase: SupabaseClient,
  agencyId: string,
  month?: number,
  year?: number
): Promise<PayoutKpis> {
  const { data, error } = await supabase
    .from('commission_splits')
    .select('collaborator_amount, payout_status, revenue:revenues!inner(date, agency_id)')
    .eq('revenue.agency_id', agencyId)
    .eq('compensation_type', 'reversement');

  if (error) return { totalPending: 0, totalPaidPeriod: 0, countPending: 0, countPaidPeriod: 0 };

  const rows = data ?? [];

  // Total pending (all time)
  const pending = rows.filter((r) => r.payout_status === 'pending');
  const totalPending = pending.reduce((sum, r) => sum + Number(r.collaborator_amount), 0);

  // Paid in the selected period
  let periodRows = rows;
  if (month && year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    periodRows = rows.filter((r) => {
      const d = (r.revenue as unknown as { date: string }).date;
      return d >= startDate && d < endDate;
    });
  }
  const paidPeriod = periodRows.filter((r) => r.payout_status === 'paid');
  const totalPaidPeriod = paidPeriod.reduce((sum, r) => sum + Number(r.collaborator_amount), 0);

  return {
    totalPending,
    totalPaidPeriod,
    countPending: pending.length,
    countPaidPeriod: paidPeriod.length,
  };
}
