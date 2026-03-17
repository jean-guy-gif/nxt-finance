'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Loader2,
  TrendingUp,
  DollarSign,
  Wallet,
  Percent,
  BarChart3,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

import { BackButton } from '@/components/shared/back-button';
import { StatusBadge } from '@/components/shared/status-badge';
import { KpiCard } from '@/components/shared/kpi-card';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

import {
  useBusinessPlan,
  useProjections,
  useHypotheses,
  useUpdateHypothesis,
} from '../hooks/use-business-plans';
import {
  BP_STATUS_LABELS,
  BP_SCENARIO_LABELS,
} from '../types';
import type { BpStatus, BpScenario, BpHypothesisLevel } from '../types';
import type { BpHypothesis, BpProjection } from '@/types/models';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

const SCENARIOS: BpScenario[] = ['pessimistic', 'realistic', 'optimistic'];

const NARRATIVE_SECTION_LABELS: Record<string, string> = {
  executive_summary: 'Synthese executive',
  growth_drivers: 'Leviers de croissance',
  risk_factors: 'Facteurs de risque',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bpStatusToBadgeVariant(status: BpStatus): 'draft' | 'processing' | 'completed' | 'validated' {
  const map: Record<BpStatus, 'draft' | 'processing' | 'completed' | 'validated'> = {
    draft: 'draft',
    computing: 'processing',
    ready: 'completed',
    archived: 'validated',
  };
  return map[status];
}

function formatCurrencyShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.', ',')} M\u20AC`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace('.', ',')} k\u20AC`;
  }
  return formatCurrency(value);
}

function formatPercentValue(value: number): string {
  return value.toFixed(1) + ' %';
}

// ---------------------------------------------------------------------------
// Scenario selector
// ---------------------------------------------------------------------------

