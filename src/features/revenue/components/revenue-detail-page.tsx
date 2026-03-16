'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, FileText, Users, Building2, Landmark } from 'lucide-react';
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
  COLLABORATOR_TYPE_LABELS,
  PAYOUT_STATUS_LABELS,
  COMPENSATION_TYPE_LABELS,
  getCompensationType,
} from '@/types/enums';
import { useRevenue, useRevenueReceipts, useUpdateRevenue, useDeleteRevenue } from '../hooks/use-revenues';
import { useCommissionSplit, useUpsertSplit, useDeleteSplit, useUpdatePayoutStatus } from '@/features/collaborators/hooks/use-collaborators';
import { useToast } from '@/components/shared/toast';
import { RevenueForm, type RevenueFormSubmitData } from './revenue-form';
import type { PayoutStatus } from '@/types/enums';
import Link from 'next/link';

interface Props {
  id: string;
}

export function RevenueDetailPage({ id }: Props) {
  const router = useRouter();
  const { data: revenue, isLoading, isError, refetch } = useRevenue(id);
  const { data: receipts } = useRevenueReceipts(id);
  const { data: split } = useCommissionSplit(id);
  const updateMutation = useUpdateRevenue();
  const deleteMutation = useDeleteRevenue();
  const upsertSplitMutation = useUpsertSplit();
  const deleteSplitMutation = useDeleteSplit();
  const payoutMutation = useUpdatePayoutStatus();
  const { toast } = useToast();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { guard, showBlock, setShowBlock } = useDemoGuard();

  async function handlePayoutChange(splitId: string, status: PayoutStatus) {
    try {
      await payoutMutation.mutateAsync({ splitId, status });
      const labels = { pending: 'remis en attente', paid: 'marqué comme reversé', cancelled: 'annulé' };
      toast(`Reversement ${labels[status]}`, 'success');
    } catch {
      toast('Impossible de modifier le statut du reversement.', 'error');
    }
  }

  if (isLoading) return <LoadingState message="Chargement de la recette..." fullPage />;
  if (isError || !revenue) {
    return <ErrorState message="Impossible de charger cette recette." onRetry={refetch} />;
  }

  async function handleUpdate({ values, split: splitData }: RevenueFormSubmitData) {
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
    // Update or delete commission split
    if (splitData) {
      await upsertSplitMutation.mutateAsync({
        revenueId: id,
        collaboratorId: splitData.collaboratorId,
        collaboratorType: splitData.collaboratorType,
        grossAmount: values.amount,
        networkRate: splitData.networkRate,
        collaboratorRate: splitData.collaboratorRate,
      });
    } else if (split) {
      // Collaborator was removed → delete the split
      await deleteSplitMutation.mutateAsync(id);
    }
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

        {/* Commission split */}
        {split && split.collaborator && (
          <SectionCard title="Répartition de la commission">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{split.collaborator.full_name}</span>
                <span className="text-xs text-muted-foreground">
                  {COLLABORATOR_TYPE_LABELS[split.collaborator.type]}
                </span>
                <StatusBadge
                  status={split.payout_status === 'paid' ? 'validated' : split.payout_status === 'cancelled' ? 'draft' : 'to_verify'}
                  label={PAYOUT_STATUS_LABELS[split.payout_status]}
                />
              </div>

              <div className="rounded-md border p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission brute</span>
                  <span className="font-medium">{formatCurrency(split.gross_amount)}</span>
                </div>
                {split.network_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Landmark className="h-3 w-3" />Réseau ({split.network_rate}%)</span>
                    <span>− {formatCurrency(split.network_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Building2 className="h-3 w-3" />Part agence ({split.agency_rate}%)</span>
                  <span className="font-semibold text-primary">{formatCurrency(split.agency_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {split.collaborator.type === 'salarie' ? 'Coût salarial estimé' : 'Part collaborateur'} ({split.collaborator_rate}%)
                  </span>
                  <span className={`font-semibold ${split.collaborator.type === 'salarie' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(split.collaborator_amount)}
                  </span>
                </div>
              </div>

              {/* Payout actions — only for reversement (independents/agents) */}
              {split.collaborator.type !== 'salarie' && (
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="text-xs text-muted-foreground">
                    {split.payout_status === 'paid' && split.paid_at && (
                      <span>Reversé le {formatDateLong(split.paid_at)}</span>
                    )}
                    {split.payout_status === 'cancelled' && (
                      <span>Reversement annulé</span>
                    )}
                    {split.payout_status === 'pending' && (
                      <span>En attente de reversement</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {split.payout_status === 'pending' && (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handlePayoutChange(split.id, 'paid')}
                        disabled={payoutMutation.isPending}
                      >
                        Marquer reversé
                      </Button>
                    )}
                    {split.payout_status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handlePayoutChange(split.id, 'cancelled')}
                        disabled={payoutMutation.isPending}
                      >
                        Annuler
                      </Button>
                    )}
                    {split.payout_status === 'paid' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handlePayoutChange(split.id, 'pending')}
                        disabled={payoutMutation.isPending}
                      >
                        Remettre en attente
                      </Button>
                    )}
                    {split.payout_status === 'cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handlePayoutChange(split.id, 'pending')}
                        disabled={payoutMutation.isPending}
                      >
                        Réactiver
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {split.collaborator.type === 'salarie' && (
                <p className="text-[10px] text-muted-foreground/70">
                  Indicateur de pilotage — ne constitue pas un calcul de paie ou de charges sociales.
                </p>
              )}
            </div>
          </SectionCard>
        )}

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
            existingCollaboratorId={split?.collaborator_id ?? null}
            existingNetworkRate={split?.network_rate}
            existingCollaboratorRate={split?.collaborator_rate}
            onSubmit={handleUpdate}
            onCancel={() => setShowEdit(false)}
            isSubmitting={updateMutation.isPending || upsertSplitMutation.isPending}
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
