// ============================================
// NXT Finance V3.3 — Analysis Engine
// Orchestration complète du pipeline d'analyse financière
// ============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialAnalysis, FinancialRatio } from '@/types/models';
import type { AnalysisLevel } from '@/types/enums';
import {
  computeBilanRatios,
  computeBilanRatiosNMinus1,
  computeNxtRatios,
  computeMergedRatios,
  computeHealthScore,
  computeTemporalAnalysis,
} from './ratio-engine';
import {
  createJob,
  startJob,
  updateJobProgress,
  completeJob,
  failJob,
} from '@/features/shared/services/job-orchestrator';
import { generateContent } from '@/features/shared/services/llm-gateway';
import {
  getBenchmarkForRatio,
  evaluateRatioStatus,
} from '@/lib/registries';

// ============================================
// Constants
// ============================================

const CALCULATION_VERSION = 'ratio_engine_v1.0';

// ============================================
// Input hash (trace key, not crypto)
// ============================================

function buildInputHash(
  agencyId: string,
  fiscalYear: number,
  balanceSheetId?: string
): string {
  return JSON.stringify({
    agencyId,
    fiscalYear,
    balanceSheetId: balanceSheetId ?? null,
    timestamp: Date.now(),
  });
}

// ============================================
// 1. createAnalysis
// ============================================

export async function createAnalysis(
  supabase: SupabaseClient,
  agencyId: string,
  fiscalYear: number,
  balanceSheetId?: string
): Promise<{ analysisId: string; jobId: string }> {
  // a) Determine analysis_level
  let level: AnalysisLevel = 'basic';

  if (balanceSheetId) {
    const { data: bs } = await supabase
      .from('balance_sheets')
      .select('status')
      .eq('id', balanceSheetId)
      .single();

    level = bs?.status === 'validated' ? 'complete' : 'enriched';
  }

  // b) Insert financial_analyses record
  const now = new Date().toISOString();
  const { data: analysis, error: insertError } = await supabase
    .from('financial_analyses')
    .insert({
      agency_id: agencyId,
      balance_sheet_id: balanceSheetId ?? null,
      fiscal_year: fiscalYear,
      analysis_level: level,
      status: 'computing',
      health_score: null,
      version_number: 1,
      is_current: true,
      parent_id: null,
      archived_reason: null,
      updated_at: now,
    })
    .select('id')
    .single();

  if (insertError || !analysis) {
    throw new Error(`Failed to create analysis: ${insertError?.message}`);
  }

  const analysisId = analysis.id as string;

  // c) Create processing_job
  const { job } = await createJob(supabase, {
    agencyId,
    jobType: 'analysis_generation',
    relatedType: 'financial_analysis',
    relatedId: analysisId,
  });

  // d) Fire and forget
  triggerAnalysisComputation(
    supabase,
    job.id,
    analysisId,
    agencyId,
    fiscalYear,
    balanceSheetId,
    level
  ).catch((err) => {
    console.error('[analysis-engine] Background computation failed:', err);
  });

  // e) Return
  return { analysisId, jobId: job.id };
}

// ============================================
// 2. triggerAnalysisComputation
// ============================================

