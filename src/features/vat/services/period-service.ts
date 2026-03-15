import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountingPeriod } from '@/types/models';
import type { PeriodStatus } from '@/types/enums';

// ============================================
// Period & VAT service
// Snapshots are persisted. Completeness is always computed.
// ============================================

export interface PeriodWithComputed extends AccountingPeriod {
  computed: PeriodComputed;
}

export interface PeriodComputed {
  totalRevenues: number;
  totalExpenses: number;
  revenueCount: number;
  expenseCount: number;
  /** Expenses in the period that have at least one linked receipt */
  expensesWithReceipt: number;
  /** Expenses in the period without any receipt */
  expensesWithoutReceipt: number;
  /** Receipts linked to period expenses with status usable or transmitted */
  usableReceipts: number;
  /** Receipts linked to period expenses with status to_verify, received, incomplete */
  receiptsToVerify: number;
  /** Receipts linked to period expenses with status unreadable */
  unreadableReceipts: number;
  /** Total anomalies across all linked receipts */
  anomalyCount: number;
  /** Completeness rate: 0-100, based on expenses with usable receipts */
  completenessRate: number;
  /** Blocking issues that prevent transmission */
  blockers: PeriodBlocker[];
}

export interface PeriodBlocker {
  type: 'missing_receipts' | 'unreadable_receipts' | 'receipts_to_verify' | 'expenses_to_verify' | 'no_vat_snapshot';
  message: string;
  count?: number;
}

/**
 * Fetch all periods for an agency, ordered by year desc, month desc.
 */
export async function fetchPeriods(
  supabase: SupabaseClient,
  agencyId: string
): Promise<AccountingPeriod[]> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('agency_id', agencyId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AccountingPeriod[];
}

/**
 * Fetch a single period by ID.
 */
export async function fetchPeriod(
  supabase: SupabaseClient,
  periodId: string
): Promise<AccountingPeriod | null> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('id', periodId)
    .single();

  if (error) return null;
  return data as AccountingPeriod;
}

/**
 * Compute period completeness and stats dynamically.
 * This is NEVER persisted — always fresh from related data.
 */
export async function computePeriodStats(
  supabase: SupabaseClient,
  agencyId: string,
  periodId: string,
  month: number,
  year: number
): Promise<PeriodComputed> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  // Revenues for this period
  const { data: revenues } = await supabase
    .from('revenues')
    .select('amount, status')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate);

  const revenueRows = revenues ?? [];
  const totalRevenues = revenueRows.reduce((sum, r) => sum + Number(r.amount), 0);

  // Expenses for this period
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, amount_ttc, status')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate);

  const expenseRows = expenses ?? [];
  const totalExpenses = expenseRows.reduce((sum, e) => sum + Number(e.amount_ttc), 0);
  const expenseIds = expenseRows.map((e) => e.id);

  // Receipts linked to these expenses
  let receipts: { related_id: string; status: string; anomalies: unknown[] }[] = [];
  if (expenseIds.length > 0) {
    const { data: receiptData } = await supabase
      .from('receipt_documents')
      .select('related_id, status, anomalies')
      .eq('related_type', 'expense')
      .in('related_id', expenseIds);

    receipts = (receiptData ?? []) as typeof receipts;
  }

  // Which expenses have at least one receipt
  const expenseIdsWithReceipt = new Set(receipts.map((r) => r.related_id));
  const expensesWithReceipt = expenseIds.filter((id) => expenseIdsWithReceipt.has(id)).length;
  const expensesWithoutReceipt = expenseIds.length - expensesWithReceipt;

  // Receipt status breakdown
  const usableReceipts = receipts.filter(
    (r) => r.status === 'usable' || r.status === 'transmitted'
  ).length;
  const receiptsToVerify = receipts.filter(
    (r) => r.status === 'received' || r.status === 'to_verify' || r.status === 'incomplete'
  ).length;
  const unreadableReceipts = receipts.filter((r) => r.status === 'unreadable').length;

  // Anomaly count
  const anomalyCount = receipts.reduce(
    (sum, r) => sum + (Array.isArray(r.anomalies) ? r.anomalies.length : 0),
    0
  );

  // Expenses to verify
  const expensesToVerify = expenseRows.filter((e) => e.status === 'draft' || e.status === 'to_verify').length;

  // Completeness: % of expenses that have at least one usable receipt
  const completenessRate =
    expenseIds.length === 0
      ? 100
      : Math.round(
          (expenseIds.filter((id) => {
            const expReceipts = receipts.filter((r) => r.related_id === id);
            return expReceipts.some(
              (r) => r.status === 'usable' || r.status === 'transmitted'
            );
          }).length /
            expenseIds.length) *
            100
        );

  // Blockers
  const blockers: PeriodBlocker[] = [];

  if (expensesWithoutReceipt > 0) {
    blockers.push({
      type: 'missing_receipts',
      message: `${expensesWithoutReceipt} dépense${expensesWithoutReceipt > 1 ? 's' : ''} sans justificatif`,
      count: expensesWithoutReceipt,
    });
  }
  if (unreadableReceipts > 0) {
    blockers.push({
      type: 'unreadable_receipts',
      message: `${unreadableReceipts} justificatif${unreadableReceipts > 1 ? 's' : ''} illisible${unreadableReceipts > 1 ? 's' : ''}`,
      count: unreadableReceipts,
    });
  }
  if (receiptsToVerify > 0) {
    blockers.push({
      type: 'receipts_to_verify',
      message: `${receiptsToVerify} justificatif${receiptsToVerify > 1 ? 's' : ''} à vérifier`,
      count: receiptsToVerify,
    });
  }
  if (expensesToVerify > 0) {
    blockers.push({
      type: 'expenses_to_verify',
      message: `${expensesToVerify} dépense${expensesToVerify > 1 ? 's' : ''} en brouillon ou à vérifier`,
      count: expensesToVerify,
    });
  }

  return {
    totalRevenues,
    totalExpenses,
    revenueCount: revenueRows.length,
    expenseCount: expenseRows.length,
    expensesWithReceipt,
    expensesWithoutReceipt,
    usableReceipts,
    receiptsToVerify,
    unreadableReceipts,
    anomalyCount,
    completenessRate,
    blockers,
  };
}

