'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import {
  RefreshCw,
  Trophy,
  AlertTriangle,
  BarChart3,
  Users,
  TrendingUp,
  Target,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { KpiCard } from '@/components/shared/kpi-card';
import { DataTable } from '@/components/shared/data-table';
import { cn } from '@/lib/utils';
import type { ProfitabilitySnapshot } from '@/types/models';
import {
  useProfitabilitySnapshots,
  useDirectorSummary,
  useActivityProfitability,
  useRefreshProfitability,
} from '../hooks/use-profitability';

// --- Formatting helpers ---

function formatCurrency(value: number): string {
  return (
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) +
    ' \u20ac'
  );
}

function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

// --- Tab types ---

type PilotageTab = 'collaborator' | 'activity' | 'agency';

const TAB_OPTIONS: { key: PilotageTab; label: string }[] = [
  { key: 'collaborator', label: 'Par collaborateur' },
  { key: 'activity', label: 'Par activit\u00e9' },
  { key: 'agency', label: 'Vue agence' },
];

// --- Margin color helper ---

function marginColorClass(rate: number): string {
  if (rate < 0) return 'text-red-700 dark:text-red-400';
  if (rate < 10) return 'text-red-600 dark:text-red-400';
  if (rate < 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function marginBadgeVariant(rate: number): 'validated' | 'vigilance' | 'critical' {
  if (rate >= 30) return 'validated';
  if (rate >= 10) return 'vigilance';
  return 'critical';
}

// --- Column definitions ---

const collaboratorColumns: ColumnDef<ProfitabilitySnapshot, unknown>[] = [
  {
    accessorKey: 'scope_label',
    header: 'Collaborateur',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.scope_label}</span>
    ),
  },
  {
    accessorKey: 'revenue_total',
    header: 'CA g\u00e9n\u00e9r\u00e9',
    cell: ({ row }) => formatCurrency(row.original.revenue_total),
  },
  {
    accessorKey: 'cost_total',
    header: 'Co\u00fbt',
    cell: ({ row }) => formatCurrency(row.original.cost_total),
  },
  {
    accessorKey: 'margin',
    header: 'Marge',
    cell: ({ row }) => (
      <span className={cn(row.original.margin < 0 && 'text-red-600')}>
        {formatCurrency(row.original.margin)}
      </span>
    ),
  },
  {
    accessorKey: 'margin_rate',
    header: 'Taux marge',
    cell: ({ row }) => (
      <span className={marginColorClass(row.original.margin_rate)}>
        {formatPercent(row.original.margin_rate)}
      </span>
    ),
  },
  {
    accessorKey: 'cost_revenue_ratio',
    header: 'Ratio co\u00fbt/CA',
    cell: ({ row }) => formatPercent(row.original.cost_revenue_ratio),
  },
  {
    id: 'status',
    header: 'Statut',
    cell: ({ row }) => {
      const rate = row.original.margin_rate;
      const variant = marginBadgeVariant(rate);
      const label =
        rate >= 30
          ? 'Rentable'
          : rate >= 10
            ? 'Vigilance'
            : rate >= 0
              ? 'Faible'
              : 'D\u00e9ficitaire';
      return <StatusBadge status={variant} label={label} />;
    },
    enableSorting: false,
  },
];

// --- Director Summary Banner ---

