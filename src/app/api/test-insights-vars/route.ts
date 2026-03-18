import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ---- Duplicated from analysis-engine.ts to avoid import side-effects ----

interface RatioRecord {
  ratio_key: string;
  value: number;
  value_n_minus_1: number | null;
  status: string;
  source: string;
  benchmark_min?: number | null;
  benchmark_max?: number | null;
}

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
  const benchmark =
    r.benchmark_min != null && r.benchmark_max != null
      ? ` (benchmark sectoriel : ${r.benchmark_min}–${r.benchmark_max})`
      : '';
  return `- ${label} : ${r.value} — statut : ${r.status}${benchmark}`;
}

function formatCurrencySimple(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} M€`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} k€`;
  return `${v.toFixed(0)} €`;
}

function getHealthLabel(score: number): { label: string } {
  if (score >= 80) return { label: 'Excellente santé financière' };
  if (score >= 60) return { label: 'Bonne santé, points de vigilance' };
  if (score >= 40) return { label: 'Santé fragile, actions nécessaires' };
  return { label: 'Situation critique' };
}

// ---- Route handler ----

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing SUPABASE_URL or SERVICE_ROLE_KEY' }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey);

  // 1. Find demo agency
  const { data: demoAgency, error: agencyErr } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('is_demo', true)
    .limit(1)
    .single();

  if (agencyErr || !demoAgency) {
    return NextResponse.json({
      error: 'Demo agency not found',
      detail: agencyErr?.message,
    }, { status: 404 });
  }

  // 2. Get latest analysis for this agency
  const { data: analysis, error: analysisErr } = await supabase
    .from('financial_analyses')
    .select('id, fiscal_year, health_score, temporal_data, status, created_at')
    .eq('agency_id', demoAgency.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (analysisErr || !analysis) {
    return NextResponse.json({
      error: 'No analysis found for demo agency',
      agency: demoAgency,
      detail: analysisErr?.message,
    }, { status: 404 });
  }

  // 3. Fetch all financial_ratios for this analysis
  const { data: ratioRows, error: ratioErr } = await supabase
    .from('financial_ratios')
    .select('ratio_key, value, value_n_minus_1, status, source, benchmark_min, benchmark_max')
    .eq('analysis_id', analysis.id);

  if (ratioErr) {
    return NextResponse.json({
      error: 'Failed to fetch ratios',
      detail: ratioErr.message,
    }, { status: 500 });
  }

  const ratios: RatioRecord[] = (ratioRows ?? []) as RatioRecord[];
  const healthScore = analysis.health_score ?? 0;
  const fiscalYear = analysis.fiscal_year;
  const temporalData = analysis.temporal_data as Record<string, unknown> | null;

  // ---- Reproduce exactly the same logic as generateInsights ----

  const ratioMap = new Map(ratios.map((r) => [r.ratio_key, r]));
  const caHt = ratioMap.get('ca_total_ht')?.value ?? 0;
  const margeOp = ratioMap.get('marge_operationnelle_nxt')?.value;
  const tauxRec = ratioMap.get('taux_recurrence')?.value;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trends = (temporalData as any)?.trends;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projection = (temporalData as any)?.projection;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seasonality = (temporalData as any)?.seasonality;

  const trendCa = trends?.ca;
  const healthLabel = getHealthLabel(healthScore).label;

  // Ratio filtering — SAME logic as generateInsights
  const healthyRatios = ratios
    .filter((r) => r.status === 'healthy' && RATIO_LABELS[r.ratio_key])
    .slice(0, 3);

  const weakRatios = ratios
    .filter((r) => (r.status === 'critical' || r.status === 'warning') && RATIO_LABELS[r.ratio_key])
    .sort((a, b) => (a.status === 'critical' ? 0 : 1) - (b.status === 'critical' ? 0 : 1))
    .slice(0, 5);

  const criticalRatios = weakRatios.filter((r) => r.status === 'critical');
  const warningRatios = weakRatios.filter((r) => r.status === 'warning');

  // ---- Q3 — Weakness variables ----
  const weaknessRatiosDetail = weakRatios.map(formatRatioForPrompt).join('\n');
  const weaknessVariables = {
    fiscal_year: String(fiscalYear),
    ratios_detail: weaknessRatiosDetail,
  };

  // ---- Q4 — Anomaly variables ----
  const signals: string[] = [];
  for (const r of criticalRatios) {
    signals.push(formatRatioForPrompt(r));
  }
  if (trendCa?.direction === 'down') {
    signals.push(`- Tendance CA 3 mois : en baisse de ${Math.abs(trendCa.variation_pct).toFixed(1)}%`);
  }
  if (trends?.charges?.direction === 'up') {
    signals.push(`- Tendance charges 3 mois : en hausse de ${trends.charges.variation_pct.toFixed(1)}%`);
  }
  if (trends?.marge?.direction === 'down') {
    signals.push(`- Tendance marge 3 mois : en baisse de ${Math.abs(trends.marge.variation_pct).toFixed(1)}%`);
  }
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentSeason = (seasonality as any[])?.find((s: any) => s.month === currentMonth);
  if (currentSeason?.performance_vs_expected != null && currentSeason.performance_vs_expected < 90) {
    signals.push(`- Sous-performance saisonnière : le mois en cours est à ${currentSeason.performance_vs_expected.toFixed(0)}% de la performance attendue`);
  }
  for (const r of warningRatios) {
    signals.push(`- ${RATIO_LABELS[r.ratio_key] ?? r.ratio_key} : ${r.value} — en zone de vigilance`);
  }
  const signalsDetail = signals.length > 0 ? signals.join('\n') : 'Aucun signal de surveillance détecté.';
  const anomalyVariables = {
    fiscal_year: String(fiscalYear),
    signals_detail: signalsDetail,
  };

  // ---- Q5 — Recommendation variables ----
  const issues: string[] = [];
  for (const r of weakRatios) {
    issues.push(formatRatioForPrompt(r));
  }
  if (trendCa?.direction === 'down') {
    issues.push(`- Tendance CA en baisse : ${trendCa.variation_pct.toFixed(1)}% sur 3 mois`);
  }
  if (trends?.charges?.direction === 'up') {
    issues.push(`- Charges en hausse : +${trends.charges.variation_pct.toFixed(1)}% sur 3 mois`);
  }
  const concentration = ratioMap.get('concentration_ca_top3');
  if (concentration && !weakRatios.some((r) => r.ratio_key === 'concentration_ca_top3')) {
    issues.push(`- Concentration CA top 3 : ${concentration.value}% (${concentration.status})`);
  }
  const runway = ratioMap.get('runway_tresorerie');
  if (runway && runway.value < 4) {
    issues.push(`- Runway trésorerie : ${runway.value.toFixed(1)} mois`);
  }
  const issuesDetail = issues.length > 0 ? issues.join('\n') : 'Aucune faiblesse majeure identifiée.';
  const recommendationVariables = {
    fiscal_year: String(fiscalYear),
    issues_detail: issuesDetail,
  };

  // ---- Build response ----
  return NextResponse.json({
    agency: demoAgency,
    analysis: {
      id: analysis.id,
      fiscal_year: analysis.fiscal_year,
      health_score: analysis.health_score,
      health_label: healthLabel,
      status: analysis.status,
      created_at: analysis.created_at,
    },
    all_ratios: ratios.map((r) => ({
      key: r.ratio_key,
      label: RATIO_LABELS[r.ratio_key] ?? r.ratio_key,
      value: r.value,
      status: r.status,
      benchmark_min: r.benchmark_min,
      benchmark_max: r.benchmark_max,
    })),
    ratios_by_status: {
      critical: criticalRatios.map((r) => ({ key: r.ratio_key, label: RATIO_LABELS[r.ratio_key], value: r.value })),
      warning: warningRatios.map((r) => ({ key: r.ratio_key, label: RATIO_LABELS[r.ratio_key], value: r.value })),
      healthy: healthyRatios.map((r) => ({ key: r.ratio_key, label: RATIO_LABELS[r.ratio_key], value: r.value })),
    },
    prompt_variables: {
      weakness: weaknessVariables,
      anomaly: anomalyVariables,
      recommendation: recommendationVariables,
    },
    context: {
      ca_total_ht: formatCurrencySimple(caHt),
      marge_operationnelle: margeOp != null ? `${margeOp.toFixed(1)}%` : 'non calculée',
      taux_recurrence: tauxRec != null ? `${tauxRec.toFixed(1)}%` : 'non calculé',
      trend_ca: trendCa ?? null,
      projection: projection ?? null,
    },
    temporal_data: temporalData,
    _debug: {
      total_ratios: ratios.length,
      ratios_with_label: ratios.filter((r) => RATIO_LABELS[r.ratio_key]).length,
      ratios_without_label: ratios.filter((r) => !RATIO_LABELS[r.ratio_key]).map((r) => r.ratio_key),
      weak_ratios_count: weakRatios.length,
      weak_ratios_would_skip_q3: weakRatios.length === 0,
      signals_count: signals.length,
      issues_count: issues.length,
    },
  });
}
