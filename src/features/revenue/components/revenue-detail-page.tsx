'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoGuard, DemoBlockDialog } from '@/components/shared/demo-guard';
import { BackButton } from '@/components/shared/back-button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SectionCard } from '@/components/shared/section-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { formatCurrency, formatDate, formatDateLong } from '@/lib/formatters';
import {
  REVENUE_STATUS_LABELS,
  REVENUE_TYPE_LABELS,
} from '@/types/enums';
import { useRevenue, useRevenueReceipts, useUpdateRevenue, useDeleteRevenue } from '../hooks/use-revenues';
import { RevenueForm } from './revenue-form';
import type { RevenueFormValues } from './revenue-schema';
import Link from 'next/link';

interface Props {
  id: string;
}

export function RevenueDetailPage({ id }: Props) {
  const router = useRouter();
  const { data: revenue, isLoading, isError, refetch } = useRevenue(id);
  const { data: receipts } = useRevenueReceipts(id);
  const updateMutation = useUpdateRevenue();
  const deleteMutation = useDeleteRevenue();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { guard, showBlock, setShowBlock } = useDemoGuard();

  if (isLoading) return <LoadingState message="Chargement de la recette..." fullPage />;
  if (isError || !revenue) {
    return <ErrorState message="Impossible de charger cette recette." onRetry={refetch} />;
  }

  async function handleUpdate(values: RevenueFormValues) {
    await updateMutation.mutateAsync({
      id,
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
    setShowEdit(false);
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync(id);
    router.push('/recettes');
  }

  const canDelete = revenue.status === 'draft';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton fallback="/recettes" label="Recettes" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{revenue.label}</h1>
              <StatusBadge
                status={revenue.status}
                label={REVENUE_STATUS_LABELS[revenue.status]}
              />
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {REVENUE_TYPE_LABELS[revenue.type]}
              {revenue.source ? ` — ${revenue.source}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-11 sm:ml-0">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Edit2 className="mr-2 h-3.5 w-3.5" />
            Modifier
          </Button>
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => guard(() => setShowDelete(true))}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Supprimer
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Main info */}
        <SectionCard title="Informations" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
            <Detail label="Date" value={formatDateLong(revenue.date)} />
            <Detail label="Montant principal" value={formatCurrency(revenue.amount)} bold />
            <Detail
              label="Statut"
              value={REVENUE_STATUS_LABELS[revenue.status]}
            />
            {revenue.amount_ht != null && (
              <Detail label="Montant HT" value={formatCurrency(revenue.amount_ht)} />
            )}
            {revenue.amount_ttc != null && (
              <Detail label="Montant TTC" value={formatCurrency(revenue.amount_ttc)} />
            )}
            {revenue.vat_amount != null && (
              <Detail label="TVA" value={formatCurrency(revenue.vat_amount)} />
            )}
            {revenue.source && <Detail label="Source" value={revenue.source} />}
            {revenue.comment && (
              <div className="col-span-full">
                <Detail label="Commentaire" value={revenue.comment} />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
            {revenue.creator && <span>Créé par {revenue.creator.full_name}</span>}
            <span>Créé le {formatDate(revenue.created_at)}</span>
            <span>Modifié le {formatDate(revenue.updated_at)}</span>
          </div>
        </SectionCard>

        {/* Linked receipts — ready for future attachment */}
        <SectionCard title="Pièces jointes">
          {receipts && receipts.length > 0 ? (
            <div className="space-y-2">
              {receipts.map((r) => (
                <div key={r.id} className="flex items-center gap-2 p-2 rounded border text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{r.file_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="Aucune pièce jointe"
              description="Les justificatifs pourront être rattachés à cette recette."
            />
          )}
        </SectionCard>
      </div>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la recette</DialogTitle>
          </DialogHeader>
          <RevenueForm
            revenue={revenue}
            onSubmit={handleUpdate}
            onCancel={() => setShowEdit(false)}
            isSubmitting={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Supprimer la recette"
        description="Cette action est irréversible. La recette sera définitivement supprimée."
        confirmLabel="Supprimer"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      <DemoBlockDialog open={showBlock} onOpenChange={setShowBlock} />
    </div>
  );
}

function Detail({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={bold ? 'text-base font-semibold' : 'text-sm'}>{value}</p>
    </div>
  );
}
