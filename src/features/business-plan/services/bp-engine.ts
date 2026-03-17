// ============================================
// NXT Finance V3.6 — Business Plan Projection Engine
// 100% deterministic projections + LLM narrative generation (async)
// ============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BusinessPlan, BpHypothesis, BpProjection } from '@/types/models';
import type { BpScenario } from '@/types/enums';
import { BP_SCENARIOS } from '@/types/enums';
import { BP_SCENARIO_COEFFICIENTS } from '@/lib/constants';
import {
  createJob,
  startJob,
  updateJobProgress,
  completeJob,
  failJob,
} from '@/features/shared/services/job-orchestrator';
import { generateContent } from '@/features/shared/services/llm-gateway';

// ============================================
// Constants
// ============================================

const CALCULATION_VERSION = 'bp_engine_v1.0';
const VALID_REVENUE_STATUSES = ['validated', 'collected', 'transmitted'];
const DEFAULT_CA_GROWTH = 5;
const DEFAULT_CHARGES_GROWTH = 3;
const DEFAULT_INFLATION = 2;
const DEFAULT_MASSE_SALARIALE_GROWTH = 3;

// ============================================
// Internal types
// ============================================

interface BpHypothesisInput {
  scenario: BpScenario;
  level: 'auto' | 'macro' | 'detailed';
  category: string;
  parent_category: string | null;
  label: string;
  value: number;
  value_type: 'percentage' | 'amount' | 'count';
  period_granularity: 'annual' | 'monthly';
  month: number | null;
  sort_order: number;
}

// ============================================
// 1. createBusinessPlan
// ============================================

export async function createBusinessPlan(
  supabase: SupabaseClient,
  agencyId: string,
  targetYear: number,
  analysisId?: string
): Promise<{ planId: string; jobId: string }> {
  // a) Insert business_plans (status: 'draft')
  const now = new Date().toISOString();
  const { data: plan, error: insertError } = await supabase
    .from('business_plans')
    .insert({
      agency_id: agencyId,
      analysis_id: analysisId ?? null,
      target_year: targetYear,
      status: 'draft',
      version_number: 1,
      is_current: true,
      parent_id: null,
      archived_reason: null,
      updated_at: now,
    })
    .select('id')
    .single();

  if (insertError || !plan) {
    throw new Error(`Failed to create business plan: ${insertError?.message}`);
  }

  const planId = plan.id as string;

  // b) Create processing_job (type: 'bp_generation')
  const { job } = await createJob(supabase, {
    agencyId,
    jobType: 'bp_generation',
    relatedType: 'business_plan',
    relatedId: planId,
  });

  // c) Fire and forget
  triggerBpGeneration(
    supabase,
    job.id,
    planId,
    agencyId,
    targetYear,
    analysisId
  ).catch((err) => {
    console.error('[bp-engine] Background generation failed:', err);
  });

  // d) Return
  return { planId, jobId: job.id };
}

// ============================================
// 2. triggerBpGeneration
// ============================================

