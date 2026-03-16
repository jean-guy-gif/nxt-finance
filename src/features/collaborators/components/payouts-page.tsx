'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Wallet, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { KpiCard } from '@/components/shared/kpi-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { FilterBar, } from '@/components/shared/filter-bar';
import { SelectFilter } from '@/components/shared/period-filter';
import { DataTable } from '@/components/shared/data-table';
import { useToast } from '@/components/shared/toast';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useUiStore } from '@/stores/ui-store';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { PAYOUT_STATUSES, PAYOUT_STATUS_LABELS, type PayoutStatus } from '@/types/enums';
import { useActiveCollaborators, useUpdatePayoutStatus } from '../hooks/use-collaborators';
import { fetchPayouts, fetchPayoutKpis, type PayoutListItem } from '../services/payout-service';
import type { ColumnDef } from '@tanstack/react-table';

export function PayoutsPage() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const month = useUiStore((s) => s.selectedMonth);
  const year = useUiStore((s) => s.selectedYear);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [collabFilter, setCollabFilter] = useState<string>('all');

  const { data: collaborators } = useActiveCollaborators();
  const payoutMutation = useUpdatePayoutStatus();

  const list = useQuery({
    queryKey: ['payouts', agencyId, month, year, statusFilter, collabFilter],
    queryFn: () => {
      const supabase = createClient();
      return fetchPayouts(supabase, agencyId!, {
        status: statusFilter,
        collaboratorId: collabFilter !== 'all' ? collabFilter : undefined,
        month, year,
      });
    },
    enabled: !!agencyId,
  });

  const kpis = useQuery({
    queryKey: ['payout-kpis', agencyId, month, year],
    queryFn: () => {
      const supabase = createClient();
      return fetchPayoutKpis(supabase, agencyId!, month, year);
    },
    enabled: !!agencyId,
  });

  async function handleStatusChange(splitId: string, status: PayoutStatus) {
    try {
      await payoutMutation.mutateAsync({ splitId, status });
      const labels = { pending: 'remis en attente', paid: 'marqué reversé', cancelled: 'annulé' };
      toast(`Reversement ${labels[status]}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['payout-kpis'] });
    } catch {
      toast('Erreur lors de la mise à jour.', 'error');
    }
  }

  const activeFilterCount = (statusFilter !== 'pending' ? 1 : 0) + (collabFilter !== 'all' ? 1 : 0);

  const collabOptions = (collaborators ?? []).map((c) => c.id);
  const collabLabels = Object.fromEntries((collaborators ?? []).map((c) => [c.id, c.full_name]));

  const columns: ColumnDef<PayoutListItem, unknown>[] = [
    {
      accessorKey: 'collaborator',
      header: 'Collaborateur',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.collaborator.full_name}</span>
      ),
    },
    {
      accessorKey: 'revenue',
      header: 'Recette',
      cell: ({ row }) => (
        <a href={`/recettes/${row.original.revenue.id}`} className="text-sm text-primary hover:underline truncate max-w-[200px] block">
          {row.original.revenue.label}
        </a>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{formatDate(row.original.revenue.date)}</span>
      ),
    },
    {
      accessorKey: 'collaborator_amount',
      header: 'Montant',
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.collaborator_amount)}</span>
      ),
    },
    {
      accessorKey: 'payout_status',
      header: 'Statut',
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.payout_status === 'paid' ? 'validated' : row.original.payout_status === 'cancelled' ? 'draft' : 'to_verify'}
          label={PAYOUT_STATUS_LABELS[row.original.payout_status]}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const s = row.original.payout_status;
        return (
          <div className="flex gap-1 justify-end">
            {s === 'pending' && (
              <>
                <Button size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(row.original.id, 'paid')}>Reversé</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(row.original.id, 'cancelled')}>Annuler</Button>
              </>
            )}
            {s === 'paid' && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(row.original.id, 'pending')}>En attente</Button>
            )}
            {s === 'cancelled' && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(row.original.id, 'pending')}>Réactiver</Button>
            )}
          </div>
        );
      },
    },
  ];

  if (list.isLoading || kpis.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reversements" description="Suivi des reversements collaborateurs" backFallback="/" backLabel="Retour" />
        <LoadingState message="Chargement..." />
      </div>
    );
  }

  if (list.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reversements" description="Suivi des reversements collaborateurs" />
        <ErrorState onRetry={() => list.refetch()} />
      </div>
    );
  }

  const data = list.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Reversements" description="Suivi des reversements collaborateurs" backFallback="/" backLabel="Retour" />

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <KpiCard
          title="Total à reverser"
          value={kpis.data ? formatCurrency(kpis.data.totalPending) : '—'}
          subtitle={kpis.data ? `${kpis.data.countPending} reversement${kpis.data.countPending > 1 ? 's' : ''} en attente` : ''}
          icon={Wallet}
          variant="warning"
        />
        <KpiCard
          title="Reversé sur la période"
          value={kpis.data ? formatCurrency(kpis.data.totalPaidPeriod) : '—'}
          subtitle={kpis.data ? `${kpis.data.countPaidPeriod} reversement${kpis.data.countPaidPeriod > 1 ? 's' : ''} effectué${kpis.data.countPaidPeriod > 1 ? 's' : ''}` : ''}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Filters */}
      <FilterBar activeCount={activeFilterCount} onReset={() => { setStatusFilter('pending'); setCollabFilter('all'); }}>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={[...PAYOUT_STATUSES]}
          labels={PAYOUT_STATUS_LABELS}
          placeholder="Statut"
          allLabel="Tous statuts"
        />
        {collabOptions.length > 0 && (
          <SelectFilter
            value={collabFilter}
            onChange={setCollabFilter}
            options={collabOptions}
            labels={collabLabels as Record<string, string>}
            placeholder="Collaborateur"
            allLabel="Tous"
          />
        )}
      </FilterBar>

      {/* Table */}
      {data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun reversement"
          description="Les reversements apparaîtront ici lorsque des recettes seront liées à des collaborateurs indépendants ou agents commerciaux."
        />
      ) : (
        <DataTable columns={columns} data={data} searchable={false} />
      )}
    </div>
  );
}
