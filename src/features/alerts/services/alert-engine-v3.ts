import type { SupabaseClient } from '@supabase/supabase-js';
import type { AlertDomain, AlertLevel } from '@/types/enums';
import { resolveThreshold } from '@/lib/registries/alert-thresholds';
import { generateContent } from '@/features/shared/services/llm-gateway';

// ============================================
// Alert Engine V3 — 8 rules + dedup + lifecycle + LLM recommendations
// ============================================
// V3 alerts cover profitability, business trends, and pre-accounting.
// Each rule is deterministic, traceable, and threshold-configurable.
// Recommendations are generated async via LLM with graceful degradation.
// ============================================

// --- Interfaces ---

export interface V3AlertRule {
  key: string;
  domain: AlertDomain;
  level: AlertLevel;
  message: string;
  indicator_key: string;
  measured_value: number;
  threshold_value: number;
  related_type?: string;
  related_id?: string;
  related_entity_name?: string;
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

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function monthName(month: number): string {
  return new Date(2026, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
  });
}

function prevMonth(month: number, year: number): { month: number; year: number } {
  return month === 1
    ? { month: 12, year: year - 1 }
    : { month: month - 1, year };
}

function prevPrevMonth(month: number, year: number): { month: number; year: number } {
  const p = prevMonth(month, year);
  return prevMonth(p.month, p.year);
}

// --- Core engine ---

/**
 * Compute all 8 V3 alert rules for a given agency and month.
 */
