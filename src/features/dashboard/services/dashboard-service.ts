import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Dashboard data service
// Simple, traceable aggregations — no magic.
// All queries are scoped by agency_id (RLS enforced).
// ============================================

export interface DashboardKpis {
  /** Sum of revenues with status validated or collected for the period */
  revenue: number;
  /** Sum of revenues with status collected for the period */
  collections: number;
  /** Sum of expenses (amount_ttc) for the period */
  expenses: number;
  /** Revenue count by status */
  revenueCountByStatus: Record<string, number>;
  /** Expense count by status */
  expenseCountByStatus: Record<string, number>;
}

export interface DashboardAdminStats {
  /** Expenses without any linked receipt */
  expensesWithoutReceipt: number;
  /** Receipts with status to_verify + received */
  receiptsToVerify: number;
  /** Unresolved accountant comments of type 'request' */
  pendingAccountantRequests: number;
}

export interface DashboardVatSnapshot {
  vatCollected: number | null;
  vatDeductible: number | null;
  vatBalance: number | null;
  snapshotAt: string | null;
  periodStatus: string | null;
  periodId: string | null;
}

/**
 * Fetch revenue aggregations for a given month/year.
 * Uses simple SUM + COUNT grouped queries — fully traceable.
 */
export async function fetchDashboardKpis(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number
): Promise<DashboardKpis> {
  // Date range for the month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  // Revenues for the period
  const { data: revenues } = await supabase
    .from('revenues')
    .select('amount, status')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate);

  // Expenses for the period
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount_ttc, status')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate);

  const revenueRows = revenues ?? [];
  const expenseRows = expenses ?? [];

  // Revenue: sum validated + collected as "chiffre d'affaires"
  const revenue = revenueRows
    .filter((r) => r.status === 'validated' || r.status === 'collected' || r.status === 'transmitted')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  // Collections: only collected status
  const collections = revenueRows
    .filter((r) => r.status === 'collected')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  // Expenses: total TTC
  const totalExpenses = expenseRows.reduce(
    (sum, e) => sum + Number(e.amount_ttc),
    0
  );

  // Count by status
  const revenueCountByStatus: Record<string, number> = {};
  for (const r of revenueRows) {
    revenueCountByStatus[r.status] = (revenueCountByStatus[r.status] ?? 0) + 1;
  }

  const expenseCountByStatus: Record<string, number> = {};
  for (const e of expenseRows) {
    expenseCountByStatus[e.status] = (expenseCountByStatus[e.status] ?? 0) + 1;
  }

  return {
    revenue,
    collections,
    expenses: totalExpenses,
    revenueCountByStatus,
    expenseCountByStatus,
  };
}

/**
 * Fetch administrative stats: missing receipts, items to verify, accountant requests.
 */
export async function fetchDashboardAdminStats(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number
): Promise<DashboardAdminStats> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  // Expenses of the period
  const { data: periodExpenses } = await supabase
    .from('expenses')
    .select('id')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate);

  const expenseIds = (periodExpenses ?? []).map((e) => e.id);

  // Receipts linked to these expenses
  let expensesWithoutReceipt = expenseIds.length;
  if (expenseIds.length > 0) {
    const { data: linkedReceipts } = await supabase
      .from('receipt_documents')
      .select('related_id')
      .eq('agency_id', agencyId)
      .eq('related_type', 'expense')
      .in('related_id', expenseIds);

    const linkedExpenseIds = new Set(
      (linkedReceipts ?? []).map((r) => r.related_id)
    );
    expensesWithoutReceipt = expenseIds.filter(
      (id) => !linkedExpenseIds.has(id)
    ).length;
  }

  // Receipts to verify (across the agency, not just this period)
  const { count: receiptsToVerify } = await supabase
    .from('receipt_documents')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .in('status', ['received', 'to_verify']);

  // Pending accountant requests (unresolved)
  const { count: pendingRequests } = await supabase
    .from('accountant_comments')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('type', 'request')
    .eq('is_resolved', false);

  return {
    expensesWithoutReceipt,
    receiptsToVerify: receiptsToVerify ?? 0,
    pendingAccountantRequests: pendingRequests ?? 0,
  };
}

/**
 * Fetch the VAT snapshot for the given period (if it exists).
 */
export async function fetchDashboardVat(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number
): Promise<DashboardVatSnapshot> {
  const { data } = await supabase
    .from('accounting_periods')
    .select('id, vat_collected, vat_deductible, vat_balance, vat_snapshot_at, status')
    .eq('agency_id', agencyId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (!data) {
    return {
      vatCollected: null,
      vatDeductible: null,
      vatBalance: null,
      snapshotAt: null,
      periodStatus: null,
      periodId: null,
    };
  }

  return {
    vatCollected: data.vat_collected ? Number(data.vat_collected) : null,
    vatDeductible: data.vat_deductible ? Number(data.vat_deductible) : null,
    vatBalance: data.vat_balance ? Number(data.vat_balance) : null,
    snapshotAt: data.vat_snapshot_at,
    periodStatus: data.status,
    periodId: data.id,
  };
}

/**
 * Fetch the treasury estimate.
 * Treasury = sum of all collected revenues - sum of all validated/transmitted expenses.
 * This is a simplified visible treasury — not a bank balance.
 */
export async function fetchTreasury(
  supabase: SupabaseClient,
  agencyId: string
): Promise<number> {
  // All collected revenues ever
  const { data: collectedRevenues } = await supabase
    .from('revenues')
    .select('amount')
    .eq('agency_id', agencyId)
    .eq('status', 'collected');

  // All validated + transmitted expenses ever
  const { data: paidExpenses } = await supabase
    .from('expenses')
    .select('amount_ttc')
    .eq('agency_id', agencyId)
    .in('status', ['validated', 'transmitted']);

  const totalIn = (collectedRevenues ?? []).reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );
  const totalOut = (paidExpenses ?? []).reduce(
    (sum, e) => sum + Number(e.amount_ttc),
    0
  );

  return totalIn - totalOut;
}
