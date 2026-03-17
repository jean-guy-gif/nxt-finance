import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProfitabilitySnapshot } from '@/types/models';
import { REVENUE_TYPE_LABELS } from '@/types/enums';
import type { RevenueType, CollaboratorType } from '@/types/enums';

// ============================================
// Profitability Engine — 100% deterministic
// No LLM calls. Pure data aggregation.
// ============================================

const VALID_REVENUE_STATUSES = ['validated', 'collected', 'transmitted'];
const CALCULATION_VERSION = 'profitability_v1.0';

// --- Director Summary interface ---

export interface DirectorSummary {
  agencyMargin: number;
  agencyMarginRate: number;
  bestCollaborator: { name: string; margin: number; marginRate: number } | null;
  worstCollaborator: { name: string; margin: number; marginRate: number } | null;
  bestActivity: { name: string; revenue: number } | null;
  vigilancePoint: string | null;
}

// --- Helpers ---

function buildDateRange(month: number, year: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
  return { startDate, endDate };
}

function buildInputHash(agencyId: string, month: number, year: number, scope: string, scopeId: string | null): string {
  return JSON.stringify({ agencyId, month, year, scope, scopeId });
}

function computeMarginRate(margin: number, revenue: number): number {
  return revenue > 0 ? Math.round((margin / revenue) * 10000) / 100 : 0;
}

function computeCostRevenueRatio(cost: number, revenue: number): number {
  return revenue > 0 ? Math.round((cost / revenue) * 10000) / 100 : 0;
}

/**
 * Upsert a profitability snapshot.
 * Check-then-insert/update pattern (same as commission-service).
 */
async function upsertSnapshot(
  supabase: SupabaseClient,
  payload: Omit<ProfitabilitySnapshot, 'id' | 'created_at' | 'updated_at'>
): Promise<ProfitabilitySnapshot> {
  // Check if snapshot already exists for this unique key
  let query = supabase
    .from('profitability_snapshots')
    .select('id')
    .eq('agency_id', payload.agency_id)
    .eq('period_month', payload.period_month)
    .eq('period_year', payload.period_year)
    .eq('scope', payload.scope);

  if (payload.scope_id) {
    query = query.eq('scope_id', payload.scope_id);
  } else {
    query = query.is('scope_id', null);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('profitability_snapshots')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as ProfitabilitySnapshot;
  }

  const { data, error } = await supabase
    .from('profitability_snapshots')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as ProfitabilitySnapshot;
}

// ============================================
// 1. Collaborator Profitability
// ============================================

/**
 * Compute profitability for each active collaborator in the agency.
 * Revenue = sum of commission_splits.gross_amount for validated/collected/transmitted revenues.
 * Cost depends on collaborator type:
 *   - salarie: employer_total_cost_monthly (fixed monthly cost)
 *   - agent_commercial / independant: sum of commission_splits.collaborator_amount
 */