async function triggerBpGeneration(
  supabase: SupabaseClient,
  jobId: string,
  planId: string,
  agencyId: string,
  targetYear: number,
  analysisId?: string
): Promise<void> {
  try {
    // a) Start job, update plan status to 'computing'
    await startJob(supabase, jobId);
    await supabase
      .from('business_plans')
      .update({ status: 'computing', updated_at: new Date().toISOString() })
      .eq('id', planId);

    // b) Progress 10: generate auto hypotheses → persist for all 3 scenarios
    await updateJobProgress(supabase, jobId, 10);
    const hypotheses = await generateAutoHypotheses(supabase, agencyId, targetYear);

    // Persist hypotheses for all 3 scenarios
    const hypothesisRecords = BP_SCENARIOS.flatMap((scenario) =>
      hypotheses.map((h) => ({
        business_plan_id: planId,
        scenario,
        level: h.level,
        category: h.category,
        parent_category: h.parent_category,
        label: h.label,
        value: h.value,
        value_type: h.value_type,
        period_granularity: h.period_granularity,
        month: h.month,
        is_user_override: false,
        sort_order: h.sort_order,
      }))
    );

    if (hypothesisRecords.length > 0) {
      const { error: hypError } = await supabase
        .from('bp_hypotheses')
        .insert(hypothesisRecords);

      if (hypError) {
        throw new Error(`Failed to insert hypotheses: ${hypError.message}`);
      }
    }

    // c) Progress 40: compute all scenarios → persist projections
    await updateJobProgress(supabase, jobId, 40);

    // Fetch persisted hypotheses to get IDs
    const { data: persistedHypotheses } = await supabase
      .from('bp_hypotheses')
      .select('*')
      .eq('business_plan_id', planId);

    await computeAllScenarios(
      supabase,
      planId,
      (persistedHypotheses ?? []) as BpHypothesis[]
    );

    // d) Progress 70: update plan status to 'ready'
    await updateJobProgress(supabase, jobId, 70);
    await supabase
      .from('business_plans')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', planId);

    // e) Progress 80: generate narratives (LLM, async)
    await updateJobProgress(supabase, jobId, 80);
    await generateNarratives(supabase, planId, agencyId, targetYear);

    // f) Complete job
    await completeJob(supabase, jobId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[bp-engine] Generation failed for plan ${planId}:`, error);

    // Update plan status back to draft on failure
    try {
      await supabase
        .from('business_plans')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('id', planId);
    } catch {
      // Ignore secondary error
    }

    await failJob(supabase, jobId, errorMessage).catch(() => {
      // Ignore secondary error
    });
  }
}

// ============================================
// 3. generateAutoHypotheses
// ============================================

export async function generateAutoHypotheses(
  supabase: SupabaseClient,
  agencyId: string,
  targetYear: number
): Promise<BpHypothesisInput[]> {
  // Find the best reference year: most recent complete year with data
  // Try targetYear-1 first, fallback to targetYear-2, then targetYear-3
  let refYear = targetYear - 1;
  let compYear = targetYear - 2;

  for (let tryYear = targetYear - 1; tryYear >= targetYear - 3; tryYear--) {
    const { count } = await supabase
      .from('revenues')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .gte('date', `${tryYear}-01-01`)
      .lte('date', `${tryYear}-12-31`)
      .in('status', VALID_REVENUE_STATUSES);

    if ((count ?? 0) >= 12) { // At least 12 revenues = likely a full year
      refYear = tryYear;
      compYear = tryYear - 1;
      break;
    }
  }

  // a) Fetch revenues for reference year (N-1 or best available)
  const { data: revenuesN1 } = await supabase
    .from('revenues')
    .select('amount_ht, amount, date, type')
    .eq('agency_id', agencyId)
    .gte('date', `${refYear}-01-01`)
    .lte('date', `${refYear}-12-31`)
    .in('status', VALID_REVENUE_STATUSES);

  // Fetch revenues for comparison year (N-2 or refYear-1)
  const { data: revenuesN2 } = await supabase
    .from('revenues')
    .select('amount_ht, amount, date, type')
    .eq('agency_id', agencyId)
    .gte('date', `${compYear}-01-01`)
    .lte('date', `${compYear}-12-31`)
    .in('status', VALID_REVENUE_STATUSES);

  // Fetch expenses for reference year
  const { data: expensesN1 } = await supabase
    .from('expenses')
    .select('amount_ttc, date')
    .eq('agency_id', agencyId)
    .gte('date', `${refYear}-01-01`)
    .lte('date', `${refYear}-12-31`);

  // Fetch expenses for comparison year
  const { data: expensesN2 } = await supabase
    .from('expenses')
    .select('amount_ttc, date')
    .eq('agency_id', agencyId)
    .gte('date', `${compYear}-01-01`)
    .lte('date', `${compYear}-12-31`);

  const revenues1 = revenuesN1 ?? [];
  const revenues2 = revenuesN2 ?? [];
  const expenses1 = expensesN1 ?? [];
  const expenses2 = expensesN2 ?? [];

  // b) Calculate CA growth rate
  const annualCA_N1 = revenues1.reduce(
    (sum, r) => sum + Number(r.amount_ht ?? r.amount ?? 0),
    0
  );
  const annualCA_N2 = revenues2.reduce(
    (sum, r) => sum + Number(r.amount_ht ?? r.amount ?? 0),
    0
  );

  const caGrowthRate =
    annualCA_N2 > 0
      ? Math.round(((annualCA_N1 - annualCA_N2) / annualCA_N2) * 10000) / 100
      : DEFAULT_CA_GROWTH;

  // Charges growth rate
  const annualCharges_N1 = expenses1.reduce(
    (sum, e) => sum + Number(e.amount_ttc ?? 0),
    0
  );
  const annualCharges_N2 = expenses2.reduce(
    (sum, e) => sum + Number(e.amount_ttc ?? 0),
    0
  );

  const chargesGrowthRate =
    annualCharges_N2 > 0
      ? Math.round(((annualCharges_N1 - annualCharges_N2) / annualCharges_N2) * 10000) / 100
      : DEFAULT_CHARGES_GROWTH;

  // Seasonality: monthly CA distribution as % of annual
  const monthlyCA = Array(12).fill(0) as number[];
  revenues1.forEach((r) => {
    const month = new Date(r.date).getMonth(); // 0-11
    monthlyCA[month] += Number(r.amount_ht ?? r.amount ?? 0);
  });
  const annualCA = monthlyCA.reduce((s, v) => s + v, 0);
  const seasonality = monthlyCA.map((v) =>
    annualCA > 0 ? Math.round((v / annualCA) * 10000) / 10000 : 1 / 12
  );

  // Revenue type mix (proportional to historical)
  const byType = new Map<string, number>();
  revenues1.forEach((r) => {
    const type = r.type as string;
    byType.set(type, (byType.get(type) ?? 0) + Number(r.amount_ht ?? r.amount ?? 0));
  });

  // c) Generate hypotheses
  const hypotheses: BpHypothesisInput[] = [];
  let sortOrder = 0;

  // MACRO level hypotheses
  hypotheses.push({
    scenario: 'realistic',
    level: 'macro',
    category: 'ca_global',
    parent_category: null,
    label: 'Croissance CA global',
    value: caGrowthRate,
    value_type: 'percentage',
    period_granularity: 'annual',
    month: null,
    sort_order: sortOrder++,
  });

  hypotheses.push({
    scenario: 'realistic',
    level: 'macro',
    category: 'charges_global',
    parent_category: null,
    label: 'Croissance charges globales',
    value: chargesGrowthRate,
    value_type: 'percentage',
    period_granularity: 'annual',
    month: null,
    sort_order: sortOrder++,
  });

  hypotheses.push({
    scenario: 'realistic',
    level: 'macro',
    category: 'inflation',
    parent_category: null,
    label: 'Taux d\'inflation',
    value: DEFAULT_INFLATION,
    value_type: 'percentage',
    period_granularity: 'annual',
    month: null,
    sort_order: sortOrder++,
  });

  hypotheses.push({
    scenario: 'realistic',
    level: 'macro',
    category: 'masse_salariale',
    parent_category: null,
    label: 'Croissance masse salariale',
    value: DEFAULT_MASSE_SALARIALE_GROWTH,
    value_type: 'percentage',
    period_granularity: 'annual',
    month: null,
    sort_order: sortOrder++,
  });

  // DETAILED level: revenue type breakdown (proportional to historical mix)
  const revenueTypes: Array<{ category: string; label: string }> = [
    { category: 'ca_transaction', label: 'Honoraires de transaction' },
    { category: 'ca_gestion', label: 'Honoraires de gestion' },
    { category: 'ca_location', label: 'Honoraires de location' },
  ];

  const typeMapping: Record<string, string> = {
    ca_transaction: 'honoraires_transaction',
    ca_gestion: 'honoraires_gestion',
    ca_location: 'honoraires_location',
  };

  for (const rt of revenueTypes) {
    const dbType = typeMapping[rt.category];
    const typeAmount = byType.get(dbType) ?? 0;
    const proportion =
      annualCA > 0
        ? Math.round((typeAmount / annualCA) * 10000) / 100
        : Math.round(10000 / revenueTypes.length) / 100;

    hypotheses.push({
      scenario: 'realistic',
      level: 'detailed',
      category: rt.category,
      parent_category: 'ca_global',
      label: rt.label,
      value: proportion,
      value_type: 'percentage',
      period_granularity: 'annual',
      month: null,
      sort_order: sortOrder++,
    });
  }

  // Seasonality hypotheses (monthly)
  for (let m = 0; m < 12; m++) {
    hypotheses.push({
      scenario: 'realistic',
      level: 'auto',
      category: 'seasonality',
      parent_category: 'ca_global',
      label: `Saisonnalité mois ${m + 1}`,
      value: Math.round(seasonality[m] * 10000) / 100, // stored as percentage
      value_type: 'percentage',
      period_granularity: 'monthly',
      month: m + 1,
      sort_order: sortOrder++,
    });
  }

  return hypotheses;
}

// ============================================
// 4. computeProjections
// ============================================

async function computeProjections(
  supabase: SupabaseClient,
  planId: string,
  scenario: BpScenario,
  hypotheses: BpHypothesis[]
): Promise<void> {
  // Get plan to find target year
  const { data: plan } = await supabase
    .from('business_plans')
    .select('target_year, agency_id')
    .eq('id', planId)
    .single();

  if (!plan) throw new Error(`Business plan ${planId} not found`);

  const targetYear = plan.target_year as number;
  const agencyId = plan.agency_id as string;

  // Filter hypotheses for this scenario
  const scenarioHyp = hypotheses.filter((h) => h.scenario === scenario);

  // Extract key growth rates
  const caGrowth =
    scenarioHyp.find((h) => h.category === 'ca_global')?.value ?? DEFAULT_CA_GROWTH;
  const chargesGrowth =
    scenarioHyp.find((h) => h.category === 'charges_global')?.value ?? DEFAULT_CHARGES_GROWTH;

  // Seasonality factors (from hypotheses or default uniform)
  const seasonalityHyp = scenarioHyp.filter(
    (h) => h.category === 'seasonality' && h.month !== null
  );
  const seasonality = Array(12).fill(1 / 12) as number[];
  for (const sh of seasonalityHyp) {
    if (sh.month !== null && sh.month >= 1 && sh.month <= 12) {
      seasonality[sh.month - 1] = sh.value / 100; // convert from percentage
    }
  }

  // Apply scenario coefficient to GROWTH RATE, not base
  const coefficient = BP_SCENARIO_COEFFICIENTS[scenario];
  const effectiveCaGrowth = caGrowth * coefficient;
  const effectiveChargesGrowth = chargesGrowth * coefficient;

  // Find best reference year for historical data (same logic as generateAutoHypotheses)
  let histRefYear = targetYear - 1;
  for (let tryYear = targetYear - 1; tryYear >= targetYear - 3; tryYear--) {
    const { count } = await supabase
      .from('revenues')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .gte('date', `${tryYear}-01-01`)
      .lte('date', `${tryYear}-12-31`)
      .in('status', VALID_REVENUE_STATUSES);
    if ((count ?? 0) >= 12) { histRefYear = tryYear; break; }
  }

  // Fetch historical monthly data from best reference year
  const { data: histRevenues } = await supabase
    .from('revenues')
    .select('amount_ht, amount, date')
    .eq('agency_id', agencyId)
    .gte('date', `${histRefYear}-01-01`)
    .lte('date', `${histRefYear}-12-31`)
    .in('status', VALID_REVENUE_STATUSES);

  const { data: histExpenses } = await supabase
    .from('expenses')
    .select('amount_ttc, date')
    .eq('agency_id', agencyId)
    .gte('date', `${histRefYear}-01-01`)
    .lte('date', `${histRefYear}-12-31`);

  // Group historical revenue by month
  const monthlyRevenue = Array(12).fill(0) as number[];
  (histRevenues ?? []).forEach((r) => {
    const month = new Date(r.date).getMonth();
    monthlyRevenue[month] += Number(r.amount_ht ?? r.amount ?? 0);
  });

  // Group historical expenses by month
  const monthlyExpenses = Array(12).fill(0) as number[];
  (histExpenses ?? []).forEach((e) => {
    const month = new Date(e.date).getMonth();
    monthlyExpenses[month] += Number(e.amount_ttc ?? 0);
  });

  // Annual totals for seasonality-based projection
  const annualRevenue = monthlyRevenue.reduce((s, v) => s + v, 0);
  const annualExpenses = monthlyExpenses.reduce((s, v) => s + v, 0);

  // Build 12 monthly projections
  const now = new Date().toISOString();
  const projections: Array<Omit<BpProjection, 'id' | 'created_at' | 'updated_at'>> = [];
  let cumulativeTreasury = 0;

  for (let m = 0; m < 12; m++) {
    // Base monthly values from historical data
    const baseRevenue = annualRevenue > 0
      ? annualRevenue * seasonality[m]
      : monthlyRevenue[m];
    const baseExpenses = annualExpenses > 0
      ? annualExpenses / 12
      : monthlyExpenses[m];

    // Apply growth rates
    const revenueProjected = Math.round(
      baseRevenue * (1 + effectiveCaGrowth / 100) * 100
    ) / 100;
    const expensesProjected = Math.round(
      baseExpenses * (1 + effectiveChargesGrowth / 100) * 100
    ) / 100;

    const marginProjected = Math.round((revenueProjected - expensesProjected) * 100) / 100;
    cumulativeTreasury = Math.round((cumulativeTreasury + marginProjected) * 100) / 100;

    projections.push({
      business_plan_id: planId,
      scenario,
      month: m + 1,
      revenue_projected: revenueProjected,
      expenses_projected: expensesProjected,
      margin_projected: marginProjected,
      treasury_projected: cumulativeTreasury,
      details_json: {
        base_revenue: baseRevenue,
        base_expenses: baseExpenses,
        effective_ca_growth: effectiveCaGrowth,
        effective_charges_growth: effectiveChargesGrowth,
        seasonality_factor: seasonality[m],
        scenario_coefficient: coefficient,
      },
      calculation_version: CALCULATION_VERSION,
      computed_at: now,
      input_hash: JSON.stringify({
        planId,
        scenario,
        month: m + 1,
        caGrowth: effectiveCaGrowth,
        chargesGrowth: effectiveChargesGrowth,
        timestamp: Date.now(),
      }),
    });
  }

  // Delete existing projections for (planId, scenario)
  await supabase
    .from('bp_projections')
    .delete()
    .eq('business_plan_id', planId)
    .eq('scenario', scenario);

  // Insert 12 rows
  if (projections.length > 0) {
    const { error: projError } = await supabase
      .from('bp_projections')
      .insert(projections);

    if (projError) {
      throw new Error(`Failed to insert projections: ${projError.message}`);
    }
  }
}

// ============================================
// 5. computeAllScenarios
// ============================================

async function computeAllScenarios(
  supabase: SupabaseClient,
  planId: string,
  hypotheses: BpHypothesis[]
): Promise<void> {
  for (const scenario of BP_SCENARIOS) {
    await computeProjections(supabase, planId, scenario, hypotheses);
  }
}

// ============================================
// 6. updateHypothesis
// ============================================

export async function updateHypothesis(
  supabase: SupabaseClient,
  hypothesisId: string,
  value: number
): Promise<BpHypothesis> {
  const { data, error } = await supabase
    .from('bp_hypotheses')
    .update({
      value,
      is_user_override: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', hypothesisId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update hypothesis: ${error?.message}`);
  }

  return data as BpHypothesis;
}