export async function computeV3Alerts(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number,
  agencySettings?: Record<string, unknown>
): Promise<V3AlertRule[]> {
  const alerts: V3AlertRule[] = [];

  const prev = prevMonth(month, year);
  const prevPrev = prevPrevMonth(month, year);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  // --- Fetch all data in parallel ---

  const [
    { data: snapshots },
    { data: prevSnapshots },
    { data: yearAgoSnapshots },
    { data: prevPrevSnapshots },
    { data: expenses },
    { data: prevExpenses },
    { data: prevPrevExpenses },
    { data: prev3mExpenses },
    { data: balanceSheets },
  ] = await Promise.all([
    // Current month profitability snapshots
    supabase
      .from('profitability_snapshots')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('period_month', month)
      .eq('period_year', year),
    // Previous month snapshots
    supabase
      .from('profitability_snapshots')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('period_month', prev.month)
      .eq('period_year', prev.year),
    // Same month last year snapshots
    supabase
      .from('profitability_snapshots')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('period_month', month)
      .eq('period_year', year - 1),
    // N-2 month snapshots (for 3-month CA decline)
    supabase
      .from('profitability_snapshots')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('period_month', prevPrev.month)
      .eq('period_year', prevPrev.year),
    // Expenses current month
    supabase
      .from('expenses')
      .select('amount_ttc, category')
      .eq('agency_id', agencyId)
      .gte('date', startDate)
      .lt('date', endDate),
    // Expenses previous month
    supabase
      .from('expenses')
      .select('amount_ttc, category')
      .eq('agency_id', agencyId)
      .gte('date', `${prev.year}-${String(prev.month).padStart(2, '0')}-01`)
      .lt('date', startDate),
    // Expenses N-2 month
    supabase
      .from('expenses')
      .select('amount_ttc, category')
      .eq('agency_id', agencyId)
      .gte('date', `${prevPrev.year}-${String(prevPrev.month).padStart(2, '0')}-01`)
      .lt('date', `${prev.year}-${String(prev.month).padStart(2, '0')}-01`),
    // Expenses for previous 3 months (for averaging)
    supabase
      .from('expenses')
      .select('amount_ttc, category')
      .eq('agency_id', agencyId)
      .gte('date', `${prevPrev.year}-${String(prevPrev.month).padStart(2, '0')}-01`)
      .lt('date', startDate),
    // Recent balance sheets with low confidence
    supabase
      .from('balance_sheets')
      .select('id, overall_confidence, fiscal_year, status')
      .eq('agency_id', agencyId)
      .in('status', ['parsed', 'validating', 'validated'])
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  // --- Derived data ---

  const agencySnapshot = (snapshots ?? []).find((s) => s.scope === 'agency');
  const yearAgoAgencySnapshot = (yearAgoSnapshots ?? []).find((s) => s.scope === 'agency');
  const prevAgencySnapshot = (prevSnapshots ?? []).find((s) => s.scope === 'agency');
  const prevPrevAgencySnapshot = (prevPrevSnapshots ?? []).find((s) => s.scope === 'agency');
  const collabSnapshots = (snapshots ?? []).filter((s) => s.scope === 'collaborator');
  const prevCollabSnapshots = (prevSnapshots ?? []).filter((s) => s.scope === 'collaborator');

  // ---- RULE 1: margin_decline ----
  // Alert if current margin_rate < same month N-1 margin_rate * 0.9

  if (agencySnapshot && yearAgoAgencySnapshot) {
    const currentMargin = Number(agencySnapshot.margin_rate);
    const yearAgoMargin = Number(yearAgoAgencySnapshot.margin_rate);
    const threshold = yearAgoMargin * 0.9;

    if (yearAgoMargin > 0 && currentMargin < threshold) {
      alerts.push({
        key: `margin_decline_${month}_${year}`,
        domain: 'profitability_agency',
        level: 'vigilance',
        message: `Marge en baisse : ${fmtPct(currentMargin / 100)} vs ${fmtPct(yearAgoMargin / 100)} en ${monthName(month)} ${year - 1} (seuil : -10%).`,
        indicator_key: 'margin_decline',
        measured_value: currentMargin,
        threshold_value: threshold,
      });
    }
  }

  // ---- RULE 2: charges_ca_ratio_high ----
  // Alert if cost_revenue_ratio > threshold (default 85%)

  if (agencySnapshot) {
    const ratio = Number(agencySnapshot.cost_revenue_ratio);
    const maxRatio = resolveThreshold('charges_ca_ratio_max', agencySettings);

    if (ratio > maxRatio) {
      alerts.push({
        key: `charges_ca_ratio_high_${month}_${year}`,
        domain: 'profitability_agency',
        level: 'critical',
        message: `Ratio charges/CA critique : ${ratio.toFixed(1)}% (seuil : ${maxRatio}%).`,
        indicator_key: 'charges_ca_ratio_high',
        measured_value: ratio,
        threshold_value: maxRatio,
      });
    }
  }

  // ---- RULE 3: collaborator_unprofitable ----
  // Alert if margin < 0 in BOTH current and previous month

  const prevCollabMap = new Map(
    prevCollabSnapshots.map((s) => [s.scope_id, s])
  );

  for (const snap of collabSnapshots) {
    const currentMargin = Number(snap.margin);
    const prevSnap = prevCollabMap.get(snap.scope_id);

    if (currentMargin < 0 && prevSnap && Number(prevSnap.margin) < 0) {
      alerts.push({
        key: `collaborator_unprofitable_${snap.scope_id}_${month}_${year}`,
        domain: 'profitability_collaborator',
        level: 'critical',
        message: `${snap.scope_label} est non rentable depuis 2 mois consécutifs (marge : ${fmt(currentMargin)}).`,
        indicator_key: 'collaborator_unprofitable',
        measured_value: currentMargin,
        threshold_value: 0,
        related_type: 'collaborator',
        related_id: snap.scope_id,
        related_entity_name: snap.scope_label,
      });
    }
  }

  // ---- RULE 4: collaborator_low_productivity ----
  // Alert if collaborator revenue_total < threshold (default 5000)

  const minCA = resolveThreshold('collaborator_min_ca_monthly', agencySettings);

  for (const snap of collabSnapshots) {
    const revenue = Number(snap.revenue_total);

    if (revenue < minCA) {
      alerts.push({
        key: `collaborator_low_productivity_${snap.scope_id}_${month}_${year}`,
        domain: 'profitability_collaborator',
        level: 'vigilance',
        message: `${snap.scope_label} : CA mensuel de ${fmt(revenue)} sous le seuil de ${fmt(minCA)}.`,
        indicator_key: 'collaborator_low_productivity',
        measured_value: revenue,
        threshold_value: minCA,
        related_type: 'collaborator',
        related_id: snap.scope_id,
        related_entity_name: snap.scope_label,
      });
    }
  }

  // ---- RULE 5: ca_declining_3m ----
  // Alert if CA N < N-1 < N-2 (3 consecutive declines)

  if (agencySnapshot && prevAgencySnapshot && prevPrevAgencySnapshot) {
    const caN = Number(agencySnapshot.revenue_total);
    const caN1 = Number(prevAgencySnapshot.revenue_total);
    const caN2 = Number(prevPrevAgencySnapshot.revenue_total);

    if (caN < caN1 && caN1 < caN2 && caN2 > 0) {
      alerts.push({
        key: `ca_declining_3m_${month}_${year}`,
        domain: 'business_trend',
        level: 'vigilance',
        message: `CA en baisse 3 mois consécutifs : ${fmt(caN2)} → ${fmt(caN1)} → ${fmt(caN)}.`,
        indicator_key: 'ca_declining_3m',
        measured_value: caN,
        threshold_value: caN1,
      });
    }
  }

  // ---- RULE 6: seasonal_anomaly ----
  // Alert if current CA < same month N-1 × factor (default 0.7)

  if (agencySnapshot && yearAgoAgencySnapshot) {
    const currentCA = Number(agencySnapshot.revenue_total);
    const yearAgoCA = Number(yearAgoAgencySnapshot.revenue_total);
    const factor = resolveThreshold('seasonal_anomaly_factor', agencySettings);
    const thresholdCA = yearAgoCA * factor;

    if (yearAgoCA > 0 && currentCA < thresholdCA) {
      alerts.push({
        key: `seasonal_anomaly_${month}_${year}`,
        domain: 'business_trend',
        level: 'vigilance',
        message: `Anomalie saisonnière : CA de ${fmt(currentCA)} vs ${fmt(yearAgoCA)} en ${monthName(month)} ${year - 1} (< ${(factor * 100).toFixed(0)}%).`,
        indicator_key: 'seasonal_anomaly',
        measured_value: currentCA,
        threshold_value: thresholdCA,
      });
    }
  }

  // ---- RULE 7: high_expense_category ----
  // Alert if any expense category > average of previous 3 months × 1.3

  const currentExpenseRows = expenses ?? [];
  const prev3mExpenseRows = prev3mExpenses ?? [];

  if (currentExpenseRows.length > 0 && prev3mExpenseRows.length > 0) {
    // Group current expenses by category
    const currentByCategory = new Map<string, number>();
    for (const e of currentExpenseRows) {
      const cat = e.category as string;
      currentByCategory.set(cat, (currentByCategory.get(cat) ?? 0) + Number(e.amount_ttc));
    }

    // Average previous 3 months by category (divide by number of months with data)
    const prev3mByCategory = new Map<string, number>();
    for (const e of prev3mExpenseRows) {
      const cat = e.category as string;
      prev3mByCategory.set(cat, (prev3mByCategory.get(cat) ?? 0) + Number(e.amount_ttc));
    }

    // Count how many previous months had data (max 3)
    const prevMonthsCount = [prevExpenses, prevPrevExpenses].filter(
      (arr) => (arr ?? []).length > 0
    ).length + (prev3mExpenseRows.length > (prevExpenses ?? []).length + (prevPrevExpenses ?? []).length ? 1 : 0);
    const divisor = Math.max(prevMonthsCount, 1);

    for (const [category, currentAmount] of currentByCategory) {
      const prev3mTotal = prev3mByCategory.get(category) ?? 0;
      const avgAmount = prev3mTotal / divisor;

      if (avgAmount > 0 && currentAmount > avgAmount * 1.3) {
        alerts.push({
          key: `high_expense_category_${category}_${month}_${year}`,
          domain: 'business_trend',
          level: 'info',
          message: `Catégorie "${category}" : ${fmt(currentAmount)} ce mois vs ${fmt(avgAmount)} en moyenne (+${((currentAmount / avgAmount - 1) * 100).toFixed(0)}%).`,
          indicator_key: 'high_expense_category',
          measured_value: currentAmount,
          threshold_value: avgAmount * 1.3,
          related_entity_name: category,
        });
      }
    }
  }

  // ---- RULE 8: low_confidence_bilan ----
  // Alert if recent balance sheet has overall_confidence < 70%

  for (const bs of balanceSheets ?? []) {
    const confidence = Number(bs.overall_confidence);
    if (confidence < 70) {
      alerts.push({
        key: `low_confidence_bilan_${bs.id}`,
        domain: 'pre_accounting',
        level: 'info',
        message: `Bilan ${bs.fiscal_year} : confiance d'extraction faible (${confidence.toFixed(0)}%). Vérification recommandée.`,
        indicator_key: 'low_confidence_bilan',
        measured_value: confidence,
        threshold_value: 70,
        related_type: 'balance_sheet',
        related_id: bs.id,
      });
    }
  }

  return alerts;
}

// --- Sync / Deduplication ---

/**
 * Persist computed V3 alerts with deduplication.
 * For each alert, check if an active alert with same (agency_id, indicator_key, alert_domain) exists.
 * If exists and is active/read -> skip. Otherwise insert new.
 * Returns IDs of newly inserted alerts.
 */
export async function syncV3Alerts(
  supabase: SupabaseClient,
  agencyId: string,
  computedAlerts: V3AlertRule[]
): Promise<string[]> {
  if (computedAlerts.length === 0) return [];

  // Fetch existing active/read alerts for this agency
  const { data: existing } = await supabase
    .from('alerts')
    .select('id, indicator_key, alert_domain, lifecycle')
    .eq('agency_id', agencyId)
    .in('lifecycle', ['active', 'read']);

  const existingKeys = new Set(
    (existing ?? []).map(
      (a) => `${a.alert_domain}::${a.indicator_key}`
    )
  );

  // Filter out alerts that already have an active/read counterpart
  const toInsert = computedAlerts.filter(
    (alert) => !existingKeys.has(`${alert.domain}::${alert.indicator_key}`)
  );

  if (toInsert.length === 0) return [];

  const { data: inserted } = await supabase
    .from('alerts')
    .insert(
      toInsert.map((alert) => ({
        agency_id: agencyId,
        level: alert.level,
        category: domainToCategory(alert.domain),
        message: alert.message,
        related_type: alert.related_type ?? null,
        related_id: alert.related_id ?? null,
        is_read: false,
        is_dismissed: false,
        alert_domain: alert.domain,
        indicator_key: alert.indicator_key,
        measured_value: alert.measured_value,
        threshold_value: alert.threshold_value,
        related_entity_name: alert.related_entity_name ?? null,
        lifecycle: 'active',
      }))
    )
    .select('id');

  return (inserted ?? []).map((r) => r.id as string);
}

/**
 * Map V3 alert_domain to legacy category for backwards compatibility.
 */
function domainToCategory(
  domain: AlertDomain
): 'treasury' | 'vat' | 'pre_accounting' | 'accountant' {
  switch (domain) {
    case 'treasury':
      return 'treasury';
    case 'vat':
      return 'vat';
    case 'pre_accounting':
      return 'pre_accounting';
    case 'accountant':
      return 'accountant';
    case 'profitability_agency':
    case 'profitability_collaborator':
    case 'business_trend':
    case 'business_plan_tracking':
      return 'treasury'; // closest legacy category
  }
}

// --- LLM Recommendations ---

/**
 * Generate LLM recommendations for alerts.
 * Skips info-level alerts and alerts that already have a recommendation.
 * Graceful degradation: if LLM fails, recommendation stays null.
 */
export async function generateAlertRecommendations(
  supabase: SupabaseClient,
  agencyId: string,
  alertIds: string[]
): Promise<void> {
  if (alertIds.length === 0) return;

  // Fetch all alerts in batch
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .in('id', alertIds);

  if (!alerts || alerts.length === 0) return;

  for (const alert of alerts) {
    // Skip if recommendation already exists
    if (alert.recommendation) continue;

    // Skip info-level alerts — only generate for vigilance/critical
    if (alert.level === 'info') continue;

    try {
      const response = await generateContent(supabase, {
        type: 'alert_recommendation',
        agencyId,
        variables: {
          alert_level: alert.level,
          alert_domain: alert.alert_domain ?? '',
          alert_message: alert.message,
          indicator_key: alert.indicator_key ?? '',
          measured_value: String(alert.measured_value ?? ''),
          threshold_value: String(alert.threshold_value ?? ''),
          related_entity_name: alert.related_entity_name ?? '',
        },
      });

      if (response) {
        await supabase
          .from('alerts')
          .update({
            recommendation: response.content,
            llm_generation_id: response.generationId,
            recommendation_at: new Date().toISOString(),
          })
          .eq('id', alert.id);
      }
    } catch (error) {
      // Graceful degradation: log and continue
      console.error(
        `[alert-engine-v3] Failed to generate recommendation for alert ${alert.id}:`,
        error
      );
    }
  }
}

// --- Orchestrator ---

/**
 * Full V3 alert pipeline: compute -> sync -> generate recommendations.
 * LLM recommendations are fire-and-forget (non-blocking).
 */
export async function computeAndSyncV3Alerts(
  supabase: SupabaseClient,
  agencyId: string,
  month: number,
  year: number,
  agencySettings?: Record<string, unknown>
): Promise<void> {
  // 1. Compute all V3 rules
  const rules = await computeV3Alerts(supabase, agencyId, month, year, agencySettings);

  // 2. Sync to DB (dedup)
  const newAlertIds = await syncV3Alerts(supabase, agencyId, rules);

  // 3. Generate LLM recommendations (fire and forget)
  if (newAlertIds.length > 0) {
    // Non-blocking: don't await
    generateAlertRecommendations(supabase, agencyId, newAlertIds).catch((err) =>
      console.error('[alert-engine-v3] Recommendation generation failed:', err)
    );
  }
}

// --- Lifecycle management ---

/**
 * Mark an alert as read.
 */
export async function markAlertRead(
  supabase: SupabaseClient,
  alertId: string
): Promise<void> {
  await supabase
    .from('alerts')
    .update({ lifecycle: 'read', is_read: true })
    .eq('id', alertId);
}

/**
 * Mark an alert as treated.
 */
export async function markAlertTreated(
  supabase: SupabaseClient,
  alertId: string
): Promise<void> {
  await supabase
    .from('alerts')
    .update({ lifecycle: 'treated', treated_at: new Date().toISOString() })
    .eq('id', alertId);
}

/**
 * Snooze an alert until a given date.
 */
export async function snoozeAlert(
  supabase: SupabaseClient,
  alertId: string,
  until: string
): Promise<void> {
  await supabase
    .from('alerts')
    .update({ lifecycle: 'snoozed', snoozed_until: until })
    .eq('id', alertId);
}

/**
 * Dismiss an alert.
 */
export async function dismissAlert(
  supabase: SupabaseClient,
  alertId: string
): Promise<void> {
  await supabase
    .from('alerts')
    .update({ lifecycle: 'dismissed', is_dismissed: true })
    .eq('id', alertId);
}
