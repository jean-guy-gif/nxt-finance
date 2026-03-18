// ============================================
// NXT Finance V3.5 — Ratio Engine: Temporal
// Séries mensuelles, tendances, saisonnalité et projections
// 100% déterministe — pas de LLM
// ============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TemporalAnalysis,
  TemporalDataPoint,
  MonthlyComparison,
  TrendIndicator,
  SeasonalityIndex,
} from '@/types/models';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute the full temporal analysis for an agency/fiscal year.
 * Gracefully degrades if insufficient history.
 */
export async function computeTemporalAnalysis(
  supabase: SupabaseClient,
  agencyId: string,
  fiscalYear: number
): Promise<TemporalAnalysis> {
  // We need data from fiscalYear-1 Jan to fiscalYear Dec (24 months max)
  const historyStart = `${fiscalYear - 1}-01-01`;
  const historyEnd = `${fiscalYear + 1}-01-01`;

  // Fetch all revenues in the 2-year window
  const { data: revenues } = await supabase
    .from('revenues')
    .select('amount, amount_ht, date, status')
    .eq('agency_id', agencyId)
    .gte('date', historyStart)
    .lt('date', historyEnd)
    .in('status', ['validated', 'collected', 'transmitted']);

  // Fetch all expenses in the 2-year window
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount_ttc, date')
    .eq('agency_id', agencyId)
    .gte('date', historyStart)
    .lt('date', historyEnd);

  const revenueRows = revenues ?? [];
  const expenseRows = expenses ?? [];

  // ================================================================
  // Build monthly buckets
  // ================================================================
  type MonthBucket = { ca: number; charges: number; nb: number };
  const buckets = new Map<string, MonthBucket>();

  // Initialize all 24 months
  for (let y = fiscalYear - 1; y <= fiscalYear; y++) {
    for (let m = 1; m <= 12; m++) {
      buckets.set(`${y}-${m}`, { ca: 0, charges: 0, nb: 0 });
    }
  }

  // Fill revenue data
  for (const r of revenueRows) {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.ca += Number(r.amount_ht ?? r.amount ?? 0);
      bucket.nb++;
    }
  }

  // Fill expense data
  for (const e of expenseRows) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.charges += Number(e.amount_ttc ?? 0);
    }
  }

  // ================================================================
  // a) Monthly series — last 12 months of the fiscal year
  // ================================================================
  const monthlySeries: TemporalDataPoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const bucket = buckets.get(`${fiscalYear}-${m}`);
    if (bucket) {
      monthlySeries.push({
        month: m,
        year: fiscalYear,
        ca: round2(bucket.ca),
        charges: round2(bucket.charges),
        marge: round2(bucket.ca - bucket.charges),
        nb_transactions: bucket.nb,
      });
    }
  }

  // ================================================================
  // b) Monthly comparison N vs N-1
  // ================================================================
  const monthlyComparison: MonthlyComparison[] = [];
  for (let m = 1; m <= 12; m++) {
    const bucketN = buckets.get(`${fiscalYear}-${m}`);
    const bucketN1 = buckets.get(`${fiscalYear - 1}-${m}`);
    if (bucketN && bucketN1 && (bucketN.ca > 0 || bucketN1.ca > 0)) {
      const variationPct = bucketN1.ca > 0
        ? round2(((bucketN.ca - bucketN1.ca) / bucketN1.ca) * 100)
        : (bucketN.ca > 0 ? 100 : 0);
      monthlyComparison.push({
        month: m,
        ca_n: round2(bucketN.ca),
        ca_n1: round2(bucketN1.ca),
        variation_pct: variationPct,
        variation_abs: round2(bucketN.ca - bucketN1.ca),
      });
    }
  }

  // ================================================================
  // c) Seasonality index
  // ================================================================
  // Fetch ALL historical revenues for this agency (all years)
  const { data: allRevenues } = await supabase
    .from('revenues')
    .select('amount_ht, amount, date')
    .eq('agency_id', agencyId)
    .in('status', ['validated', 'collected', 'transmitted']);

  const allRevenueRows = allRevenues ?? [];

  // Monthly totals across all years
  const monthTotals: Record<number, { total: number; count: number }> = {};
  for (let m = 1; m <= 12; m++) {
    monthTotals[m] = { total: 0, count: 0 };
  }

  // Group by (year, month) to count distinct year-months
  const yearMonthSums = new Map<string, number>();
  for (const r of allRevenueRows) {
    const d = new Date(r.date);
    const m = d.getMonth() + 1;
    const key = `${d.getFullYear()}-${m}`;
    yearMonthSums.set(key, (yearMonthSums.get(key) ?? 0) + Number(r.amount_ht ?? r.amount ?? 0));
  }

  // Aggregate by month
  for (const [key, sum] of yearMonthSums) {
    const m = Number(key.split('-')[1]);
    monthTotals[m].total += sum;
    monthTotals[m].count++;
  }

  // Global monthly average
  let totalAllMonths = 0;
  let countAllMonths = 0;
  for (let m = 1; m <= 12; m++) {
    if (monthTotals[m].count > 0) {
      totalAllMonths += monthTotals[m].total;
      countAllMonths += monthTotals[m].count;
    }
  }
  const globalMonthlyAvg = countAllMonths > 0 ? totalAllMonths / countAllMonths : 0;

  const seasonality: SeasonalityIndex[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthAvg = monthTotals[m].count > 0
      ? monthTotals[m].total / monthTotals[m].count
      : 0;
    const index = globalMonthlyAvg > 0 ? round2(monthAvg / globalMonthlyAvg) : 1;

    // Performance vs expected for current fiscal year
    const currentBucket = buckets.get(`${fiscalYear}-${m}`);
    let performanceVsExpected: number | null = null;
    if (currentBucket && currentBucket.ca > 0 && globalMonthlyAvg > 0 && index > 0) {
      const expected = globalMonthlyAvg * index;
      performanceVsExpected = round2((currentBucket.ca / expected) * 100);
    }

    seasonality.push({
      month: m,
      index,
      performance_vs_expected: performanceVsExpected,
    });
  }

  // ================================================================
  // d) 3-month rolling trends
  // ================================================================
  // Find the last 3 months with data in the fiscal year
  const monthsWithData = monthlySeries.filter((p) => p.ca > 0 || p.charges > 0);
  const last3 = monthsWithData.slice(-3);

  let trends: TemporalAnalysis['trends'] = null;

  if (last3.length >= 3) {
    trends = {
      ca: computeTrend(last3.map((p) => p.ca)),
      charges: computeTrend(last3.map((p) => p.charges)),
      marge: computeTrend(last3.map((p) => p.marge)),
      nb_transactions: computeTrend(last3.map((p) => p.nb_transactions)),
    };
  }

  // ================================================================
  // e) End-of-year projection
  // ================================================================
  let projection: TemporalAnalysis['projection'] = null;

  const monthsElapsed = monthsWithData.length;
  if (monthsElapsed > 0) {
    const caCumul = monthlySeries.reduce((sum, p) => sum + p.ca, 0);
    const caProjected = round2((caCumul / monthsElapsed) * 12);
    projection = {
      ca_cumul: round2(caCumul),
      months_elapsed: monthsElapsed,
      ca_projected: caProjected,
    };
  }

  return {
    monthly_series: monthlySeries,
    monthly_comparison: monthlyComparison,
    trends,
    projection,
    seasonality,
  };
}

/**
 * Compute a linear trend indicator from 3 data points.
 * Uses simple first-to-last percentage variation.
 */
function computeTrend(values: number[]): TrendIndicator {
  if (values.length < 2) return { direction: 'stable', variation_pct: 0 };

  const first = values[0];
  const last = values[values.length - 1];

  if (first === 0 && last === 0) return { direction: 'stable', variation_pct: 0 };
  if (first === 0) return { direction: 'up', variation_pct: 100 };

  const pct = round2(((last - first) / Math.abs(first)) * 100);

  let direction: 'up' | 'stable' | 'down' = 'stable';
  if (pct > 5) direction = 'up';
  else if (pct < -5) direction = 'down';

  return { direction, variation_pct: pct };
}
