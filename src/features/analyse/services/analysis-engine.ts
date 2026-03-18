// ============================================
// NXT Finance V3.3 — Analysis Engine
// Orchestration complète du pipeline d'analyse financière
// ============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialAnalysis, FinancialRatio, TemporalAnalysis } from '@/types/models';
import type { AnalysisLevel } from '@/types/enums';
import {
  computeBilanRatios,
  computeBilanRatiosNMinus1,
  computeNxtRatios,
  computeMergedRatios,
  computeHealthScore,
  computeTemporalAnalysis,
  getHealthLabel,
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

  // b) Archive any existing current analysis for this agency+year+level
  await supabase
    .from('financial_analyses')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq('agency_id', agencyId)
    .eq('fiscal_year', fiscalYear)
    .eq('analysis_level', level)
    .eq('is_current', true);

  // c) Insert financial_analyses record
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

  // d) Run core computation (ratios + score + status='ready')
  //    Then fire-and-forget temporal + LLM insights
  try {
    await computeAnalysisCore(
      supabase, job.id, analysisId, agencyId, fiscalYear, balanceSheetId, level
    );
  } catch (err) {
    console.error('[analysis-engine] Core computation failed:', err);
  }

  // e) Fire-and-forget: temporal data + LLM insights
  //    These run AFTER the function returns, so the UI can navigate immediately
  computeAnalysisEnrichments(
    supabase, job.id, analysisId, agencyId, fiscalYear
  ).catch((err) => {
    console.error('[analysis-engine] Enrichments failed:', err);
  });

  // f) Return immediately — analysis is 'ready' with ratios
  return { analysisId, jobId: job.id };
}

// ============================================
// 2. computeAnalysisCore — awaited, must complete before UI navigates
// ============================================

