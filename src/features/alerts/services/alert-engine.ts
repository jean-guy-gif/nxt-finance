import type { SupabaseClient } from '@supabase/supabase-js';
import type { AlertLevel, AlertCategory } from '@/types/enums';
import type { AgencySettings } from '@/types/models';
import {
  DEFAULT_TREASURY_THRESHOLD,
  DEFAULT_PREPARATION_DEADLINE_DAYS,
} from '@/lib/constants';

// ============================================
// Alert engine — deterministic, traceable rules.
// No AI, no opacity. Each alert has a clear rule and source.
//
// The engine computes alerts from current data and upserts them
// into the alerts table, keyed by (agency_id, rule_key, period_key)
// to prevent duplicates.
// ============================================

export interface AlertRule {
  /** Unique key for deduplication: e.g. "treasury_below_threshold" */
  key: string;
  /** Human-readable message (French, non-technical) */
  message: string;
  level: AlertLevel;
  category: AlertCategory;
  /** Optional related entity */
  related_type?: string;
  related_id?: string;
}

/**
 * Run all alert rules for a given agency and period.
 * Returns the list of alerts that should exist.
 * The caller is responsible for upserting/reconciling with the DB.
 */
export async function computeAlerts(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number,
  settings: AgencySettings
): Promise<AlertRule[]> {
  const alerts: AlertRule[] = [];

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  // ---- Fetch all data needed for rules ----

  const [
    { data: revenues },
    { data: expenses },
    { data: receipts },
    { data: period },
    { data: unresolvedRequests },
    { data: allCollected },
    { data: allPaidExpenses },
  ] = await Promise.all([
    // Revenues of the period
    supabase
      .from('revenues')
      .select('amount, status')
      .eq('agency_id', agencyId)
      .gte('date', startDate)
      .lt('date', endDate),
    // Expenses of the period
    supabase
      .from('expenses')
      .select('id, amount_ttc, status')
      .eq('agency_id', agencyId)
      .gte('date', startDate)
      .lt('date', endDate),
    // Receipts linked to period expenses
    supabase
      .from('receipt_documents')
      .select('related_id, status')
      .eq('agency_id', agencyId)
      .eq('related_type', 'expense'),
    // Period record
    supabase
      .from('accounting_periods')
      .select('id, status, vat_collected, vat_deductible, vat_balance, vat_snapshot_at')
      .eq('agency_id', agencyId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle(),
    // Unresolved accountant requests
    supabase
      .from('accountant_comments')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('type', 'request')
      .eq('is_resolved', false),
    // All collected revenues (for treasury)
    supabase
      .from('revenues')
      .select('amount')
      .eq('agency_id', agencyId)
      .eq('status', 'collected'),
    // All validated/transmitted expenses (for treasury)
    supabase
      .from('expenses')
      .select('amount_ttc')
      .eq('agency_id', agencyId)
      .in('status', ['validated', 'transmitted']),
  ]);

  const revenueRows = revenues ?? [];
  const expenseRows = expenses ?? [];
  const receiptRows = receipts ?? [];
  const expenseIds = expenseRows.map((e) => e.id);

  // ---- RULE 1: Dépenses > Encaissements ----
  const collections = revenueRows
    .filter((r) => r.status === 'collected')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpenses = expenseRows.reduce(
    (sum, e) => sum + Number(e.amount_ttc),
    0
  );

  if (totalExpenses > collections && collections > 0) {
    alerts.push({
      key: `expenses_exceed_collections_${month}_${year}`,
      message: `Les dépenses (${fmt(totalExpenses)}) dépassent les encaissements (${fmt(collections)}) ce mois-ci.`,
      level: 'vigilance',
      category: 'treasury',
    });
  }

  // ---- RULE 2: Trésorerie sous seuil critique ----
  const threshold = settings.treasury_critical_threshold ?? DEFAULT_TREASURY_THRESHOLD;
  const totalIn = (allCollected ?? []).reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );
  const totalOut = (allPaidExpenses ?? []).reduce(
    (sum, e) => sum + Number(e.amount_ttc),
    0
  );
  const treasury = totalIn - totalOut;

  if (treasury < threshold) {
    alerts.push({
      key: 'treasury_below_threshold',
      message: `Trésorerie visible (${fmt(treasury)}) sous le seuil critique de ${fmt(threshold)}.`,
      level: 'critical',
      category: 'treasury',
    });
  }

  // ---- RULE 3: Dépenses sans justificatif ----
  const expenseIdsWithReceipt = new Set(
    receiptRows
      .filter((r) => expenseIds.includes(r.related_id))
      .map((r) => r.related_id)
  );
  const expensesWithoutReceipt = expenseIds.filter(
    (id) => !expenseIdsWithReceipt.has(id)
  );

  if (expensesWithoutReceipt.length > 0) {
    alerts.push({
      key: `missing_receipts_${month}_${year}`,
      message: `${expensesWithoutReceipt.length} dépense${expensesWithoutReceipt.length > 1 ? 's' : ''} sans justificatif ce mois-ci.`,
      level: expensesWithoutReceipt.length >= 3 ? 'critical' : 'vigilance',
      category: 'pre_accounting',
    });
  }

  // ---- RULE 4: Pièces illisibles ou à vérifier ----
  const periodReceipts = receiptRows.filter((r) =>
    expenseIds.includes(r.related_id)
  );
  const unreadable = periodReceipts.filter(
    (r) => r.status === 'unreadable'
  ).length;
  const toVerify = periodReceipts.filter(
    (r) => r.status === 'to_verify' || r.status === 'received'
  ).length;

  if (unreadable > 0) {
    alerts.push({
      key: `unreadable_receipts_${month}_${year}`,
      message: `${unreadable} justificatif${unreadable > 1 ? 's' : ''} illisible${unreadable > 1 ? 's' : ''} ce mois-ci.`,
      level: 'vigilance',
      category: 'pre_accounting',
    });
  }

  if (toVerify > 0) {
    alerts.push({
      key: `receipts_to_verify_${month}_${year}`,
      message: `${toVerify} justificatif${toVerify > 1 ? 's' : ''} à vérifier ce mois-ci.`,
      level: 'info',
      category: 'pre_accounting',
    });
  }

  // ---- RULE 5: Période non prête / bloquée ----
  if (period) {
    const blockedStatuses = ['incomplete', 'to_verify'];
    if (blockedStatuses.includes(period.status)) {
      alerts.push({
        key: `period_blocked_${month}_${year}`,
        message: `La période de ${monthName(month)} ${year} est ${period.status === 'incomplete' ? 'incomplète' : 'à vérifier'}.`,
        level: 'vigilance',
        category: 'vat',
        related_type: 'period',
        related_id: period.id,
      });
    }
  }

  // ---- RULE 6: TVA non préparée à temps ----
  const deadlineDays = settings.preparation_deadline_days ?? DEFAULT_PREPARATION_DEADLINE_DAYS;
  const now = new Date();
  const endOfMonth = new Date(year, month, 0); // Last day of the month
  const daysUntilEnd = Math.ceil(
    (endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (
    period &&
    daysUntilEnd <= deadlineDays &&
    daysUntilEnd >= 0 &&
    !period.vat_snapshot_at &&
    period.status === 'in_progress'
  ) {
    alerts.push({
      key: `vat_not_prepared_${month}_${year}`,
      message: `TVA non préparée pour ${monthName(month)} ${year} — ${daysUntilEnd} jour${daysUntilEnd > 1 ? 's' : ''} avant la fin du mois.`,
      level: 'vigilance',
      category: 'vat',
      related_type: 'period',
      related_id: period.id,
    });
  }

  // ---- RULE 7: Demandes cabinet non résolues ----
  const pendingCount = (unresolvedRequests ?? []).length;
  if (pendingCount > 0) {
    alerts.push({
      key: 'unresolved_accountant_requests',
      message: `${pendingCount} demande${pendingCount > 1 ? 's' : ''} du cabinet en attente de réponse.`,
      level: pendingCount >= 3 ? 'vigilance' : 'info',
      category: 'accountant',
    });
  }

  // ---- RULE 8: TVA déductible > TVA collectée (attention, pas anomalie) ----
  if (
    period &&
    period.vat_deductible != null &&
    period.vat_collected != null &&
    Number(period.vat_deductible) > Number(period.vat_collected) &&
    Number(period.vat_collected) > 0
  ) {
    alerts.push({
      key: `vat_deductible_exceeds_collected_${month}_${year}`,
      message: `TVA déductible supérieure à la TVA collectée pour ${monthName(month)} ${year}. Point d'attention à vérifier avec votre comptable.`,
      level: 'info',
      category: 'vat',
      related_type: 'period',
      related_id: period.id,
    });
  }

  return alerts;
}

/**
 * Sync computed alerts with the database.
 * - Inserts new alerts (by key)
 * - Does NOT delete dismissed alerts
 * - Avoids duplicates via key matching
 */
export async function syncAlerts(
  supabase: SupabaseClient,
  agencyId: string,
  computedAlerts: AlertRule[]
): Promise<void> {
  if (computedAlerts.length === 0) return;

  // Fetch existing non-dismissed alert keys
  const { data: existing } = await supabase
    .from('alerts')
    .select('id, message')
    .eq('agency_id', agencyId)
    .eq('is_dismissed', false);

  const existingMessages = new Set((existing ?? []).map((a) => a.message));

  // Only insert alerts whose message doesn't already exist
  const toInsert = computedAlerts.filter(
    (alert) => !existingMessages.has(alert.message)
  );

  if (toInsert.length === 0) return;

  await supabase.from('alerts').insert(
    toInsert.map((alert) => ({
      agency_id: agencyId,
      level: alert.level,
      category: alert.category,
      message: alert.message,
      related_type: alert.related_type ?? null,
      related_id: alert.related_id ?? null,
    }))
  );
}

// --- Helpers ---

function fmt(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function monthName(month: number): string {
  return new Date(2026, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
  });
}