export async function computeCollaboratorProfitability(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number
): Promise<ProfitabilitySnapshot[]> {
  const { startDate, endDate } = buildDateRange(month, year);

  // Fetch active collaborators
  const { data: collaborators, error: collabError } = await supabase
    .from('collaborators')
    .select('id, full_name, type, employer_total_cost_monthly')
    .eq('agency_id', agencyId)
    .eq('status', 'active');

  if (collabError) throw collabError;
  if (!collaborators || collaborators.length === 0) return [];

  const snapshots: ProfitabilitySnapshot[] = [];

  for (const collab of collaborators) {
    // Fetch commission_splits for this collaborator joined with revenues
    const { data: splits, error: splitError } = await supabase
      .from('commission_splits')
      .select('gross_amount, collaborator_amount, revenue:revenues!inner(date, status, agency_id)')
      .eq('collaborator_id', collab.id)
      .eq('revenue.agency_id', agencyId)
      .gte('revenue.date', startDate)
      .lt('revenue.date', endDate)
      .in('revenue.status', VALID_REVENUE_STATUSES);

    if (splitError) throw splitError;

    const validSplits = splits ?? [];

    // Revenue = sum of gross_amount from commission splits
    const revenue = validSplits.reduce(
      (sum, s) => sum + Number(s.gross_amount),
      0
    );

    // Cost depends on collaborator type
    const collabType = collab.type as CollaboratorType;
    let cost: number;

    if (collabType === 'salarie') {
      // Fixed monthly employer cost
      cost = Number(collab.employer_total_cost_monthly ?? 0);
    } else {
      // agent_commercial / independant: sum of collaborator_amount (what we pay them)
      cost = validSplits.reduce(
        (sum, s) => sum + Number(s.collaborator_amount),
        0
      );
    }

    const margin = revenue - cost;
    const marginRate = computeMarginRate(margin, revenue);
    const costRevenueRatio = computeCostRevenueRatio(cost, revenue);

    const snapshot = await upsertSnapshot(supabase, {
      agency_id: agencyId,
      period_month: month,
      period_year: year,
      scope: 'collaborator',
      scope_id: collab.id,
      scope_label: collab.full_name,
      revenue_total: revenue,
      cost_total: cost,
      margin,
      margin_rate: marginRate,
      cost_revenue_ratio: costRevenueRatio,
      calculation_version: CALCULATION_VERSION,
      computed_at: new Date().toISOString(),
      input_hash: buildInputHash(agencyId, month, year, 'collaborator', collab.id),
    });

    snapshots.push(snapshot);
  }

  return snapshots;
}

// ============================================
// 2. Activity Profitability
// ============================================

/**
 * Compute profitability by revenue type (activity).
 * Revenue = sum of amount_ht (or amount if amount_ht is null) per type.
 * Cost = proportional share of total expenses based on revenue weight.
 */
export async function computeActivityProfitability(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number
): Promise<ProfitabilitySnapshot[]> {
  const { startDate, endDate } = buildDateRange(month, year);

  // Fetch validated revenues for the period
  const { data: revenues, error: revError } = await supabase
    .from('revenues')
    .select('type, amount, amount_ht')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate)
    .in('status', VALID_REVENUE_STATUSES);

  if (revError) throw revError;

  // Fetch all expenses for the period
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('amount_ttc')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate);

  if (expError) throw expError;

  const revenueRows = revenues ?? [];
  const totalExpenses = (expenses ?? []).reduce(
    (sum, e) => sum + Number(e.amount_ttc),
    0
  );

  // Group revenues by type
  const byType = new Map<RevenueType, number>();
  let totalRevenue = 0;

  for (const r of revenueRows) {
    const amount = Number(r.amount_ht ?? r.amount);
    const type = r.type as RevenueType;
    byType.set(type, (byType.get(type) ?? 0) + amount);
    totalRevenue += amount;
  }

  const snapshots: ProfitabilitySnapshot[] = [];

  for (const [type, typeRevenue] of byType.entries()) {
    // Proportional cost allocation
    const cost = totalRevenue > 0
      ? Math.round((totalExpenses * typeRevenue / totalRevenue) * 100) / 100
      : 0;
    const margin = typeRevenue - cost;
    const marginRate = computeMarginRate(margin, typeRevenue);
    const costRevenueRatio = computeCostRevenueRatio(cost, typeRevenue);

    const snapshot = await upsertSnapshot(supabase, {
      agency_id: agencyId,
      period_month: month,
      period_year: year,
      scope: 'activity',
      scope_id: null,
      scope_label: REVENUE_TYPE_LABELS[type],
      revenue_total: typeRevenue,
      cost_total: cost,
      margin,
      margin_rate: marginRate,
      cost_revenue_ratio: costRevenueRatio,
      calculation_version: CALCULATION_VERSION,
      computed_at: new Date().toISOString(),
      input_hash: buildInputHash(agencyId, month, year, 'activity', type),
    });

    snapshots.push(snapshot);
  }

  return snapshots;
}

// ============================================
// 3. Agency Profitability
// ============================================

/**
 * Compute overall agency profitability for the month.
 * Revenue = sum of all validated/collected/transmitted revenues (amount_ht).
 * Cost = sum of all expenses (amount_ttc).
 */
