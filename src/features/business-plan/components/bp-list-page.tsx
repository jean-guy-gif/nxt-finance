'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/formatters';
import { useBusinessPlans, useCreateBusinessPlan } from '../hooks/use-business-plans';
import { useAnalyses } from '@/features/analyse/hooks/use-analyses';
import { BP_STATUS_LABELS } from '../types';
import type { BpStatus } from '../types';
import type { BusinessPlan } from '@/types/models';

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

// ---------------------------------------------------------------------------
// Year selector
// ---------------------------------------------------------------------------

function YearSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (year: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1, currentYear + 2];

  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-md border bg-background px-3 py-2 text-sm"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Plan card
// ---------------------------------------------------------------------------

function PlanCard({
  plan,
  onClick,
}: {
  plan: BusinessPlan;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold tabular-nums">
            {plan.target_year}
          </span>
          <StatusBadge
            status={bpStatusToBadgeVariant(plan.status)}
            label={BP_STATUS_LABELS[plan.status]}
          />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(plan.created_at)}
          </span>
          <span>v{plan.version_number}</span>
          {plan.is_current && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              Actuel
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BusinessPlanListPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [targetYear, setTargetYear] = useState(currentYear + 1);

  const { data: plans, isLoading } = useBusinessPlans();
  const { data: analyses } = useAnalyses();
  const createMutation = useCreateBusinessPlan();

  // Get the latest ready analysis id to link to new plans
  const latestAnalysisId = useMemo(() => {
    if (!analyses || analyses.length === 0) return undefined;
    const ready = analyses.filter((a) => a.status === 'ready');
    if (ready.length === 0) return undefined;
    return ready.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0].id;
  }, [analyses]);

  const handleCreate = () => {
    createMutation.mutate(
      { targetYear, analysisId: latestAnalysisId },
      {
        onSuccess: (data) => {
          router.push(`/business-plan/${data.planId}`);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Business Plans" />
        <LoadingState message="Chargement..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Plans"
        description="Projections financieres N+1"
        actions={
          <div className="flex items-center gap-3">
            <YearSelector value={targetYear} onChange={setTargetYear} />
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Nouveau plan
            </Button>
          </div>
        }
      />

      {(!plans || plans.length === 0) ? (
        <EmptyState
          icon={TrendingUp}
          title="Aucun business plan"
          description="Creez votre premier business plan pour projeter votre activite."
          action={{
            label: 'Creer un business plan',
            onClick: handleCreate,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onClick={() => router.push(`/business-plan/${plan.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