async function triggerAnalysisComputation(
  supabase: SupabaseClient,
  jobId: string,
  analysisId: string,
  agencyId: string,
  fiscalYear: number,
  balanceSheetId: string | undefined,
  level: AnalysisLevel
): Promise<void> {
  try {
    // a) Start job
    await startJob(supabase, jobId);
    // b) Progress 10%
    await updateJobProgress(supabase, jobId, 10);

    const inputHash = buildInputHash(agencyId, fiscalYear, balanceSheetId);
    const now = new Date().toISOString();

    // c) Compute bilan ratios (if balanceSheetId)
    let bilanRatios: { key: string; value: number; formulaKey: string; source: 'bilan' }[] = [];
    let nMinus1Map = new Map<string, number>();

    if (balanceSheetId) {
      const { data: bs } = await supabase
        .from('balance_sheets')
        .select('*, items:balance_sheet_items(*)')
        .eq('id', balanceSheetId)
        .single();

      if (bs?.items) {
        bilanRatios = computeBilanRatios(bs.items);
        nMinus1Map = computeBilanRatiosNMinus1(bs.items);
      }
    }

    // d) Progress 30%
    await updateJobProgress(supabase, jobId, 30);

    // e) Compute NXT ratios
    const nxtRatios = await computeNxtRatios(supabase, agencyId, fiscalYear);

    // f) Progress 50%
    await updateJobProgress(supabase, jobId, 50);

    // g) Compute merged (cross-source) ratios if bilan exists
    const bilanMap = new Map(bilanRatios.map((r) => [r.key, r.value]));
    const nxtMap = new Map(nxtRatios.map((r) => [r.key, r.value]));
    const mergedRatios = bilanRatios.length > 0
      ? computeMergedRatios(bilanMap, nxtMap)
      : [];

    // h) Merge all ratios, evaluate against benchmarks
    const allRawRatios = [
      ...bilanRatios.map((r) => ({
        key: r.key,
        value: r.value,
        formulaKey: r.formulaKey,
        source: r.source as 'bilan' | 'nxt' | 'computed',
      })),
      ...nxtRatios.map((r) => ({
        key: r.key,
        value: r.value,
        formulaKey: r.formulaKey,
        source: r.source as 'bilan' | 'nxt' | 'computed',
      })),
      ...mergedRatios.map((r) => ({
        key: r.key,
        value: r.value,
        formulaKey: r.formulaKey,
        source: r.source as 'bilan' | 'nxt' | 'computed',
      })),
    ];

    const ratioRecords = allRawRatios.map((r) => {
      const benchmark = getBenchmarkForRatio(r.key);
      const status = evaluateRatioStatus(r.key, r.value);

      return {
        analysis_id: analysisId,
        ratio_key: r.key,
        value: r.value,
        value_n_minus_1: nMinus1Map.get(r.key) ?? null,
        benchmark_min: benchmark?.healthy_min ?? null,
        benchmark_max: benchmark?.healthy_max ?? null,
        status,
        source: r.source,
        calculation_version: CALCULATION_VERSION,
        computed_at: now,
        input_hash: inputHash,
        formula_key: r.formulaKey,
      };
    });

    // h) Persist ratios (delete existing first for idempotency)
    await supabase
      .from('financial_ratios')
      .delete()
      .eq('analysis_id', analysisId);

    if (ratioRecords.length > 0) {
      const { error: ratioError } = await supabase
        .from('financial_ratios')
        .insert(ratioRecords);

      if (ratioError) {
        throw new Error(`Failed to insert ratios: ${ratioError.message}`);
      }
    }

    // i) Progress 60%
    await updateJobProgress(supabase, jobId, 60);

    // j) Compute health score
    const { score } = computeHealthScore(
      allRawRatios.map((r) => ({ key: r.key, value: r.value }))
    );

    await supabase
      .from('financial_analyses')
      .update({
        health_score: score,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId);

    // k) Compute temporal analysis (non-blocking — graceful degradation)
    let temporalData = null;
    try {
      temporalData = await computeTemporalAnalysis(supabase, agencyId, fiscalYear);
    } catch (err) {
      console.warn('[analysis-engine] Temporal analysis failed, skipping:', err);
    }

    // l) Update analysis status to 'ready' + persist temporal data
    await supabase
      .from('financial_analyses')
      .update({
        status: 'ready',
        temporal_data: temporalData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId);

    // l) Progress 70%
    await updateJobProgress(supabase, jobId, 70);

    // m) Generate LLM insights (async, non-blocking for analysis status)
    await generateInsights(
      supabase,
      analysisId,
      ratioRecords,
      score,
      agencyId,
      fiscalYear
    );

    // n) Complete job
    await completeJob(supabase, jobId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[analysis-engine] Computation failed for analysis ${analysisId}:`, error);

    // Fail the job
    await failJob(supabase, jobId, errorMessage).catch(() => {
      // Ignore secondary error
    });
  }
}

// ============================================
// 3. generateInsights
// ============================================

interface RatioRecord {
  ratio_key: string;
  value: number;
  value_n_minus_1: number | null;
  status: string;
  source: string;
}

async function generateInsights(
  supabase: SupabaseClient,
  analysisId: string,
  ratios: RatioRecord[],
  healthScore: number,
  agencyId: string,
  fiscalYear: number
): Promise<void> {
  // Delete existing insights for idempotency
  await supabase
    .from('financial_insights')
    .delete()
    .eq('analysis_id', analysisId);

  const hasComparison = ratios.some((r) => r.value_n_minus_1 !== null);

  // Helper to format ratios for LLM prompt
  const formatRatios = (subset: RatioRecord[]): string =>
    subset
      .map((r) => `${r.ratio_key}: ${r.value} (${r.status})`)
      .join(', ');

  // Helper to insert insight
  const insertInsight = async (
    insightType: 'strength' | 'weakness' | 'anomaly' | 'recommendation',
    category: string,
    title: string,
    content: string,
    relatedRatios: string[],
    severity: 'info' | 'attention' | 'critical',
    generationId: string | null
  ): Promise<void> => {
    await supabase.from('financial_insights').insert({
      analysis_id: analysisId,
      insight_type: insightType,
      category,
      title,
      content,
      related_ratios: relatedRatios,
      severity,
      llm_generation_id: generationId,
    });
  };

  // a) Strength: top 3 healthy ratios
  const healthyRatios = ratios.filter((r) => r.status === 'healthy').slice(0, 3);
  if (healthyRatios.length > 0) {
    const response = await generateContent(supabase, {
      type: 'financial_insight',
      variables: {
        ratios_summary: formatRatios(healthyRatios),
        fiscal_year: String(fiscalYear),
        analysis_level: 'complete',
        has_comparison: String(hasComparison),
        insight_type: 'strength',
        category: 'rentabilité',
      },
      agencyId,
    });

    if (response) {
      await insertInsight(
        'strength',
        'rentabilité',
        'Points forts identifiés',
        response.content,
        healthyRatios.map((r) => r.ratio_key),
        'info',
        response.generationId
      );
    }
  }

  // b) Weakness: top 3 critical/warning ratios
  const weakRatios = ratios
    .filter((r) => r.status === 'critical' || r.status === 'warning')
    .slice(0, 3);

  if (weakRatios.length > 0) {
    const response = await generateContent(supabase, {
      type: 'financial_insight',
      variables: {
        ratios_summary: formatRatios(weakRatios),
        fiscal_year: String(fiscalYear),
        analysis_level: 'complete',
        has_comparison: String(hasComparison),
        insight_type: 'weakness',
        category: 'structure',
      },
      agencyId,
    });

    if (response) {
      await insertInsight(
        'weakness',
        'structure',
        'Points de vigilance',
        response.content,
        weakRatios.map((r) => r.ratio_key),
        weakRatios.some((r) => r.status === 'critical') ? 'critical' : 'attention',
        response.generationId
      );
    }
  }

  // c) Anomaly: ratios with >20% change from N-1
  const anomalyRatios = ratios.filter((r) => {
    if (r.value_n_minus_1 === null || r.value_n_minus_1 === 0) return false;
    return Math.abs(r.value - r.value_n_minus_1) / Math.abs(r.value_n_minus_1) > 0.2;
  });

  if (anomalyRatios.length > 0) {
    const response = await generateContent(supabase, {
      type: 'financial_insight',
      variables: {
        ratios_summary: anomalyRatios
          .map(
            (r) =>
              `${r.ratio_key}: ${r.value} (N-1: ${r.value_n_minus_1}, variation: ${
                r.value_n_minus_1 !== null && r.value_n_minus_1 !== 0
                  ? Math.round(((r.value - r.value_n_minus_1) / Math.abs(r.value_n_minus_1)) * 100)
                  : 'N/A'
              }%)`
          )
          .join(', '),
        fiscal_year: String(fiscalYear),
        analysis_level: 'complete',
        has_comparison: 'true',
        insight_type: 'anomaly',
        category: 'évolution',
      },
      agencyId,
    });

    if (response) {
      await insertInsight(
        'anomaly',
        'évolution',
        'Variations significatives détectées',
        response.content,
        anomalyRatios.map((r) => r.ratio_key),
        'attention',
        response.generationId
      );
    }
  }

  // d) Recommendation: based on weakest category
  const weakestCategory = weakRatios.length > 0
    ? weakRatios[0].ratio_key
    : 'general';

  {
    const response = await generateContent(supabase, {
      type: 'financial_insight',
      variables: {
        ratios_summary: formatRatios(ratios.slice(0, 5)),
        fiscal_year: String(fiscalYear),
        analysis_level: 'complete',
        has_comparison: String(hasComparison),
        insight_type: 'recommendation',
        category: weakestCategory,
      },
      agencyId,
    });

    if (response) {
      await insertInsight(
        'recommendation',
        weakestCategory,
        'Recommandations',
        response.content,
        weakRatios.map((r) => r.ratio_key),
        'info',
        response.generationId
      );
    }
  }

  // e) Director summary
  {
    const allSummary = ratios
      .map((r) => `${r.ratio_key}: ${r.value} (${r.status})`)
      .join(', ');

    const response = await generateContent(supabase, {
      type: 'director_summary',
      variables: {
        ratios_summary: allSummary,
        health_score: String(healthScore),
        fiscal_year: String(fiscalYear),
        analysis_level: 'complete',
        has_comparison: String(hasComparison),
      },
      agencyId,
    });

    if (response) {
      await insertInsight(
        'recommendation',
        'synthèse',
        'Synthèse dirigeant',
        response.content,
        ratios.map((r) => r.ratio_key),
        'info',
        response.generationId
      );
    }
  }
}

// ============================================
// 4. fetchAnalyses
// ============================================

export async function fetchAnalyses(
  supabase: SupabaseClient,
  agencyId: string,
  fiscalYear?: number
): Promise<FinancialAnalysis[]> {
  let query = supabase
    .from('financial_analyses')
    .select('*')
    .eq('agency_id', agencyId)
    .order('fiscal_year', { ascending: false })
    .order('created_at', { ascending: false });

  if (fiscalYear !== undefined) {
    query = query.eq('fiscal_year', fiscalYear);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data as FinancialAnalysis[];
}

// ============================================
// 5. fetchAnalysis
// ============================================

export async function fetchAnalysis(
  supabase: SupabaseClient,
  analysisId: string
): Promise<FinancialAnalysis | null> {
  const { data } = await supabase
    .from('financial_analyses')
    .select('*, ratios:financial_ratios(*), insights:financial_insights(*)')
    .eq('id', analysisId)
    .maybeSingle();

  return (data as FinancialAnalysis) ?? null;
}

// ============================================
// 6. archiveAnalysis
// ============================================

export async function archiveAnalysis(
  supabase: SupabaseClient,
  analysisId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('financial_analyses')
    .update({
      is_current: false,
      status: 'archived',
      archived_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', analysisId);

  if (error) throw error;
}
