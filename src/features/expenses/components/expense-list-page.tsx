'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Receipt, Plus, Upload } from 'lucide-react';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
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
import {
  ExpenseStatusFilter,
  CategoryFilter,
} from '@/components/shared/period-filter';
import { FileUpload } from '@/components/shared/file-upload';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { useExpenses, useCreateExpense, useUploadReceipt } from '../hooks/use-expenses';
import { expenseColumns } from './expense-columns';
import { ExpenseMobileCard } from './expense-mobile-card';
import { ExpenseForm } from './expense-form';
import type { ExpenseFormValues } from './expense-schema';
import type { Expense } from '@/types/models';
import type { ExpenseStatus, ExpenseCategory } from '@/types/enums';

export function ExpenseListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [missingReceiptFilter, setMissingReceiptFilter] = useState(false);
  const [receiptStatusFilter, setReceiptStatusFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Read query params for drill-down filters
  useEffect(() => {
    const status = searchParams.get('status');
    if (status && status !== 'all') setStatusFilter(status as ExpenseStatus);
    const category = searchParams.get('category');
    if (category && category !== 'all') setCategoryFilter(category as ExpenseCategory);
    if (searchParams.get('missing_receipt') === '1') setMissingReceiptFilter(true);
    const rStatus = searchParams.get('receipt_status');
    if (rStatus) setReceiptStatusFilter(rStatus);
    if (searchParams.get('action') === 'new') setShowForm(true);
    if (searchParams.get('action') === 'upload') setShowUpload(true);
  }, [searchParams]);

  const filters = {
    ...(missingReceiptFilter ? { missingReceipt: true } : {}),
    ...(receiptStatusFilter ? { receiptStatus: receiptStatusFilter } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
  };

  const { data: expenses, isLoading, isError, refetch } = useExpenses(filters);
  const createMutation = useCreateExpense();
  const uploadMutation = useUploadReceipt();

  const { toast } = useToast();

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0) + (missingReceiptFilter ? 1 : 0) + (receiptStatusFilter ? 1 : 0);

  function handleRowClick(expense: Expense) {
    router.push(`/depenses/${expense.id}`);
  }

  async function handleCreate(values: ExpenseFormValues) {
    try {
      await createMutation.mutateAsync({
        supplier: values.supplier,
        category: values.category,
        amount_ttc: values.amount_ttc,
        amount_ht: values.amount_ht && !isNaN(values.amount_ht) ? values.amount_ht : undefined,
        vat_amount: values.vat_amount && !isNaN(values.vat_amount) ? values.vat_amount : undefined,
        date: values.date,
        payment_method: values.payment_method || undefined,
        status: values.status,
        comment: values.comment || undefined,
      });
      toast('Dépense créée avec succès', 'success');
      setShowForm(false);
    } catch {
      toast('Impossible de créer la dépense. Vérifiez votre connexion.', 'error');
    }
  }

  async function handleUpload(files: File[]) {
    try {
      for (const file of files) {
        await uploadMutation.mutateAsync({
          file,
          source: 'upload',
        });
      }
      toast('Justificatif envoyé avec succès', 'success');
      setShowUpload(false);
    } catch {
      toast('Échec de l\'envoi du fichier. Vérifiez votre connexion.', 'error');
    }
  }

  function resetFilters() {
    setStatusFilter('all');
    setCategoryFilter('all');
    setMissingReceiptFilter(false);
    setReceiptStatusFilter(null);
    router.replace('/depenses');
  }

  const hasFiltersFromUrl = searchParams.toString().length > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dépenses" description="Gérez vos dépenses et justificatifs" backFallback={hasFiltersFromUrl ? '/' : undefined} backLabel={hasFiltersFromUrl ? 'Retour' : undefined} />
        <LoadingState message="Chargement des dépenses..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dépenses" description="Gérez vos dépenses et justificatifs" />
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  const data = expenses ?? [];
  const hasActiveFiltersFromUrl = searchParams.toString().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dépenses"
        description="Gérez vos dépenses et justificatifs"
        backFallback={hasActiveFiltersFromUrl ? '/' : undefined}
        backLabel={hasActiveFiltersFromUrl ? 'Retour' : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowUpload(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Justificatif
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une dépense
            </Button>
          </div>
        }
      />

      {data.length === 0 && activeFilterCount === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Aucune dépense"
          description="Ajoutez vos dépenses et justificatifs pour centraliser votre suivi."
          action={{
            label: 'Ajouter une dépense',
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <>
          <FilterBar activeCount={activeFilterCount} onReset={resetFilters}>
            <ExpenseStatusFilter value={statusFilter} onChange={setStatusFilter} />
            <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} />
          </FilterBar>

          <ResponsiveView
            desktop={
              <DataTable
                columns={expenseColumns}
                data={data}
                searchPlaceholder="Rechercher un fournisseur..."
                searchColumn="supplier"
                onRowClick={handleRowClick}
              />
            }
            mobile={
              data.length > 0 ? (
                <MobileCardList
                  data={data}
                  onItemClick={handleRowClick}
                  renderCard={(expense) => (
                    <ExpenseMobileCard expense={expense} />
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

      {/* Create expense dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle dépense</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Upload receipt dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un justificatif</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-1">
            Le justificatif sera ajouté en attente de rattachement à une dépense.
          </p>
          <p className="text-xs text-muted-foreground/70 mb-3">
            Le pré-remplissage automatique (OCR) n'est pas encore disponible. Vous devrez saisir les informations manuellement.
          </p>
          <FileUpload
            onFilesSelected={handleUpload}
            isUploading={uploadMutation.isPending}
            multiple
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