/**
 * Update period status with transition rules.
 *
 * Rules:
 * - Cannot move to 'ready_to_transmit' if blockers exist
 * - Cannot move to 'transmitted' without passing through 'ready_to_transmit'
 * - Any other transition is allowed
 */
export async function updatePeriodStatus(
  supabase: SupabaseClient,
  periodId: string,
  newStatus: PeriodStatus,
  computed?: PeriodComputed
): Promise<AccountingPeriod> {
  // Validate transition to ready_to_transmit
  if (newStatus === 'ready_to_transmit' && computed) {
    if (computed.blockers.length > 0) {
      throw new Error(
        'Impossible de marquer la période comme prête : des anomalies bloquantes subsistent.'
      );
    }
  }

  const { data, error } = await supabase
    .from('accounting_periods')
    .update({ status: newStatus })
    .eq('id', periodId)
    .select()
    .single();

  if (error) throw error;
  return data as AccountingPeriod;
}

/**
 * Refresh the VAT snapshot for a period.
 * Recalculates from revenues and expenses, persists as snapshot.
 */
export async function refreshVatSnapshot(
  supabase: SupabaseClient,
  agencyId: string,
  periodId: string,
  month: number,
  year: number
): Promise<AccountingPeriod> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  // VAT collected: from revenues (validated, collected, transmitted)
  const { data: revenues } = await supabase
    .from('revenues')
    .select('vat_amount')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate)
    .in('status', ['validated', 'collected', 'transmitted'])
    .not('vat_amount', 'is', null);

  const vatCollected = (revenues ?? []).reduce(
    (sum, r) => sum + Number(r.vat_amount),
    0
  );

  // VAT deductible: from expenses (validated, transmitted)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('vat_amount')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate)
    .in('status', ['validated', 'transmitted'])
    .not('vat_amount', 'is', null);

  const vatDeductible = (expenses ?? []).reduce(
    (sum, e) => sum + Number(e.vat_amount),
    0
  );

  const vatBalance = vatCollected - vatDeductible;

  const { data, error } = await supabase
    .from('accounting_periods')
    .update({
      vat_collected: vatCollected,
      vat_deductible: vatDeductible,
      vat_balance: vatBalance,
      vat_snapshot_at: new Date().toISOString(),
    })
    .eq('id', periodId)
    .select()
    .single();

  if (error) throw error;
  return data as AccountingPeriod;
}

/**
 * Share/unshare a period with the accountant.
 */
export async function togglePeriodSharing(
  supabase: SupabaseClient,
  periodId: string,
  shared: boolean
): Promise<AccountingPeriod> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .update({ shared_with_accountant: shared })
    .eq('id', periodId)
    .select()
    .single();

  if (error) throw error;
  return data as AccountingPeriod;
}