function DirectorSummaryBanner() {
  const { data: summary, isLoading } = useDirectorSummary();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingState message="Chargement du r\u00e9sum\u00e9 directeur..." />
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Aucune donn\u00e9e de rentabilit\u00e9 disponible pour cette p\u00e9riode.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-6 space-y-4">
        {/* Main margin */}
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">Marge agence :</h2>
          <span
            className={cn(
              'text-2xl font-bold',
              summary.agencyMargin < 0 ? 'text-red-600' : 'text-emerald-600'
            )}
          >
            {formatCurrency(summary.agencyMargin)}
          </span>
          <span className="text-muted-foreground">
            ({formatPercent(summary.agencyMarginRate)})
          </span>
        </div>

        {/* Insights grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {summary.bestCollaborator && (
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                Meilleur : {summary.bestCollaborator.name} (
                {formatPercent(summary.bestCollaborator.marginRate)} marge)
              </span>
            </div>
          )}

          {summary.worstCollaborator && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                Vigilance : {summary.worstCollaborator.name} (
                {formatPercent(summary.worstCollaborator.marginRate)} marge)
              </span>
            </div>
          )}

          {summary.bestActivity && (
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500 shrink-0" />
              <span>
                Top activit\u00e9 : {summary.bestActivity.name} (
                {formatCurrency(summary.bestActivity.revenue)})
              </span>
            </div>
          )}

          {summary.vigilancePoint && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-red-600">{summary.vigilancePoint}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Tab: Par collaborateur ---

function CollaboratorTab() {
  const router = useRouter();
  const { data, isLoading } = useProfitabilitySnapshots('collaborator');

  if (isLoading) {
    return <LoadingState message="Chargement des donn\u00e9es collaborateurs..." />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aucune donn\u00e9e collaborateur"
        description="Lancez un calcul de rentabilit\u00e9 pour cette p\u00e9riode afin de g\u00e9n\u00e9rer les snapshots."
      />
    );
  }

  return (
    <SectionCard title="Rentabilit\u00e9 par collaborateur" noPadding>
      <DataTable
        columns={collaboratorColumns}
        data={data}
        searchable
        searchPlaceholder="Rechercher un collaborateur..."
        searchColumn="scope_label"
        onRowClick={(row) =>
          router.push(`/pilotage/collaborateur/${row.scope_id}`)
        }
      />
    </SectionCard>
  );
}

// --- Tab: Par activit\u00e9 ---

function ActivityTab() {
  const { data, isLoading } = useActivityProfitability();

  if (isLoading) {
    return <LoadingState message="Chargement des donn\u00e9es par activit\u00e9..." />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Aucune donn\u00e9e par activit\u00e9"
        description="Lancez un calcul de rentabilit\u00e9 pour cette p\u00e9riode afin de g\u00e9n\u00e9rer les snapshots."
      />
    );
  }

  const totalRevenue = data.reduce((sum, s) => sum + s.revenue_total, 0);

  const activityColumns: ColumnDef<ProfitabilitySnapshot, unknown>[] = [
    {
      accessorKey: 'scope_label',
      header: 'Activit\u00e9',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.scope_label}</span>
      ),
    },
    {
      accessorKey: 'revenue_total',
      header: 'CA',
      cell: ({ row }) => formatCurrency(row.original.revenue_total),
    },
    {
      id: 'revenue_share',
      header: 'Part du CA (%)',
      cell: ({ row }) =>
        totalRevenue > 0
          ? formatPercent((row.original.revenue_total / totalRevenue) * 100)
          : '0.0%',
      enableSorting: false,
    },
    {
      accessorKey: 'cost_total',
      header: 'Co\u00fbt estim\u00e9',
      cell: ({ row }) => formatCurrency(row.original.cost_total),
    },
    {
      accessorKey: 'margin',
      header: 'Marge',
      cell: ({ row }) => (
        <span className={cn(row.original.margin < 0 && 'text-red-600')}>
          {formatCurrency(row.original.margin)}
        </span>
      ),
    },
    {
      accessorKey: 'margin_rate',
      header: 'Taux marge',
      cell: ({ row }) => (
        <span className={marginColorClass(row.original.margin_rate)}>
          {formatPercent(row.original.margin_rate)}
        </span>
      ),
    },
  ];

  return (
    <SectionCard title="Rentabilit\u00e9 par activit\u00e9" noPadding>
      <DataTable
        columns={activityColumns}
        data={data}
        searchable={false}
      />
    </SectionCard>
  );
}

// --- Tab: Vue agence ---

function AgencyTab() {
  const { data, isLoading } = useProfitabilitySnapshots('agency');

  if (isLoading) {
    return <LoadingState message="Chargement des donn\u00e9es agence..." />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Aucune donn\u00e9e agence"
        description="Lancez un calcul de rentabilit\u00e9 pour cette p\u00e9riode afin de g\u00e9n\u00e9rer le snapshot agence."
      />
    );
  }

  const agency = data[0];
  const marginVariant: 'default' | 'success' | 'warning' | 'danger' =
    agency.margin_rate >= 30
      ? 'success'
      : agency.margin_rate >= 10
        ? 'warning'
        : 'danger';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="CA total"
          value={formatCurrency(agency.revenue_total)}
          icon={TrendingUp}
          variant="default"
        />
        <KpiCard
          title="Charges totales"
          value={formatCurrency(agency.cost_total)}
          icon={Target}
          variant="warning"
        />
        <KpiCard
          title="Marge"
          value={formatCurrency(agency.margin)}
          icon={BarChart3}
          variant={marginVariant}
        />
        <KpiCard
          title="Taux de marge"
          value={formatPercent(agency.margin_rate)}
          icon={TrendingUp}
          variant={marginVariant}
        />
      </div>

      <div className="flex items-center">
        <a
          href="/pilotage"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Voir l&apos;analyse financi\u00e8re compl\u00e8te
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

// --- Main Page ---

export function PilotagePage() {
  const [activeTab, setActiveTab] = useState<PilotageTab>('collaborator');
  const refreshMutation = useRefreshProfitability();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Pilotage rentabilit\u00e9"
        description="Suivi de la rentabilit\u00e9 par collaborateur, activit\u00e9 et agence"
        actions={
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            variant="outline"
            size="sm"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Recalculer
          </Button>
        }
      />

      {/* Director Summary Banner */}
      <DirectorSummaryBanner />

      {/* Tab navigation */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {TAB_OPTIONS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'flex-1',
              activeTab !== tab.key && 'text-muted-foreground'
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Active tab content */}
      {activeTab === 'collaborator' && <CollaboratorTab />}
      {activeTab === 'activity' && <ActivityTab />}
      {activeTab === 'agency' && <AgencyTab />}
    </div>
  );
}
