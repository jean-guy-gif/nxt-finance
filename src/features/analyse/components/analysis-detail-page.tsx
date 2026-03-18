'use client';

import { useState, useMemo } from 'react';
import {
  Loader2,
  TrendingUp, TrendingDown, Minus,
  CheckCircle, AlertTriangle, AlertOctagon, Lightbulb,
  Shield, Wallet, Droplets, Users, Receipt,
  Hash, Calendar, Layers, FileText, Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { BackButton } from '@/components/shared/back-button';
import { StatusBadge } from '@/components/shared/status-badge';
import { SectionCard } from '@/components/shared/section-card';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  ANALYSIS_LEVEL_LABELS,
  ANALYSIS_STATUS_LABELS,
  RATIO_STATUS_LABELS,
  INSIGHT_TYPE_LABELS,
  BALANCE_SHEET_SECTION_LABELS,
} from '@/types/enums';
import type {
  FinancialRatio,
  FinancialInsight,
  BalanceSheetItem,
  TemporalAnalysis,
} from '@/types/models';
import type {
  AnalysisStatus,
  RatioStatus,
  RatioSource,
  InsightType,
  BalanceSheetSection,
} from '@/types/enums';
import { useAnalysis, useRatios, useInsights } from '../hooks/use-analyses';

// ============================================
// Ratio key → French label mapping
// ============================================

const RATIO_KEY_LABELS: Record<string, string> = {
  marge_nette: 'Marge nette',
  marge_brute: 'Marge brute',
  taux_endettement: "Taux d'endettement",
  ratio_liquidite: 'Ratio de liquidité',
  bfr_jours: 'BFR (jours de CA)',
  capacite_autofinancement: "Capacité d'autofinancement",
  ratio_charges_ca: 'Ratio charges / CA',
  resultat_net: 'Résultat net',
  ca_total_ht: 'CA total HT',
  charges_total_ttc: 'Charges totales TTC',
  ratio_masse_salariale: 'Ratio masse salariale',
  ca_par_collaborateur: 'CA par collaborateur',
  marge_operationnelle_nxt: 'Marge opérationnelle',
  couverture_charges: 'Couverture charges',
  produits_exploitation_bilan: "Produits d'exploitation (bilan)",
  total_charges_bilan: 'Charges totales (bilan)',
  // Operational ratios
  nb_transactions_total: 'Nombre de transactions',
  nb_transactions_transaction: 'Transactions (vente)',
  nb_transactions_gestion: 'Transactions (gestion)',
  nb_transactions_location: 'Transactions (location)',
  panier_moyen_global: 'Panier moyen global',
  panier_moyen_transaction: 'Panier moyen (vente)',
  panier_moyen_gestion: 'Panier moyen (gestion)',
  panier_moyen_location: 'Panier moyen (location)',
  taux_recurrence: 'Taux de récurrence',
  concentration_ca_top3: 'Concentration CA top 3',
  delai_encaissement_moyen: 'Délai encaissement moyen',
  part_ca_transaction: 'Part CA transaction',
  part_ca_gestion: 'Part CA gestion',
  part_ca_location: 'Part CA location',
  ratio_charges_fixes_ca: 'Ratio charges fixes / CA',
  point_mort_mensuel: 'Point mort mensuel',
  runway_tresorerie: 'Runway trésorerie',
  // Merged ratios
  coherence_ca: 'Cohérence CA bilan/NXT',
  couverture_charges_reelles: 'Couverture charges réelles',
};

// Ratios where a *lower* value is better (for N-1 comparison coloring)
const LOWER_IS_BETTER_RATIOS = new Set([
  'taux_endettement',
  'ratio_charges_ca',
  'ratio_masse_salariale',
  'bfr_jours',
  'charges_total_ttc',
  'concentration_ca_top3',
  'delai_encaissement_moyen',
  'ratio_charges_fixes_ca',
  'coherence_ca',
]);

// ============================================
// Category scoring config
// ============================================

const SCORE_CATEGORIES = [
  { key: 'rentabilite', label: 'Rentabilité', weight: '25%', icon: TrendingUp },
  { key: 'structure', label: 'Structure', weight: '15%', icon: Shield },
  { key: 'liquidite', label: 'Liquidité', weight: '15%', icon: Droplets },
  { key: 'productivite', label: 'Productivité', weight: '10%', icon: Users },
  { key: 'charges', label: 'Charges', weight: '10%', icon: Receipt },
  { key: 'dynamique_commerciale', label: 'Dynamique commerciale', weight: '15%', icon: TrendingUp },
  { key: 'risques', label: 'Risques', weight: '10%', icon: Shield },
] as const;

