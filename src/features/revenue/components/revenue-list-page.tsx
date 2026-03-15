'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/shared/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { MobileCardList } from '@/components/shared/mobile-card-list';
import { ResponsiveView } from '@/components/shared/responsive-view';
import { FilterBar } from '@/components/shared/filter-bar';
import { RevenueStatusFilter, SelectFilter } from '@/components/shared/period-filter';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { useRevenues, useCreateRevenue } from '../hooks/use-revenues';
import { useUpsertSplit } from '@/features/collaborators/hooks/use-collaborators';
import { revenueColumns } from './revenue-columns';
import { RevenueMobileCard } from './revenue-mobile-card';
import { RevenueForm, type RevenueFormSubmitData } from './revenue-form';
import type { Revenue } from '@/types/models';
import type { RevenueStatus, RevenueType } from '@/types/enums';
import { REVENUE_TYPES, REVENUE_TYPE_LABELS } from '@/types/enums';

export function RevenueListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<RevenueStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<RevenueType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);

  // Read query params for drill-down
  useEffect(() => {
    const status = searchParams.get('status');
    if (status && status !== 'all') setStatusFilter(status as RevenueStatus);
    const type = searchParams.get('type');
    if (type && type !== 'all') setTypeFilter(type as RevenueType);
    if (searchParams.get('action') === 'new') setShowForm(true);
  }, [searchParams]);

  const filters = {
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
  };

  const { data: revenues, isLoading, isError, refetch } = useRevenues(filters);
  const createMutation = useCreateRevenue();
  const upsertSplitMutation = useUpsertSplit();
  const { toast } = useToast();

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0);

  function handleRowClick(revenue: Revenue) {
    router.push(`/recettes/${revenue.id}`);
  }

  async function handleCreate({ values, split }: RevenueFormSubmitData) {
    try {
      const revenue = await createMutation.mutateAsync({
        label: values.label,
        type: values.type,
        source: values.source || undefined,
        amount: values.amount,
        amount_ht: values.amount_ht && !isNaN(values.amount_ht) ? values.amount_ht : undefined,
        amount_ttc: values.amount_ttc && !isNaN(values.amount_ttc) ? values.amount_ttc : undefined,
        vat_amount: values.vat_amount && !isNaN(values.vat_amount) ? values.vat_amount : undefined,
        date: values.date,
        status: values.status,
        comment: values.comment || undefined,
      });
      // Create commission split if a collaborator is selected
      if (split) {
        await upsertSplitMutation.mutateAsync({
          revenueId: revenue.id,
          collaboratorId: split.collaboratorId,
          collaboratorType: split.collaboratorType,
          grossAmount: values.amount,
          networkRate: split.networkRate,
          collaboratorRate: split.collaboratorRate,
        });
      }
      toast('Recette créée avec succès', 'success');
      setShowForm(false);
    } catch {
      toast('Impossible de créer la recette. Vérifiez votre connexion.', 'error');
    }
  }

  function resetFilters() {
    setStatusFilter('all');
    setTypeFilter('all');
  }

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Recettes" description="Suivez vos recettes et encaissements" />
        <LoadingState message="Chargement des recettes..." />
      </div>
    );
  }

  // Error
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Recettes" description="Suivez vos recettes et encaissements" />
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  const data = revenues ?? [];
  const hasFiltersFromUrl = searchParams.toString().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recettes"
        description="Suivez vos recettes et encaissements"
        backFallback={hasFiltersFromUrl ? '/' : undefined}
        backLabel={hasFiltersFromUrl ? 'Retour' : undefined}
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une recette
          </Button>
        }
      />

      {data.length === 0 && activeFilterCount === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Aucune recette"
          description="Commencez par ajouter vos premières recettes pour suivre votre chiffre d'affaires."
          action={{
            label: 'Ajouter une recette',
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <>
          {/* Filters */}
          <FilterBar activeCount={activeFilterCount} onReset={resetFilters}>
            <RevenueStatusFilter value={statusFilter} onChange={setStatusFilter} />
            <SelectFilter
              value={typeFilter}
              onChange={setTypeFilter}
              options={REVENUE_TYPES}
              labels={REVENUE_TYPE_LABELS}
              placeholder="Type"
              allLabel="Tous types"
            />
          </FilterBar>

          {/* Table / Cards */}
          <ResponsiveView
            desktop={
              <DataTable
                columns={revenueColumns}
                data={data}
                searchPlaceholder="Rechercher une recette..."
                searchColumn="label"
                onRowClick={handleRowClick}
              />
            }
            mobile={
              data.length > 0 ? (
                <MobileCardList
                  data={data}
                  onItemClick={handleRowClick}
                  renderCard={(revenue) => (
                    <RevenueMobileCard revenue={revenue} />
                  )}
                />
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Aucun résultat avec ces filtres
                </p>
              )
            }
          />
        </>
      )}

      {/* Create dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle recette</DialogTitle>
          </DialogHeader>
          <RevenueForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