function ScenarioSelector({
  active,
  onChange,
}: {
  active: BpScenario;
  onChange: (s: BpScenario) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border bg-muted p-1">
      {SCENARIOS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            active === s
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {BP_SCENARIO_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hypothesis input row
// ---------------------------------------------------------------------------

function HypothesisRow({
  hypothesis,
  onUpdate,
  isPending,
}: {
  hypothesis: BpHypothesis;
  onUpdate: (id: string, value: number) => void;
  isPending: boolean;
}) {
  const [localValue, setLocalValue] = useState(String(hypothesis.value));

  const handleBlur = useCallback(() => {
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed) && parsed !== hypothesis.value) {
      onUpdate(hypothesis.id, parsed);
    } else {
      setLocalValue(String(hypothesis.value));
    }
  }, [localValue, hypothesis.id, hypothesis.value, onUpdate]);

  const suffix = hypothesis.value_type === 'percentage' ? '%' : '\u20AC';

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm truncate">{hypothesis.label}</span>
        {!hypothesis.is_user_override && (
          <Badge variant="outline" className="text-[10px] shrink-0">
            auto
          </Badge>
        )}
      </div>
      <div className="relative w-28 shrink-0">
        <Input
          type="number"
          step="0.1"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleBlur();
          }}
          className="pr-8 text-right text-sm h-8"
          disabled={isPending}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hypotheses panel
// ---------------------------------------------------------------------------

function HypothesesPanel({
  hypotheses,
  onUpdate,
  isPending,
}: {
  hypotheses: BpHypothesis[];
  onUpdate: (id: string, value: number) => void;
  isPending: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(false);

  const macroHypotheses = useMemo(
    () => hypotheses.filter((h) => h.level === 'macro'),
    [hypotheses],
  );

  const detailHypotheses = useMemo(
    () => hypotheses.filter((h) => h.level === 'detailed'),
    [hypotheses],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Hypotheses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MACRO section */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Macro
          </h4>
          <div className="divide-y">
            {macroHypotheses.map((h) => (
              <HypothesisRow
                key={h.id}
                hypothesis={h}
                onUpdate={onUpdate}
                isPending={isPending}
              />
            ))}
          </div>
          {macroHypotheses.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              Aucune hypothese macro.
            </p>
          )}
        </div>

        {/* DETAIL section (collapsible) */}
        {detailHypotheses.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setDetailOpen(!detailOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {detailOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Detail ({detailHypotheses.length})
            </button>
            {detailOpen && (
              <div className="divide-y mt-2">
                {detailHypotheses.map((h) => (
                  <HypothesisRow
                    key={h.id}
                    hypothesis={h}
                    onUpdate={onUpdate}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Projection chart
// ---------------------------------------------------------------------------

function ProjectionChart({ projections }: { projections: BpProjection[] }) {
  const chartData = useMemo(
    () =>
      projections.map((p) => ({
        month: MONTH_LABELS[p.month - 1],
        'CA projete': p.revenue_projected,
        'Charges projetees': p.expenses_projected,
        Marge: p.margin_projected,
      })),
    [projections],
  );

  if (projections.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Aucune projection disponible.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            tickFormatter={(v: number) => formatCurrencyShort(v)}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelStyle={{ fontWeight: 600 }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="CA projete"
            fill="#3b82f6"
            fillOpacity={0.15}
            stroke="#3b82f6"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="Charges projetees"
            fill="#ef4444"
            fillOpacity={0.1}
            stroke="#ef4444"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="Marge"
            fill="#22c55e"
            fillOpacity={0.1}
            stroke="#22c55e"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary KPIs
// ---------------------------------------------------------------------------

function SummaryKpis({ projections }: { projections: BpProjection[] }) {
  const totals = useMemo(() => {
    let revenue = 0;
    let expenses = 0;
    let margin = 0;
    for (const p of projections) {
      revenue += p.revenue_projected;
      expenses += p.expenses_projected;
      margin += p.margin_projected;
    }
    const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0;
    return { revenue, expenses, margin, marginRate };
  }, [projections]);

  if (projections.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="CA annuel projete"
        value={formatCurrency(totals.revenue)}
        icon={DollarSign}
      />
      <KpiCard
        title="Charges annuelles"
        value={formatCurrency(totals.expenses)}
        icon={Wallet}
        variant="danger"
      />
      <KpiCard
        title="Marge annuelle"
        value={formatCurrency(totals.margin)}
        icon={totals.margin >= 0 ? TrendingUp : Wallet}
        variant={totals.margin >= 0 ? 'success' : 'danger'}
      />
      <KpiCard
        title="Taux de marge"
        value={formatPercentValue(totals.marginRate)}
        icon={Percent}
        variant={totals.marginRate >= 15 ? 'success' : totals.marginRate >= 5 ? 'warning' : 'danger'}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Narratives section
// ---------------------------------------------------------------------------

function NarrativesSection({
  narratives,
}: {
  narratives: Array<{ scenario: BpScenario; section: string; content: string }>;
}) {
  if (narratives.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generation des syntheses en cours...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {narratives.map((n) => (
        <Card key={`${n.scenario}-${n.section}`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              {NARRATIVE_SECTION_LABELS[n.section] ?? n.section}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {n.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BusinessPlanEditorPage({ id }: { id: string }) {
  const [activeScenario, setActiveScenario] = useState<BpScenario>('realistic');

  const { data: plan, isLoading, isError, refetch } = useBusinessPlan(id);
  const { data: projections } = useProjections(id, activeScenario);
  const { data: hypotheses } = useHypotheses(id, activeScenario);
  const updateHypothesisMutation = useUpdateHypothesis();

  const handleUpdateHypothesis = useCallback(
    (hypothesisId: string, value: number) => {
      updateHypothesisMutation.mutate({ hypothesisId, value });
    },
    [updateHypothesisMutation],
  );

  // Filter narratives by active scenario
  const scenarioNarratives = useMemo(() => {
    if (!plan?.narratives) return [];
    return plan.narratives.filter((n) => n.scenario === activeScenario);
  }, [plan?.narratives, activeScenario]);

  // ---------- Loading / Error ----------
  if (isLoading) return <LoadingState message="Chargement du business plan..." fullPage />;
  if (isError || !plan) {
    return <ErrorState message="Impossible de charger ce business plan." onRetry={refetch} />;
  }

  const isComputing = plan.status === 'computing';

  return (
    <div className="space-y-6">
      {/* Computing banner */}
      {isComputing && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Calcul en cours... Les donnees se mettront a jour automatiquement.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BackButton fallback="/business-plan" label="Business Plans" />
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Business Plan {plan.target_year}
          </h1>
          <StatusBadge
            status={bpStatusToBadgeVariant(plan.status)}
            label={BP_STATUS_LABELS[plan.status]}
          />
        </div>
      </div>

      {/* Scenario selector */}
      <ScenarioSelector active={activeScenario} onChange={setActiveScenario} />

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left column: chart + KPIs + narratives */}
        <div className="space-y-6">
          {/* Projection chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Projections mensuelles - {BP_SCENARIO_LABELS[activeScenario]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectionChart projections={projections ?? []} />
            </CardContent>
          </Card>

          {/* Summary KPIs */}
          <SummaryKpis projections={projections ?? []} />

          {/* Narratives */}
          <div>
            <h2 className="text-base font-semibold mb-3">Syntheses</h2>
            <NarrativesSection narratives={scenarioNarratives} />
          </div>
        </div>

        {/* Right column: hypotheses panel */}
        <div>
          <HypothesesPanel
            hypotheses={hypotheses ?? []}
            onUpdate={handleUpdateHypothesis}
            isPending={updateHypothesisMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