export async function computeAgencyProfitability(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number
): Promise<ProfitabilitySnapshot> {
  const { startDate, endDate } = buildDateRange(month, year);

  // Total revenue
  const { data: revenues, error: revError } = await supabase
    .from('revenues')
    .select('amount, amount_ht')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate)
    .in('status', VALID_REVENUE_STATUSES);

  if (revError) throw revError;

  // Total expenses
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('amount_ttc')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate);

  if (expError) throw expError;

  const totalRevenue = (revenues ?? []).reduce(
    (sum, r) => sum + Number(r.amount_ht ?? r.amount),
    0
  );
  const totalCost = (expenses ?? []).reduce(
    (sum, e) => sum + Number(e.amount_ttc),
    0
  );

  const margin = totalRevenue - totalCost;
  const marginRate = computeMarginRate(margin, totalRevenue);
  const costRevenueRatio = computeCostRevenueRatio(totalCost, totalRevenue);

  return upsertSnapshot(supabase, {
    agency_id: agencyId,
    period_month: month,
    period_year: year,
    scope: 'agency',
    scope_id: null,
    scope_label: 'Agence',
    revenue_total: totalRevenue,
    cost_total: totalCost,
    margin,
    margin_rate: marginRate,
    cost_revenue_ratio: costRevenueRatio,
    calculation_version: CALCULATION_VERSION,
    computed_at: new Date().toISOString(),
    input_hash: buildInputHash(agencyId, month, year, 'agency', null),
  });
}

// ============================================
// 4. Orchestrator
// ============================================

/**
 * Compute all profitability snapshots for the given month/year.
 * Convenience function that calls collaborator, activity, and agency computations.
 */
export async function computeAllProfitability(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number
): Promise<void> {
  await computeCollaboratorProfitability(supabase, agencyId, month, year);
  await computeActivityProfitability(supabase, agencyId, month, year);
  await computeAgencyProfitability(supabase, agencyId, month, year);
}

// ============================================
// 5. Director Summary
// ============================================

/**
 * Build a structured summary for the agency director.
 * 100% deterministic — reads from profitability_snapshots.
 */
export async function getDirectorSummary(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number
): Promise<DirectorSummary> {
  // Fetch all snapshots for this period
  const { data: snapshots, error } = await supabase
    .from('profitability_snapshots')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('period_month', month)
    .eq('period_year', year);

  if (error) throw error;

  const rows = (snapshots ?? []) as ProfitabilitySnapshot[];

  // Agency snapshot
  const agencySnapshot = rows.find((s) => s.scope === 'agency');
  const agencyMargin = agencySnapshot?.margin ?? 0;
  const agencyMarginRate = agencySnapshot?.margin_rate ?? 0;

  // Collaborator snapshots sorted by margin
  const collabSnapshots = rows
    .filter((s) => s.scope === 'collaborator')
    .sort((a, b) => b.margin - a.margin);

  const bestCollaborator = collabSnapshots.length > 0
    ? {
        name: collabSnapshots[0].scope_label,
        margin: collabSnapshots[0].margin,
        marginRate: collabSnapshots[0].margin_rate,
      }
    : null;

  const worstCollaborator = collabSnapshots.length > 0
    ? {
        name: collabSnapshots[collabSnapshots.length - 1].scope_label,
        margin: collabSnapshots[collabSnapshots.length - 1].margin,
        marginRate: collabSnapshots[collabSnapshots.length - 1].margin_rate,
      }
    : null;

  // Activity snapshots sorted by revenue
  const activitySnapshots = rows
    .filter((s) => s.scope === 'activity')
    .sort((a, b) => b.revenue_total - a.revenue_total);

  const bestActivity = activitySnapshots.length > 0
    ? {
        name: activitySnapshots[0].scope_label,
        revenue: activitySnapshots[0].revenue_total,
      }
    : null;

  // Vigilance: count collaborators with negative margin
  const negativeMarginCount = collabSnapshots.filter((s) => s.margin < 0).length;
  const vigilancePoint = negativeMarginCount > 0
    ? `${negativeMarginCount} collaborateur${negativeMarginCount > 1 ? 's' : ''} sous 0% de marge`
    : null;

  return {
    agencyMargin,
    agencyMarginRate,
    bestCollaborator,
    worstCollaborator,
    bestActivity,
    vigilancePoint,
  };
}