// ============================================
// 7. fetchBusinessPlans
// ============================================

export async function fetchBusinessPlans(
  supabase: SupabaseClient,
  agencyId: string
): Promise<BusinessPlan[]> {
  const { data, error } = await supabase
    .from('business_plans')
    .select('*')
    .eq('agency_id', agencyId)
    .order('target_year', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data as BusinessPlan[];
}

// ============================================
// 8. fetchBusinessPlan
// ============================================

export async function fetchBusinessPlan(
  supabase: SupabaseClient,
  planId: string
): Promise<BusinessPlan | null> {
  const { data } = await supabase
    .from('business_plans')
    .select(
      '*, hypotheses:bp_hypotheses(*), projections:bp_projections(*), narratives:bp_narratives(*)'
    )
    .eq('id', planId)
    .maybeSingle();

  return (data as BusinessPlan) ?? null;
}

// ============================================
// Private: generateNarratives
// ============================================

async function generateNarratives(
  supabase: SupabaseClient,
  planId: string,
  agencyId: string,
  targetYear: number
): Promise<void> {
  // Delete existing narratives for idempotency
  await supabase
    .from('bp_narratives')
    .delete()
    .eq('business_plan_id', planId);

  // Fetch realistic projections for context
  const { data: projections } = await supabase
    .from('bp_projections')
    .select('*')
    .eq('business_plan_id', planId)
    .eq('scenario', 'realistic')
    .order('month', { ascending: true });

  const projRows = (projections ?? []) as BpProjection[];

  const totalRevenue = projRows.reduce((s, p) => s + p.revenue_projected, 0);
  const totalExpenses = projRows.reduce((s, p) => s + p.expenses_projected, 0);
  const totalMargin = totalRevenue - totalExpenses;
  const finalTreasury = projRows.length > 0
    ? projRows[projRows.length - 1].treasury_projected
    : 0;

  const projectionsSummary = projRows
    .map(
      (p) =>
        `M${p.month}: CA=${Math.round(p.revenue_projected)}€, Charges=${Math.round(p.expenses_projected)}€, Marge=${Math.round(p.margin_projected)}€`
    )
    .join('; ');

  // Generate 3 narrative sections
  const sections: Array<{ section: string; label: string }> = [
    { section: 'executive_summary', label: 'Synthèse exécutive' },
    { section: 'growth_drivers', label: 'Leviers de croissance' },
    { section: 'risk_factors', label: 'Facteurs de risque' },
  ];

  for (const { section, label } of sections) {
    try {
      const response = await generateContent(supabase, {
        type: 'bp_narrative',
        variables: {
          section,
          section_label: label,
          target_year: String(targetYear),
          total_revenue: String(Math.round(totalRevenue)),
          total_expenses: String(Math.round(totalExpenses)),
          total_margin: String(Math.round(totalMargin)),
          final_treasury: String(Math.round(finalTreasury)),
          projections_summary: projectionsSummary,
        },
        agencyId,
      });

      if (response) {
        await supabase.from('bp_narratives').insert({
          business_plan_id: planId,
          scenario: 'realistic' as BpScenario,
          section,
          content: response.content,
          llm_generation_id: response.generationId,
        });
      }
    } catch (err) {
      // Graceful degradation: log and continue
      console.error(
        `[bp-engine] Failed to generate narrative "${section}" for plan ${planId}:`,
        err
      );
    }
  }
}
