import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountingPeriod } from '@/types/models';

/**
 * Ensure a period exists for the given month/year/agency.
 * If it doesn't exist, create it automatically.
 *
 * Called when creating/updating a revenue or expense — the period_id
 * is resolved automatically so the data is always linked.
 *
 * Returns the period ID.
 */
export async function ensurePeriodExists(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number
): Promise<string> {
  // Check if period already exists
  const { data: existing } = await supabase
    .from('accounting_periods')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create the period
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of the month

  const { data: created, error } = await supabase
    .from('accounting_periods')
    .insert({
      agency_id: agencyId,
      month,
      year,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'in_progress',
      shared_with_accountant: false,
    })
    .select('id')
    .single();

  if (error) {
    // Race condition: another request may have created it
    const { data: retry } = await supabase
      .from('accounting_periods')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (retry) return retry.id;
    throw error;
  }

  return created.id;
}
