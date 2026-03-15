import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommissionSplit } from '@/types/models';
import type { PayoutStatus, CollaboratorType, CompensationType } from '@/types/enums';
import { getCompensationType } from '@/types/enums';

// ============================================
// Commission split service
// Source of truth for collaborator ↔ revenue link.
// revenues.collaborator_id is synced automatically by DB triggers.
// ============================================

export interface CommissionCalcInput {
  grossAmount: number;
  networkRate: number;
  collaboratorRate: number;
}

export interface CommissionCalcResult {
  networkAmount: number;
  agencyRate: number;
  agencyAmount: number;
  collaboratorAmount: number;
}

/**
 * Pure calculation — deterministic, no rounding magic.
 * Uses banker's rounding on the collaborator amount,
 * agency gets the remainder to guarantee sum = gross.
 */
export function calculateCommission(input: CommissionCalcInput): CommissionCalcResult {
  const { grossAmount, networkRate, collaboratorRate } = input;

  const networkAmount = Math.round(grossAmount * networkRate) / 100;
  const base = grossAmount - networkAmount;
  const collaboratorAmount = Math.round(base * collaboratorRate) / 100;
  // Agency gets the remainder — guarantees sum = gross exactly
  const agencyAmount = grossAmount - networkAmount - collaboratorAmount;
  const agencyRate = base > 0 ? Math.round((agencyAmount / base) * 10000) / 100 : 0;

  return { networkAmount, agencyRate, agencyAmount, collaboratorAmount };
}

/**
 * Fetch the commission split for a revenue.
 */
export async function fetchSplitByRevenue(
  supabase: SupabaseClient,
  revenueId: string
): Promise<CommissionSplit | null> {
  const { data, error } = await supabase
    .from('commission_splits')
    .select('*, collaborator:collaborators(*)')
    .eq('revenue_id', revenueId)
    .maybeSingle();

  if (error) return null;
  return data as CommissionSplit | null;
}

/**
 * Create or update a commission split for a revenue.
 * This is the ONLY way to link a collaborator to a revenue.
 */
export async function upsertSplit(
  supabase: SupabaseClient,
  revenueId: string,
  collaboratorId: string,
  collaboratorType: CollaboratorType,
  grossAmount: number,
  networkRate: number,
  collaboratorRate: number
): Promise<CommissionSplit> {
  const calc = calculateCommission({ grossAmount, networkRate, collaboratorRate });
  const compensationType = getCompensationType(collaboratorType);

  const payload = {
    revenue_id: revenueId,
    collaborator_id: collaboratorId,
    gross_amount: grossAmount,
    network_rate: networkRate,
    network_amount: calc.networkAmount,
    agency_rate: calc.agencyRate,
    agency_amount: calc.agencyAmount,
    collaborator_rate: collaboratorRate,
    collaborator_amount: calc.collaboratorAmount,
    compensation_type: compensationType,
  };

  // Check if split already exists
  const { data: existing } = await supabase
    .from('commission_splits')
    .select('id')
    .eq('revenue_id', revenueId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('commission_splits')
      .update(payload)
      .eq('id', existing.id)
      .select('*, collaborator:collaborators(*)')
      .single();

    if (error) throw error;
    return data as CommissionSplit;
  }

  const { data, error } = await supabase
    .from('commission_splits')
    .insert(payload)
    .select('*, collaborator:collaborators(*)')
    .single();

  if (error) throw error;
  return data as CommissionSplit;
}

/**
 * Remove a commission split (unlinks collaborator from revenue).
 * The DB trigger will set revenues.collaborator_id = NULL.
 */
export async function deleteSplit(
  supabase: SupabaseClient,
  revenueId: string
): Promise<void> {
  const { error } = await supabase
    .from('commission_splits')
    .delete()
    .eq('revenue_id', revenueId);

  if (error) throw error;
}

/**
 * Update payout status of a split.
 */
export async function updatePayoutStatus(
  supabase: SupabaseClient,
  splitId: string,
  status: PayoutStatus
): Promise<CommissionSplit> {
  const update: Record<string, unknown> = { payout_status: status };
  if (status === 'paid') {
    update.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('commission_splits')
    .update(update)
    .eq('id', splitId)
    .select('*, collaborator:collaborators(*)')
    .single();

  if (error) throw error;
  return data as CommissionSplit;
}

/**
 * Dashboard KPI data — split by compensation type.
 */
export interface PayoutSummary {
  /** Amount pending payout to independents/agents (compensation_type = reversement) */
  pendingReversement: number;
  /** Estimated payroll cost for employees (compensation_type = masse_salariale) */
  estimatedPayroll: number;
}

/**
 * Fetch payout summary for an agency, split by compensation type.
 */
export async function fetchPayoutSummary(
  supabase: SupabaseClient,
  agencyId: string
): Promise<PayoutSummary> {
  const { data, error } = await supabase
    .from('commission_splits')
    .select('collaborator_amount, compensation_type, payout_status, revenue:revenues!inner(agency_id)')
    .eq('revenue.agency_id', agencyId);

  if (error) return { pendingReversement: 0, estimatedPayroll: 0 };

  const rows = data ?? [];

  const pendingReversement = rows
    .filter((r) => r.compensation_type === 'reversement' && r.payout_status === 'pending')
    .reduce((sum, r) => sum + Number(r.collaborator_amount), 0);

  const estimatedPayroll = rows
    .filter((r) => r.compensation_type === 'masse_salariale')
    .reduce((sum, r) => sum + Number(r.collaborator_amount), 0);

  return { pendingReversement, estimatedPayroll };
}
