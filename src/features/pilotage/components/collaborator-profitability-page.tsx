'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  BarChart3,
  Percent,
  FileBarChart,
} from 'lucide-react';

import { BackButton } from '@/components/shared/back-button';
import { KpiCard } from '@/components/shared/kpi-card';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { useCollaboratorProfitability } from '../hooks/use-profitability';
import { COLLABORATOR_TYPE_LABELS } from '@/types/enums';
import type { CollaboratorType } from '@/types/enums';
import type { ProfitabilitySnapshot } from '@/types/models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_LABELS: Record<number, string> = {
  1: 'Jan',
  2: 'Fev',
  3: 'Mar',
  4: 'Avr',
  5: 'Mai',
  6: 'Juin',
  7: 'Juil',
  8: 'Aou',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dec',
};

function formatCurrency(value: number): string {
  return (
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) +
    ' €'
  );
}

function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

function marginVariant(rate: number): 'success' | 'warning' | 'danger' {
  if (rate >= 30) return 'success';
  if (rate >= 15) return 'warning';
  return 'danger';
}

function marginBadgeClass(rate: number): string {
  if (rate >= 30) return 'bg-emerald-500/10 text-emerald-700';
  if (rate >= 15) return 'bg-amber-500/10 text-amber-700';
  return 'bg-red-500/10 text-red-700';
}

// ---------------------------------------------------------------------------
// Inline hook — fetch single collaborator
// ---------------------------------------------------------------------------

function useCollaborator(id: string) {
  return useQuery({
    queryKey: ['collaborator', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, full_name, type, status')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as {
        id: string;
        full_name: string;
        type: CollaboratorType;
        status: string;
      };
    },
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CollaboratorProfitabilityPage({ id }: { id: string }) {
  const { data: collaborator, isLoading: loadingCollab } = useCollaborator(id);
  const { data: snapshots, isLoading: loadingSnapshots } =
    useCollaboratorProfitability(id);

  // Sort snapshots chronologically (oldest first) for chart
  const sorted = useMemo(() => {
    if (!snapshots) return [];
    return [...snapshots].sort((a, b) => {
      if (a.period_year !== b.period_year) return a.period_year - b.period_year;
      return a.period_month - b.period_month;
    });
  }, [snapshots]);

  // Latest & previous month snapshots
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  // Chart data
  const chartData = useMemo(
    () =>
      sorted.map((s) => ({
        month: `${MONTH_LABELS[s.period_month]} ${String(s.period_year).slice(2)}`,
        CA: s.revenue_total,
        'Coût': s.cost_total,
        Marge: s.margin,
      })),
    [sorted],
  );

  // Table data (desc)
  const tableData = useMemo(() => [...sorted].reverse(), [sorted]);

  // ---------- Delta helpers ----------
  function delta(
    current: number,
    prev: number | undefined,
  ): { value: number; label: string } | undefined {
    if (prev === undefined || prev === 0) return undefined;
    const pct = ((current - prev) / Math.abs(prev)) * 100;
    return { value: Math.round(pct * 10) / 10, label: 'vs mois préc.' };
  }

  // ---------- Loading / Empty ----------
  if (loadingCollab || loadingSnapshots) {
    return <LoadingState message="Chargement de la rentabilité..." />;
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BackButton fallback="/pilotage" label="Pilotage" />
          <h1 className="text-xl font-semibold">
            {collaborator?.full_name ?? 'Collaborateur'}
          </h1>
        </div>
        <EmptyState
          icon={FileBarChart}
          title="Aucune donnée"
          description="Aucune donnée de rentabilité pour ce collaborateur"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ====== Header ====== */}
      <div className="flex items-center gap-3 flex-wrap">
        <BackButton fallback="/pilotage" label="Pilotage" />
        <h1 className="text-xl font-semibold">
          {collaborator?.full_name ?? latest?.scope_label ?? 'Collaborateur'}
        </h1>
        {collaborator && (
          <Badge variant="secondary">
            {COLLABORATOR_TYPE_LABELS[collaborator.type] ?? collaborator.type}
          </Badge>
        )}
        {latest && (
          <Badge className={marginBadgeClass(latest.margin_rate)}>
            Marge {formatPercent(latest.margin_rate)}
          </Badge>
        )}
      </div>

      {/* ====== KPI Cards ====== */}
      {latest && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="CA généré"
            value={formatCurrency(latest.revenue_total)}
            icon={DollarSign}
            trend={delta(latest.revenue_total, previous?.revenue_total)}
          />
          <KpiCard
            title="Coût total"
            value={formatCurrency(latest.cost_total)}
            icon={Wallet}
            variant="danger"
            trend={delta(latest.cost_total, previous?.cost_total)}
          />
          <KpiCard
            title="Marge nette"
            value={formatCurrency(latest.margin)}
            icon={latest.margin >= 0 ? TrendingUp : TrendingDown}
            variant={marginVariant(latest.margin_rate)}
            trend={delta(latest.margin, previous?.margin)}
          />
          <KpiCard
            title="Taux de marge"
            value={formatPercent(latest.margin_rate)}
            icon={Percent}
            variant={marginVariant(latest.margin_rate)}
            trend={delta(latest.margin_rate, previous?.margin_rate)}
          />
        </div>
      )}

      {/* ====== Evolution Chart ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Évolution sur 12 mois
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend />
                <Bar dataKey="CA" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Coût" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Marge" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ====== Detail Table ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail mensuel</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead className="text-right">CA</TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead className="text-right">Marge</TableHead>
                <TableHead className="text-right">Taux</TableHead>
                <TableHead className="text-right">Ratio coût/CA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((s) => (
                <TableRow key={`${s.period_year}-${s.period_month}`}>
                  <TableCell className="font-medium">
                    {MONTH_LABELS[s.period_month]} {s.period_year}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(s.revenue_total)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(s.cost_total)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(s.margin)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={s.margin_rate >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {formatPercent(s.margin_rate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(s.cost_revenue_ratio)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