async function computeAnalysisCore(
  supabase: SupabaseClient,
  jobId: string,
  analysisId: string,
  agencyId: string,
  fiscalYear: number,
  balanceSheetId: string | undefined,
  level: AnalysisLevel
): Promise<void> {
  try {
    await startJob(supabase, jobId);
    await updateJobProgress(supabase, jobId, 10);

    const inputHash = buildInputHash(agencyId, fiscalYear, balanceSheetId);
    const now = new Date().toISOString();

    // Bilan ratios (if balanceSheetId)
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

    await updateJobProgress(supabase, jobId, 30);

    // NXT ratios
    const nxtRatios = await computeNxtRatios(supabase, agencyId, fiscalYear);

    await updateJobProgress(supabase, jobId, 50);

    // Merged ratios
    const bilanMap = new Map(bilanRatios.map((r) => [r.key, r.value]));
    const nxtMap = new Map(nxtRatios.map((r) => [r.key, r.value]));
    const mergedRatios = bilanRatios.length > 0
      ? computeMergedRatios(bilanMap, nxtMap)
      : [];

    // Merge all
    const allRawRatios = [
      ...bilanRatios.map((r) => ({ key: r.key, value: r.value, formulaKey: r.formulaKey, source: r.source as 'bilan' | 'nxt' | 'computed' })),
      ...nxtRatios.map((r) => ({ key: r.key, value: r.value, formulaKey: r.formulaKey, source: r.source as 'bilan' | 'nxt' | 'computed' })),
      ...mergedRatios.map((r) => ({ key: r.key, value: r.value, formulaKey: r.formulaKey, source: r.source as 'bilan' | 'nxt' | 'computed' })),
    ];

    const ratioRecords = allRawRatios.map((r) => {
      const benchmark = getBenchmarkForRatio(r.key);
      const status = evaluateRatioStatus(r.key, r.value);
      return {
        analysis_id: analysisId, ratio_key: r.key, value: r.value,
        value_n_minus_1: nMinus1Map.get(r.key) ?? null,
        benchmark_min: benchmark?.healthy_min ?? null, benchmark_max: benchmark?.healthy_max ?? null,
        status, source: r.source, calculation_version: CALCULATION_VERSION,
        computed_at: now, input_hash: inputHash, formula_key: r.formulaKey,
      };
    });

    // Persist ratios
    await supabase.from('financial_ratios').delete().eq('analysis_id', analysisId);
    if (ratioRecords.length > 0) {
      const { error: ratioError } = await supabase.from('financial_ratios').insert(ratioRecords);
      if (ratioError) throw new Error(`Failed to insert ratios: ${ratioError.message}`);
    }

    await updateJobProgress(supabase, jobId, 60);

    // Health score + status='ready' in ONE call
    const { score } = computeHealthScore(
      allRawRatios.map((r) => ({ key: r.key, value: r.value }))
    );

    await supabase.from('financial_analyses').update({
      health_score: score, status: 'ready', updated_at: new Date().toISOString(),
    }).eq('id', analysisId);

    await updateJobProgress(supabase, jobId, 70);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[analysis-engine] Core computation failed for ${analysisId}:`, error);

    // Fail the job
    await failJob(supabase, jobId, errorMessage).catch(() => {
      // Ignore secondary error
    });
  }
}

// ============================================
// 3. computeAnalysisEnrichments — fire-and-forget (temporal + LLM)
// ============================================

async function computeAnalysisEnrichments(
  supabase: SupabaseClient,
  jobId: string,
  analysisId: string,
  agencyId: string,
  fiscalYear: number
): Promise<void> {
  // Fetch the computed ratios + score for LLM context
  const { data: ratioRows } = await supabase
    .from('financial_ratios')
    .select('ratio_key, value, value_n_minus_1, status, source, benchmark_min, benchmark_max')
    .eq('analysis_id', analysisId);

  const { data: analysisRow } = await supabase
    .from('financial_analyses')
    .select('health_score')
    .eq('id', analysisId)
    .single();

  const ratioRecords: RatioRecord[] = (ratioRows ?? []).map((r) => ({
    ratio_key: r.ratio_key,
    value: r.value,
    value_n_minus_1: r.value_n_minus_1,
    status: r.status,
    source: r.source,
    benchmark_min: r.benchmark_min,
    benchmark_max: r.benchmark_max,
  }));

  const score = analysisRow?.health_score ?? 50;

  // a) Temporal analysis
  let temporalData = null;
  try {
    temporalData = await computeTemporalAnalysis(supabase, agencyId, fiscalYear);
    await supabase.from('financial_analyses').update({
      temporal_data: temporalData, updated_at: new Date().toISOString(),
    }).eq('id', analysisId);
  } catch (err) {
    console.warn('[analysis-engine] Temporal analysis failed:', err);
  }

  await updateJobProgress(supabase, jobId, 85).catch(() => {});

  // b) LLM insights
  try {
    await generateInsights(supabase, analysisId, ratioRecords, score, agencyId, fiscalYear, temporalData);
  } catch (err) {
    console.error('[analysis-engine] LLM insights failed:', err instanceof Error ? err.message : err);
  }

  // c) Complete job
  await completeJob(supabase, jobId).catch(() => {});
}

// ============================================
// 4. generateInsights — Phase C refonte dirigeant
// ============================================

interface RatioRecord {
  ratio_key: string;
  value: number;
  value_n_minus_1: number | null;
  status: string;
  source: string;
  benchmark_min?: number | null;
  benchmark_max?: number | null;
}

// French labels for ratio keys (subset used in prompts)
const RATIO_LABELS: Record<string, string> = {
  marge_nette: 'Marge nette',
  marge_brute: 'Marge brute',
  marge_operationnelle_nxt: 'Marge opérationnelle',
  taux_endettement: "Taux d'endettement",
  ratio_liquidite: 'Ratio de liquidité',
  bfr_jours: 'Besoin en fonds de roulement (jours)',
  capacite_autofinancement: "Capacité d'autofinancement",
  resultat_net: 'Résultat net',
  ratio_charges_ca: 'Ratio charges / CA',
  ratio_masse_salariale: 'Ratio masse salariale',
  ca_par_collaborateur: 'CA par collaborateur',
  ca_total_ht: 'CA total HT',
  charges_total_ttc: 'Charges totales',
  taux_recurrence: 'Taux de récurrence',
  concentration_ca_top3: 'Concentration CA top 3 collaborateurs',
  delai_encaissement_moyen: 'Délai encaissement moyen',
  ratio_charges_fixes_ca: 'Ratio charges fixes / CA',
  runway_tresorerie: 'Mois de trésorerie disponibles',
  point_mort_mensuel: 'Point mort mensuel',
  coherence_ca: 'Cohérence CA bilan/NXT',
  couverture_charges_reelles: 'Couverture charges réelles',
};

function formatRatioForPrompt(r: RatioRecord): string {
  const label = RATIO_LABELS[r.ratio_key] ?? r.ratio_key;
  const benchmark = r.benchmark_min != null && r.benchmark_max != null
    ? ` (benchmark sectoriel : ${r.benchmark_min}–${r.benchmark_max})`
    : '';
  return `- ${label} : ${r.value} — statut : ${r.status}${benchmark}`;
}

function formatCurrencySimple(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} M€`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} k€`;
  return `${v.toFixed(0)} €`;
}

async function generateInsights(
  supabase: SupabaseClient,
  analysisId: string,
  ratios: RatioRecord[],
  healthScore: number,
  agencyId: string,
  fiscalYear: number,
  temporalData?: TemporalAnalysis | null
): Promise<void> {
  // Delete existing insights for idempotency
  await supabase
    .from('financial_insights')
    .delete()
    .eq('analysis_id', analysisId);

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

  // Pre-compute key variables for prompts
  const ratioMap = new Map(ratios.map((r) => [r.ratio_key, r]));
  const caHt = ratioMap.get('ca_total_ht')?.value ?? 0;
  const margeOp = ratioMap.get('marge_operationnelle_nxt')?.value;
  const tauxRec = ratioMap.get('taux_recurrence')?.value;
  const trendCa = temporalData?.trends?.ca;
  const projection = temporalData?.projection;
  const healthLabel = getHealthLabel(healthScore).label;

  // Sort ratios by status priority for top strengths/weaknesses
  const healthyRatios = ratios
    .filter((r) => r.status === 'healthy' && RATIO_LABELS[r.ratio_key])
    .slice(0, 3);
  // Critical first, then warning — up to 5 for richer context
  const weakRatios = ratios
    .filter((r) => (r.status === 'critical' || r.status === 'warning') && RATIO_LABELS[r.ratio_key])
    .sort((a, b) => (a.status === 'critical' ? 0 : 1) - (b.status === 'critical' ? 0 : 1))
    .slice(0, 5);
  const criticalRatios = weakRatios.filter((r) => r.status === 'critical');
  const warningRatios = weakRatios.filter((r) => r.status === 'warning');

  // Fetch collaborator count
  const { count: nbCollabs } = await supabase
    .from('collaborators')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('status', 'active');

  // =============================================
  // Q1 — Director summary
  // =============================================
  {
    const topStrength = healthyRatios.length > 0
      ? `${RATIO_LABELS[healthyRatios[0].ratio_key]} = ${healthyRatios[0].value}`
      : 'aucun indicateur au vert';
    const topWeakness = weakRatios.length > 0
      ? `${RATIO_LABELS[weakRatios[0].ratio_key]} = ${weakRatios[0].value}`
      : 'aucun point de vigilance majeur';

    const response = await generateContent(supabase, {
      type: 'director_summary',
      promptVersion: 'v2.0',
      variables: {
        fiscal_year: String(fiscalYear),
        health_score: String(healthScore),
        health_label: healthLabel,
        ca_total_ht: formatCurrencySimple(caHt),
        marge_operationnelle: margeOp != null ? `${margeOp.toFixed(1)}%` : 'non calculée',
        trend_ca: trendCa ? `${trendCa.direction} (${trendCa.variation_pct > 0 ? '+' : ''}${trendCa.variation_pct.toFixed(1)}%)` : 'données insuffisantes',
        projection_ca: projection ? formatCurrencySimple(projection.ca_projected) : 'non disponible',
        taux_recurrence: tauxRec != null ? `${tauxRec.toFixed(1)}%` : 'non calculé',
        nb_collaborateurs: String(nbCollabs ?? 0),
        top_strength: topStrength,
        top_weakness: topWeakness,
      },
      agencyId,
    });

    if (response) {
      await insertInsight(
        'recommendation',
        'director_summary',
        'Synthèse dirigeant',
        response.content,
        ratios.map((r) => r.ratio_key),
        'info',
        response.generationId
      );
    }
  }

  // =============================================
  // Q2 — Strengths
  // =============================================
  if (healthyRatios.length > 0) {
    const ratiosDetail = healthyRatios.map(formatRatioForPrompt).join('\n');
    const response = await generateContent(supabase, {
      type: 'financial_insight',
      promptVersion: 'v2.0-strength',
      variables: {
        fiscal_year: String(fiscalYear),
        ratios_detail: ratiosDetail,
      },
      agencyId,
    });

    if (response) {
      await insertInsight(
        'strength',
        'performance',
        'Points forts',
        response.content,
        healthyRatios.map((r) => r.ratio_key),
        'info',
        response.generationId
      );
    }
  }

  // =============================================
  // Q3 — Weaknesses
  // =============================================
  if (weakRatios.length > 0) {
    const ratiosDetail = weakRatios.map(formatRatioForPrompt).join('\n');
    const response = await generateContent(supabase, {
      type: 'financial_insight',
      promptVersion: 'v2.0-weakness',
      variables: {
        fiscal_year: String(fiscalYear),
        ratios_detail: ratiosDetail,
      },
      agencyId,
    });

    if (response) {
      await insertInsight(
        'weakness',
        'risques',
        'Points de vigilance',
        response.content,
        weakRatios.map((r) => r.ratio_key),
        weakRatios.some((r) => r.status === 'critical') ? 'critical' : 'attention',
        response.generationId
      );
    }
  }

  // =============================================
  // Q4 — Anomalies / Surveillance
  // =============================================
  {
    const signals: string[] = [];

    // Critical ratios = highest priority signals
    for (const r of criticalRatios) {
      signals.push(formatRatioForPrompt(r));
    }

    // Tendances 3 mois en baisse
    if (trendCa?.direction === 'down') {
      signals.push(`- Tendance CA 3 mois : en baisse de ${Math.abs(trendCa.variation_pct).toFixed(1)}%`);
    }
    if (temporalData?.trends?.charges?.direction === 'up') {
      signals.push(`- Tendance charges 3 mois : en hausse de ${temporalData.trends.charges.variation_pct.toFixed(1)}%`);
    }
    if (temporalData?.trends?.marge?.direction === 'down') {
      signals.push(`- Tendance marge 3 mois : en baisse de ${Math.abs(temporalData.trends.marge.variation_pct).toFixed(1)}%`);
    }

    // Seasonal underperformance
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentSeason = temporalData?.seasonality?.find((s) => s.month === currentMonth);
    if (currentSeason?.performance_vs_expected != null && currentSeason.performance_vs_expected < 90) {
      signals.push(`- Sous-performance saisonnière : le mois en cours est à ${currentSeason.performance_vs_expected.toFixed(0)}% de la performance attendue`);
    }

    // Warning ratios
    for (const r of warningRatios) {
      signals.push(`- ${RATIO_LABELS[r.ratio_key] ?? r.ratio_key} : ${r.value} — en zone de vigilance`);
    }

    const signalsDetail = signals.length > 0 ? signals.join('\n') : 'Aucun signal de surveillance détecté.';

    const response = await generateContent(supabase, {
      type: 'financial_insight',
      promptVersion: 'v2.0-anomaly',
      variables: {
        fiscal_year: String(fiscalYear),
        signals_detail: signalsDetail,
      },
      agencyId,
    });

    if (response) {
      await insertInsight(
        'anomaly',
        'surveillance',
        'Points de surveillance',
        response.content,
        weakRatios.map((r) => r.ratio_key),
        criticalRatios.length > 0 ? 'critical' : 'attention',
        response.generationId
      );
    }
  }

  // =============================================
  // Q5 — Recommendations
  // =============================================
  {
    const issues: string[] = [];
    // Include ALL critical and warning ratios for full context
    for (const r of weakRatios) {
      issues.push(formatRatioForPrompt(r));
    }
    // Add trends context
    if (trendCa?.direction === 'down') {
      issues.push(`- Tendance CA en baisse : ${trendCa.variation_pct.toFixed(1)}% sur 3 mois`);
    }
    if (temporalData?.trends?.charges?.direction === 'up') {
      issues.push(`- Charges en hausse : +${temporalData.trends.charges.variation_pct.toFixed(1)}% sur 3 mois`);
    }
    // Add key context even if not in weak (helps LLM give actionable advice)
    const concentration = ratioMap.get('concentration_ca_top3');
    if (concentration && !weakRatios.some((r) => r.ratio_key === 'concentration_ca_top3')) {
      issues.push(`- Concentration CA top 3 : ${concentration.value}% (${concentration.status})`);
    }
    const runway = ratioMap.get('runway_tresorerie');
    if (runway && runway.value < 4) {
      issues.push(`- Runway trésorerie : ${runway.value.toFixed(1)} mois`);
    }

    const issuesDetail = issues.length > 0 ? issues.join('\n') : 'Aucune faiblesse majeure identifiée.';

    const response = await generateContent(supabase, {
      type: 'financial_insight',
      promptVersion: 'v2.0-recommendation',
      variables: {
        fiscal_year: String(fiscalYear),
        issues_detail: issuesDetail,
      },
      agencyId,
    });

    if (response) {
      await insertInsight(
        'recommendation',
        'actions',
        'Actions prioritaires',
        response.content,
        weakRatios.map((r) => r.ratio_key),
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