// Map insight types to visual config
const INSIGHT_CONFIG: Record<InsightType, { border: string; icon: typeof CheckCircle; iconColor: string }> = {
  strength: { border: 'border-emerald-300', icon: CheckCircle, iconColor: 'text-emerald-600' },
  weakness: { border: 'border-red-300', icon: AlertTriangle, iconColor: 'text-red-600' },
  anomaly: { border: 'border-amber-300', icon: AlertOctagon, iconColor: 'text-amber-600' },
  recommendation: { border: 'border-blue-300', icon: Lightbulb, iconColor: 'text-blue-600' },
};

// ============================================
// Tabs
// ============================================

type TabKey = 'synthese' | 'performance' | 'tendances' | 'ratios' | 'charges' | 'comparaison' | 'tracabilite';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'synthese', label: 'Synthèse' },
  { key: 'performance', label: 'Performance' },
  { key: 'tendances', label: 'Tendances' },
  { key: 'ratios', label: 'Ratios' },
  { key: 'charges', label: 'Charges & Revenus' },
  { key: 'comparaison', label: 'N vs N-1' },
  { key: 'tracabilite', label: 'Traçabilité' },
];

// ============================================
// Helpers
// ============================================

function scoreColor(score: number | null): string {
  if (score == null) return 'text-muted-foreground';
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBg(score: number | null): string {
  if (score == null) return 'bg-muted';
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreLabel(score: number | null): string {
  if (score == null) return 'Non calculé';
  if (score >= 70) return 'Bonne santé';
  if (score >= 40) return 'Vigilance';
  return 'Critique';
}

function ratioStatusColor(status: RatioStatus): string {
  const map: Record<RatioStatus, string> = {
    healthy: 'text-emerald-600',
    warning: 'text-amber-600',
    critical: 'text-red-600',
  };
  return map[status];
}

function ratioStatusBadgeVariant(status: RatioStatus): 'validated' | 'vigilance' | 'critical' {
  const map: Record<RatioStatus, 'validated' | 'vigilance' | 'critical'> = {
    healthy: 'validated',
    warning: 'vigilance',
    critical: 'critical',
  };
  return map[status];
}

function analysisStatusBadge(status: AnalysisStatus): 'processing' | 'completed' | 'draft' {
  const map: Record<AnalysisStatus, 'processing' | 'completed' | 'draft'> = {
    computing: 'processing',
    ready: 'completed',
    archived: 'draft',
  };
  return map[status];
}

const MONETARY_RATIOS = new Set([
  'resultat_net', 'ca_total_ht', 'charges_total_ttc', 'capacite_autofinancement',
  'ca_par_collaborateur', 'panier_moyen_global', 'panier_moyen_transaction',
  'panier_moyen_gestion', 'panier_moyen_location', 'point_mort_mensuel',
  'produits_exploitation_bilan', 'total_charges_bilan',
]);

const PERCENTAGE_RATIOS = new Set([
  'marge_nette', 'marge_brute', 'taux_endettement', 'ratio_charges_ca',
  'ratio_masse_salariale', 'marge_operationnelle_nxt', 'couverture_charges',
  'taux_recurrence', 'concentration_ca_top3', 'part_ca_transaction',
  'part_ca_gestion', 'part_ca_location', 'ratio_charges_fixes_ca',
  'coherence_ca', 'couverture_charges_reelles',
]);

const DAYS_RATIOS = new Set(['bfr_jours', 'delai_encaissement_moyen']);
const MONTHS_RATIOS = new Set(['runway_tresorerie']);
const COUNT_RATIOS = new Set([
  'nb_transactions_total', 'nb_transactions_transaction',
  'nb_transactions_gestion', 'nb_transactions_location',
]);

function formatRatioValue(ratio: FinancialRatio): string {
  const key = ratio.ratio_key;
  if (MONETARY_RATIOS.has(key)) return formatCurrency(ratio.value);
  if (PERCENTAGE_RATIOS.has(key)) return ratio.value.toFixed(1) + '%';
  if (DAYS_RATIOS.has(key)) return ratio.value.toFixed(1) + ' j';
  if (MONTHS_RATIOS.has(key)) return ratio.value.toFixed(1) + ' mois';
  if (COUNT_RATIOS.has(key)) return String(Math.round(ratio.value));
  return ratio.value.toFixed(1);
}

function formatNMinus1Value(ratio: FinancialRatio): string {
  if (ratio.value_n_minus_1 == null) return '—';
  const key = ratio.ratio_key;
  if (MONETARY_RATIOS.has(key)) return formatCurrency(ratio.value_n_minus_1);
  if (PERCENTAGE_RATIOS.has(key)) return ratio.value_n_minus_1.toFixed(1) + '%';
  if (DAYS_RATIOS.has(key)) return ratio.value_n_minus_1.toFixed(1) + ' j';
  if (MONTHS_RATIOS.has(key)) return ratio.value_n_minus_1.toFixed(1) + ' mois';
  if (COUNT_RATIOS.has(key)) return String(Math.round(ratio.value_n_minus_1));
  return ratio.value_n_minus_1.toFixed(1);
}

function computeEvolution(ratio: FinancialRatio): number | null {
  if (ratio.value_n_minus_1 == null || ratio.value_n_minus_1 === 0) return null;
  return ((ratio.value - ratio.value_n_minus_1) / Math.abs(ratio.value_n_minus_1)) * 100;
}

function isImprovement(ratio: FinancialRatio): boolean | null {
  const evo = computeEvolution(ratio);
  if (evo == null) return null;
  if (LOWER_IS_BETTER_RATIOS.has(ratio.ratio_key)) {
    return evo < 0;
  }
  return evo > 0;
}

// ============================================
// Main component
// ============================================

interface Props {
  id: string;
}

export function AnalysisDetailPage({ id }: Props) {
  const { data: analysis, isLoading, isError, refetch } = useAnalysis(id);
  const { data: ratios } = useRatios(id);
  const { data: insights, isFetching: insightsFetching } = useInsights(id);

  const [activeTab, setActiveTab] = useState<TabKey>('synthese');

  if (isLoading) return <LoadingState message="Chargement de l'analyse..." fullPage />;
  if (isError || !analysis) {
    return <ErrorState message="Impossible de charger cette analyse." onRetry={refetch} />;
  }

  const isComputing = analysis.status === 'computing';

  return (
    <div className="space-y-6">
      {/* Computing banner */}
      {isComputing && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Calcul en cours... Les données se mettront à jour automatiquement.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton fallback="/analyse" label="Analyses" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Analyse {analysis.fiscal_year}
              </h1>
              <StatusBadge
                status={analysisStatusBadge(analysis.status)}
                label={ANALYSIS_STATUS_LABELS[analysis.status]}
              />
              <Badge variant="outline" className="text-xs">
                {ANALYSIS_LEVEL_LABELS[analysis.analysis_level]}
              </Badge>
            </div>
            {/* Health score in header */}
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('text-2xl font-bold tabular-nums', scoreColor(analysis.health_score))}>
                {analysis.health_score != null ? analysis.health_score : '—'}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
              <span className={cn('text-sm font-medium', scoreColor(analysis.health_score))}>
                {scoreLabel(analysis.health_score)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
              activeTab === tab.key
                ? 'bg-background border border-b-transparent text-foreground -mb-px'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'synthese' && (
        <TabSynthese
          healthScore={analysis.health_score}
          insights={insights ?? analysis.insights ?? []}
          ratios={ratios ?? analysis.ratios ?? []}
          insightsLoading={insightsFetching && (insights ?? []).length === 0}
        />
      )}
      {activeTab === 'performance' && (
        <TabPerformance ratios={ratios ?? analysis.ratios ?? []} />
      )}
      {activeTab === 'tendances' && (
        <TabTendances temporalData={analysis.temporal_data ?? null} />
      )}
      {activeTab === 'ratios' && (
        <TabRatios ratios={ratios ?? analysis.ratios ?? []} />
      )}
      {activeTab === 'charges' && (
        <TabChargesRevenus
          balanceSheet={analysis.balance_sheet}
        />
      )}
      {activeTab === 'comparaison' && (
        <TabComparaison ratios={ratios ?? analysis.ratios ?? []} />
      )}
      {activeTab === 'tracabilite' && (
        <TabTracabilite
          analysis={analysis}
          ratios={ratios ?? analysis.ratios ?? []}
          insights={insights ?? analysis.insights ?? []}
        />
      )}
    </div>
  );
}

// ============================================
// Tab: Synthese
// ============================================

function InsightPlaceholder({ loading }: { loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 py-4 justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Analyse en cours de rédaction...</span>
      </div>
    );
  }
  return (
    <p className="text-sm text-muted-foreground py-3 italic">
      Synthèse non disponible — le service de rédaction n&apos;a pas pu être contacté.
    </p>
  );
}

/** Render light markdown: **bold**, → arrows, line breaks */
function renderMarkdown(text: string) {
  // Split by line, process each
  return text.split('\n').map((line, i) => {
    // Replace **bold** with <strong>
    const parts = line.split(/\*\*(.+?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j} className="font-semibold text-foreground">{part}</strong> : part
    );
    return (
      <span key={i}>
        {i > 0 && <br />}
        {rendered}
      </span>
    );
  });
}

function InsightBlock({
  insight,
  icon: Icon,
  iconColor,
  borderColor,
}: {
  insight: FinancialInsight;
  icon: typeof CheckCircle;
  iconColor: string;
  borderColor: string;
}) {
  return (
    <div className={cn('rounded-lg border-2 p-4 space-y-2', borderColor)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4 shrink-0', iconColor)} />
        <span className="text-sm font-semibold">{insight.title}</span>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">
        {renderMarkdown(insight.content)}
      </div>
    </div>
  );
}

function TabSynthese({
  healthScore,
  insights,
  ratios,
  insightsLoading = false,
}: {
  healthScore: number | null;
  insights: FinancialInsight[];
  ratios: FinancialRatio[];
  insightsLoading?: boolean;
}) {
  // Compute category scores from ratios
  const categoryScores = useMemo(() => {
    const categoryMap: Record<string, string> = {
      marge_nette: 'rentabilite',
      marge_brute: 'rentabilite',
      resultat_net: 'rentabilite',
      marge_operationnelle_nxt: 'rentabilite',
      taux_endettement: 'structure',
      capacite_autofinancement: 'structure',
      ratio_liquidite: 'liquidite',
      bfr_jours: 'liquidite',
      ca_par_collaborateur: 'productivite',
      ratio_masse_salariale: 'productivite',
      ratio_charges_ca: 'charges',
      ratio_charges_fixes_ca: 'charges',
      taux_recurrence: 'dynamique_commerciale',
      concentration_ca_top3: 'risques',
      runway_tresorerie: 'risques',
    };

    const scores: Record<string, { total: number; count: number }> = {};
    for (const r of ratios) {
      const cat = categoryMap[r.ratio_key];
      if (!cat) continue;
      if (!scores[cat]) scores[cat] = { total: 0, count: 0 };
      const s = r.status === 'healthy' ? 100 : r.status === 'warning' ? 50 : 10;
      scores[cat].total += s;
      scores[cat].count += 1;
    }

    return SCORE_CATEGORIES.map((cat) => {
      const data = scores[cat.key];
      const score = data ? Math.round(data.total / data.count) : null;
      return { ...cat, score };
    });
  }, [ratios]);

  // Classify insights by the new 5-question structure
  const directorSummary = insights.find((i) => i.category === 'director_summary');
  const strengths = insights.filter((i) => i.insight_type === 'strength');
  const weaknesses = insights.filter((i) => i.insight_type === 'weakness');
  const anomalies = insights.filter((i) => i.insight_type === 'anomaly');
  const recommendations = insights.filter((i) => i.insight_type === 'recommendation' && i.category !== 'director_summary');

  const hasAnyInsight = insights.length > 0;

  return (
    <div className="space-y-6">
      {/* Health score + category scores */}
      <SectionCard title="Score de santé financière">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className={cn('text-5xl font-bold tabular-nums', scoreColor(healthScore))}>
            {healthScore != null ? healthScore : '—'}
          </div>
          <div className="text-sm text-muted-foreground">/100</div>
          <div className={cn('text-lg font-semibold', scoreColor(healthScore))}>
            {scoreLabel(healthScore)}
          </div>
          {healthScore != null && (
            <div className="w-full max-w-xs mt-2">
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', scoreBg(healthScore))}
                  style={{ width: `${healthScore}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Category scores grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {categoryScores.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.key} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="font-medium">{cat.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn('text-2xl font-bold tabular-nums', scoreColor(cat.score))}>
                  {cat.score != null ? cat.score : '—'}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <span className="text-xs text-muted-foreground">Poids : {cat.weight}</span>
            </div>
          );
        })}
      </div>

      {/* Q1 — Synthèse dirigeant */}
      <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-5 space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
          Où en êtes-vous ?
        </h3>
        {directorSummary ? (
          <div className="text-sm leading-relaxed">{renderMarkdown(directorSummary.content)}</div>
        ) : (
          <InsightPlaceholder loading={insightsLoading} />
        )}
      </div>

      {/* Q2 — Forces */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          Ce qui va bien
        </h3>
        {!hasAnyInsight ? (
          <InsightPlaceholder loading={insightsLoading} />
        ) : strengths.length > 0 ? (
          <div className="space-y-3">
            {strengths.map((s) => (
              <InsightBlock key={s.id} insight={s} icon={CheckCircle} iconColor="text-emerald-600" borderColor="border-emerald-200" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">Aucun point fort majeur identifié.</p>
        )}
      </div>

      {/* Q3 — Faiblesses */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          Ce qui ne va pas
        </h3>
        {!hasAnyInsight ? (
          <InsightPlaceholder loading={insightsLoading} />
        ) : weaknesses.length > 0 ? (
          <div className="space-y-3">
            {weaknesses.map((w) => (
              <InsightBlock key={w.id} insight={w} icon={AlertTriangle} iconColor="text-red-600" borderColor="border-red-200" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">Aucun point de faiblesse critique.</p>
        )}
      </div>

      {/* Q4 — Surveillance */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-amber-600" />
          À surveiller
        </h3>
        {!hasAnyInsight ? (
          <InsightPlaceholder loading={insightsLoading} />
        ) : anomalies.length > 0 ? (
          <div className="space-y-3">
            {anomalies.map((a) => (
              <InsightBlock key={a.id} insight={a} icon={AlertOctagon} iconColor="text-amber-600" borderColor="border-amber-200" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">Aucun signal de surveillance.</p>
        )}
      </div>

      {/* Q5 — Recommandations */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          Que faire maintenant ?
        </h3>
        {!hasAnyInsight ? (
          <InsightPlaceholder loading={insightsLoading} />
        ) : recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((r) => (
              <InsightBlock key={r.id} insight={r} icon={Lightbulb} iconColor="text-blue-600" borderColor="border-blue-200" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">Aucune recommandation prioritaire.</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Tab: Performance opérationnelle
// ============================================

function TabPerformance({ ratios }: { ratios: FinancialRatio[] }) {
  const ratioMap = new Map(ratios.map((r) => [r.ratio_key, r]));

  function renderKpi(key: string) {
    const r = ratioMap.get(key);
    if (!r) return null;
    return (
      <div key={key} className="rounded-lg border p-4 space-y-1">
        <p className="text-xs text-muted-foreground">
          {RATIO_KEY_LABELS[key] ?? key}
        </p>
        <p className={cn('text-lg font-bold tabular-nums', ratioStatusColor(r.status))}>
          {formatRatioValue(r)}
        </p>
        {r.benchmark_min != null && r.benchmark_max != null && (
          <p className="text-[10px] text-muted-foreground">
            Benchmark : {r.benchmark_min} — {r.benchmark_max}
          </p>
        )}
        <StatusBadge
          status={ratioStatusBadgeVariant(r.status)}
          label={RATIO_STATUS_LABELS[r.status]}
        />
      </div>
    );
  }

  const hasVolume = ratioMap.has('nb_transactions_total');
  const hasStructure = ratioMap.has('part_ca_transaction') || ratioMap.has('taux_recurrence');
  const hasRisques = ratioMap.has('concentration_ca_top3') || ratioMap.has('runway_tresorerie');
  const hasSeuils = ratioMap.has('point_mort_mensuel') || ratioMap.has('ratio_charges_fixes_ca');

  if (!hasVolume && !hasStructure && !hasRisques && !hasSeuils) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Aucune donnée opérationnelle disponible. Lancez une analyse pour calculer les indicateurs.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Volume d'activité */}
      {hasVolume && (
        <SectionCard title="Volume d'activité">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {renderKpi('nb_transactions_total')}
            {renderKpi('nb_transactions_transaction')}
            {renderKpi('nb_transactions_gestion')}
            {renderKpi('nb_transactions_location')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {renderKpi('panier_moyen_global')}
            {renderKpi('panier_moyen_transaction')}
            {renderKpi('panier_moyen_gestion')}
            {renderKpi('panier_moyen_location')}
          </div>
        </SectionCard>
      )}

      {/* Structure du CA */}
      {hasStructure && (
        <SectionCard title="Structure du chiffre d'affaires">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {renderKpi('part_ca_transaction')}
            {renderKpi('part_ca_gestion')}
            {renderKpi('part_ca_location')}
            {renderKpi('taux_recurrence')}
          </div>
        </SectionCard>
      )}

      {/* Risques opérationnels */}
      {hasRisques && (
        <SectionCard title="Risques opérationnels">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {renderKpi('concentration_ca_top3')}
            {renderKpi('runway_tresorerie')}
            {renderKpi('delai_encaissement_moyen')}
          </div>
        </SectionCard>
      )}

      {/* Seuils de survie */}
      {hasSeuils && (
        <SectionCard title="Seuils de survie">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {renderKpi('point_mort_mensuel')}
            {renderKpi('ratio_charges_fixes_ca')}
          </div>
        </SectionCard>
      )}

      {/* Merged ratios (cohérence bilan/NXT) */}
      {(ratioMap.has('coherence_ca') || ratioMap.has('couverture_charges_reelles')) && (
        <SectionCard title="Cohérence bilan / NXT">
          <div className="grid grid-cols-2 gap-3">
            {renderKpi('coherence_ca')}
            {renderKpi('couverture_charges_reelles')}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ============================================
// Tab: Tendances
// ============================================

const MONTH_SHORT = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function TrendArrow({ direction, pct }: { direction: 'up' | 'stable' | 'down'; pct: number }) {
  if (direction === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
        <TrendingUp className="h-4 w-4" /> +{pct.toFixed(1)}%
      </span>
    );
  }
  if (direction === 'down') {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
        <TrendingDown className="h-4 w-4" /> {pct.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
      <Minus className="h-4 w-4" /> {pct.toFixed(1)}%
    </span>
  );
}

function TabTendances({ temporalData }: { temporalData: TemporalAnalysis | null }) {
  if (!temporalData) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Aucune donnée temporelle disponible. Lancez une analyse pour calculer les tendances.
      </div>
    );
  }

  const { monthly_series, monthly_comparison, trends, projection, seasonality } = temporalData;
  const hasEnoughData = monthly_series.filter((p) => p.ca > 0 || p.charges > 0).length >= 3;

  // Chart data
  const chartData = monthly_series.map((p) => ({
    label: `${MONTH_SHORT[p.month]} ${String(p.year).slice(2)}`,
    CA: p.ca,
    Charges: p.charges,
    Marge: p.marge,
  }));

  return (
    <div className="space-y-6">
      {/* 12-month chart */}
      <SectionCard title="Évolution sur 12 mois">
        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="CA" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Charges" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Marge" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Aucune donnée mensuelle</p>
        )}
      </SectionCard>

      {/* 3-month trends */}
      <SectionCard title="Tendance 3 mois glissants">
        {!hasEnoughData || !trends ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Historique insuffisant (minimum 3 mois requis)
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Chiffre d&apos;affaires</p>
              <TrendArrow direction={trends.ca.direction} pct={trends.ca.variation_pct} />
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Charges</p>
              <TrendArrow direction={trends.charges.direction} pct={trends.charges.variation_pct} />
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Marge</p>
              <TrendArrow direction={trends.marge.direction} pct={trends.marge.variation_pct} />
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Transactions</p>
              <TrendArrow direction={trends.nb_transactions.direction} pct={trends.nb_transactions.variation_pct} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* End-of-year projection */}
      {projection && (
        <SectionCard title="Projection fin d'année">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">CA cumulé</p>
              <p className="text-lg font-bold">{formatCurrency(projection.ca_cumul)}</p>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Mois écoulés</p>
              <p className="text-lg font-bold">{projection.months_elapsed} / 12</p>
            </div>
            <div className="rounded-lg border bg-primary/5 p-4 space-y-1">
              <p className="text-xs text-muted-foreground">CA projeté (linéaire)</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(projection.ca_projected)}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Avancement</span>
              <span>{Math.round((projection.months_elapsed / 12) * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round((projection.months_elapsed / 12) * 100)}%` }}
              />
            </div>
          </div>
        </SectionCard>
      )}

      {/* N vs N-1 comparison */}
      {monthly_comparison.length > 0 && (
        <SectionCard title="Comparaison mensuelle N / N-1">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium">Mois</th>
                  <th className="text-right px-4 py-2.5 font-medium">CA N</th>
                  <th className="text-right px-4 py-2.5 font-medium">CA N-1</th>
                  <th className="text-right px-4 py-2.5 font-medium">Variation</th>
                  <th className="text-right px-4 py-2.5 font-medium">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monthly_comparison.map((c) => (
                  <tr key={c.month} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{MONTH_SHORT[c.month]}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(c.ca_n)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(c.ca_n1)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={c.variation_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {c.variation_pct > 0 ? '+' : ''}{c.variation_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={c.variation_abs >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {c.variation_abs >= 0 ? '+' : ''}{formatCurrency(c.variation_abs)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Seasonality */}
      {seasonality.length > 0 && seasonality.some((s) => s.performance_vs_expected !== null) && (
        <SectionCard title="Performance saisonnière">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {seasonality.map((s) => {
              if (s.performance_vs_expected === null) return null;
              const perf = s.performance_vs_expected;
              const color = perf >= 110 ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                : perf < 90 ? 'text-red-600 border-red-200 bg-red-50'
                : 'text-muted-foreground border-border bg-card';
              const label = perf >= 110 ? 'Surperformance'
                : perf < 90 ? 'Sous-performance'
                : 'Normal';
              return (
                <div key={s.month} className={cn('rounded-lg border p-3 text-center space-y-1', color)}>
                  <p className="text-xs font-medium">{MONTH_SHORT[s.month]}</p>
                  <p className="text-sm font-bold tabular-nums">{perf.toFixed(0)}%</p>
                  <p className="text-[10px]">{label}</p>
                  <p className="text-[10px] text-muted-foreground">Indice : {s.index.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ============================================
// Tab: Ratios
// ============================================

const SOURCE_LABELS: Record<RatioSource, string> = {
  bilan: 'Bilan',
  nxt: 'NXT',
  computed: 'Calculé',
};

function TabRatios({ ratios }: { ratios: FinancialRatio[] }) {
  const grouped = useMemo(() => {
    const groups = new Map<RatioSource, FinancialRatio[]>();
    for (const r of ratios) {
      if (!groups.has(r.source)) groups.set(r.source, []);
      groups.get(r.source)!.push(r);
    }
    return groups;
  }, [ratios]);

  if (ratios.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Aucun ratio disponible.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([source, sourceRatios]) => (
        <div key={source} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Source : {SOURCE_LABELS[source]}
          </h3>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium">Indicateur</th>
                  <th className="text-right px-4 py-2.5 font-medium">Valeur</th>
                  <th className="text-right px-4 py-2.5 font-medium">N-1</th>
                  <th className="text-right px-4 py-2.5 font-medium">Écart</th>
                  <th className="text-center px-4 py-2.5 font-medium">Statut</th>
                  <th className="text-right px-4 py-2.5 font-medium">Benchmark</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sourceRatios.map((r) => {
                  const evo = computeEvolution(r);
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium">
                        {RATIO_KEY_LABELS[r.ratio_key] ?? r.ratio_key}
                      </td>
                      <td className={cn('px-4 py-2.5 text-right tabular-nums font-medium', ratioStatusColor(r.status))}>
                        {formatRatioValue(r)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatNMinus1Value(r)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {evo != null ? (
                          <span className={isImprovement(r) ? 'text-emerald-600' : 'text-red-600'}>
                            {evo > 0 ? '+' : ''}{evo.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge
                          status={ratioStatusBadgeVariant(r.status)}
                          label={RATIO_STATUS_LABELS[r.status]}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground text-xs">
                        {r.benchmark_min != null && r.benchmark_max != null
                          ? `${r.benchmark_min.toFixed(1)} — ${r.benchmark_max.toFixed(1)}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Tab: Charges & Revenus
// ============================================

function TabChargesRevenus({
  balanceSheet,
}: {
  balanceSheet?: { items?: BalanceSheetItem[] } | null;
}) {
  const items = balanceSheet?.items ?? [];

  const grouped = useMemo(() => {
    // Split into produits vs charges
    const produits: BalanceSheetItem[] = [];
    const charges: BalanceSheetItem[] = [];

    for (const item of items) {
      if (item.section.startsWith('produits')) {
        produits.push(item);
      } else if (item.section.startsWith('charges')) {
        charges.push(item);
      }
    }

    return { produits, charges };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Aucune donnée de bilan disponible pour cette analyse.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ItemTable title="Produits" items={grouped.produits} />
      <ItemTable title="Charges" items={grouped.charges} />
    </div>
  );
}

function ItemTable({ title, items }: { title: string; items: BalanceSheetItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-2.5 font-medium">Section</th>
              <th className="text-left px-4 py-2.5 font-medium">Catégorie</th>
              <th className="text-right px-4 py-2.5 font-medium">Montant</th>
              <th className="text-right px-4 py-2.5 font-medium">N-1</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 text-muted-foreground">
                  {BALANCE_SHEET_SECTION_LABELS[item.section as BalanceSheetSection] ?? item.section}
                </td>
                <td className="px-4 py-2.5 font-medium">{item.category}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                  {formatCurrency(item.amount)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {item.amount_n_minus_1 != null ? formatCurrency(item.amount_n_minus_1) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// Tab: Comparaison N-1
// ============================================

function TabComparaison({ ratios }: { ratios: FinancialRatio[] }) {
  const withNMinus1 = ratios.filter((r) => r.value_n_minus_1 != null);

  if (withNMinus1.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Aucune donnée N-1 disponible pour la comparaison.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-4 py-2.5 font-medium">Indicateur</th>
            <th className="text-right px-4 py-2.5 font-medium">N</th>
            <th className="text-right px-4 py-2.5 font-medium">N-1</th>
            <th className="text-right px-4 py-2.5 font-medium">Évolution (%)</th>
            <th className="text-center px-4 py-2.5 font-medium">Tendance</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {withNMinus1.map((r) => {
            const evo = computeEvolution(r);
            const improved = isImprovement(r);
            return (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 font-medium">
                  {RATIO_KEY_LABELS[r.ratio_key] ?? r.ratio_key}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                  {formatRatioValue(r)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {formatNMinus1Value(r)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {evo != null ? (
                    <span className={improved ? 'text-emerald-600' : 'text-red-600'}>
                      {evo > 0 ? '+' : ''}{evo.toFixed(1)}%
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {evo != null ? (
                    improved ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600 mx-auto" />
                    ) : evo === 0 ? (
                      <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 mx-auto" />
                    )
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// Tab: Tracabilite
// ============================================

function TabTracabilite({
  analysis,
  ratios,
  insights,
}: {
  analysis: { id: string; version_number: number; analysis_level: string; created_at: string; status: string; balance_sheet_id: string | null };
  ratios: FinancialRatio[];
  insights: FinancialInsight[];
}) {
  // Get unique calculation versions and input hashes
  const calculationVersions = [...new Set(ratios.map((r) => r.calculation_version))];
  const inputHashes = [...new Set(ratios.map((r) => r.input_hash))];

  return (
    <div className="space-y-6">
      {/* Analysis metadata */}
      <SectionCard title="Métadonnées de l'analyse">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetaItem icon={Hash} label="ID" value={analysis.id} mono />
          <MetaItem icon={Layers} label="Version" value={String(analysis.version_number)} />
          <MetaItem icon={Cpu} label="Niveau d'analyse" value={ANALYSIS_LEVEL_LABELS[analysis.analysis_level as keyof typeof ANALYSIS_LEVEL_LABELS] ?? analysis.analysis_level} />
          <MetaItem icon={Calendar} label="Créé le" value={formatDate(analysis.created_at)} />
          <MetaItem icon={FileText} label="Statut" value={ANALYSIS_STATUS_LABELS[analysis.status as keyof typeof ANALYSIS_STATUS_LABELS] ?? analysis.status} />
          {analysis.balance_sheet_id && (
            <MetaItem icon={FileText} label="Bilan source" value={analysis.balance_sheet_id} mono />
          )}
        </div>
      </SectionCard>

      {/* Calculation info */}
      {calculationVersions.length > 0 && (
        <SectionCard title="Versions de calcul">
          <div className="space-y-2 text-sm">
            {calculationVersions.map((v) => (
              <div key={v} className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">{v}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Input hashes */}
      {inputHashes.length > 0 && (
        <SectionCard title="Hashes d'entrée">
          <div className="space-y-2 text-sm">
            {inputHashes.map((h) => (
              <div key={h} className="font-mono text-xs text-muted-foreground break-all">{h}</div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* LLM generation info */}
      {insights.length > 0 && (
        <SectionCard title="Générations LLM">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium">Insight</th>
                  <th className="text-left px-4 py-2.5 font-medium">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium">LLM Generation ID</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {insights.map((insight) => (
                  <tr key={insight.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">{insight.title}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-xs">
                        {INSIGHT_TYPE_LABELS[insight.insight_type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {insight.llm_generation_id ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm truncate', mono && 'font-mono text-xs')}>{value}</p>
      </div>
    </div>
  );
}
