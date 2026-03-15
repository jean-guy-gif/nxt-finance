'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, Upload, FileText } from 'lucide-react';
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
import { FileUpload } from '@/components/shared/file-upload';
import { formatCurrency, formatDate, formatDateLong } from '@/lib/formatters';
import {
  EXPENSE_STATUS_LABELS,
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/types/enums';
import {
  useExpense,
  useExpenseReceipts,
  useUpdateExpense,
  useDeleteExpense,
  useUploadReceipt,
  useUnlinkReceipt,
  useDeleteReceipt,
} from '../hooks/use-expenses';
import { getReceiptUrl } from '../services/receipt-service';
import { createClient } from '@/lib/supabase/client';
import { ExpenseForm } from './expense-form';
import { ReceiptCard } from './receipt-card';
import type { ExpenseFormValues } from './expense-schema';
import type { ReceiptDocument } from '@/types/models';

interface Props {
  id: string;
}

export function ExpenseDetailPage({ id }: Props) {
  const router = useRouter();
  const { data: expense, isLoading, isError, refetch } = useExpense(id);
  const { data: receipts, refetch: refetchReceipts } = useExpenseReceipts(id);
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const uploadMutation = useUploadReceipt();
  const unlinkMutation = useUnlinkReceipt();
  const deleteReceiptMutation = useDeleteReceipt();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { guard, showBlock, setShowBlock } = useDemoGuard();
  const [showUpload, setShowUpload] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  if (isLoading) return <LoadingState message="Chargement de la dépense..." fullPage />;
  if (isError || !expense) {
    return <ErrorState message="Impossible de charger cette dépense." onRetry={refetch} />;
  }

  async function handleUpdate(values: ExpenseFormValues) {
    await updateMutation.mutateAsync({
      id,
      supplier: values.supplier,
      category: values.category,
      amount_ttc: values.amount_ttc,
      amount_ht: values.amount_ht && !isNaN(values.amount_ht) ? values.amount_ht : undefined,
      vat_amount: values.vat_amount && !isNaN(values.vat_amount) ? values.vat_amount : undefined,
      date: values.date,
      payment_method: values.payment_method || null,
      status: values.status,
      comment: values.comment || undefined,
    });
    setShowEdit(false);
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync(id);
    router.push('/depenses');
  }

  async function handleUpload(files: File[]) {
    for (const file of files) {
      await uploadMutation.mutateAsync({
        file,
        source: 'upload',
        related_type: 'expense',
        related_id: id,
      });
    }
    setShowUpload(false);
    refetchReceipts();
  }

  async function handleDownloadReceipt(receipt: ReceiptDocument) {
    setDocError(null);
    try {
      const supabase = createClient();
      const url = await getReceiptUrl(supabase, receipt.file_path);
      if (url) {
        // Verify the file actually exists before opening
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) {
          window.open(url, '_blank');
        } else {
          setDocError(`Le fichier "${receipt.file_name}" n'est pas accessible. Il n'a peut-être pas été uploadé.`);
        }
      } else {
        setDocError(`Impossible de générer le lien pour "${receipt.file_name}".`);
      }
    } catch {
      setDocError(`Erreur lors de l'ouverture de "${receipt.file_name}".`);
    }
  }

  async function handleUnlinkReceipt(receiptId: string) {
    await unlinkMutation.mutateAsync(receiptId);
    refetchReceipts();
  }

  async function handleDeleteReceipt(receipt: ReceiptDocument) {
    await deleteReceiptMutation.mutateAsync(receipt);
    refetchReceipts();
  }

  const canDelete = expense.status === 'draft';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton fallback="/depenses" label="Dépenses" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
                {expense.supplier}
              </h1>
              <StatusBadge
                status={expense.status}
                label={EXPENSE_STATUS_LABELS[expense.status]}
              />
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {EXPENSE_CATEGORY_LABELS[expense.category]}
              {' — '}
              {formatDateLong(expense.date)}
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
            <Detail label="Fournisseur" value={expense.supplier} />
            <Detail label="Montant TTC" value={formatCurrency(expense.amount_ttc)} bold />
            <Detail label="Catégorie" value={EXPENSE_CATEGORY_LABELS[expense.category]} />
            {expense.amount_ht != null && (
              <Detail label="Montant HT" value={formatCurrency(expense.amount_ht)} />
            )}
            {expense.vat_amount != null && (
              <Detail label="TVA" value={formatCurrency(expense.vat_amount)} />
            )}
            <Detail label="Date" value={formatDateLong(expense.date)} />
            {expense.payment_method && (
              <Detail
                label="Paiement"
                value={PAYMENT_METHOD_LABELS[expense.payment_method]}
              />
            )}
            <Detail label="Statut" value={EXPENSE_STATUS_LABELS[expense.status]} />
            {expense.comment && (
              <div className="col-span-full">
                <Detail label="Commentaire" value={expense.comment} />
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
            {expense.creator && <span>Créé par {expense.creator.full_name}</span>}
            <span>Créé le {formatDate(expense.created_at)}</span>
            <span>Modifié le {formatDate(expense.updated_at)}</span>
          </div>
        </SectionCard>

        {/* Receipts */}
        <SectionCard
          title="Justificatifs"
          action={
            <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="mr-2 h-3.5 w-3.5" />
              Ajouter
            </Button>
          }
        >
          {docError && (
            <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              {docError}
            </div>
          )}
          {receipts && receipts.length > 0 ? (
            <div className="space-y-3">
              {receipts.map((receipt) => (
                <ReceiptCard
                  key={receipt.id}
                  receipt={receipt}
                  onDownload={() => handleDownloadReceipt(receipt)}
                  onUnlink={() => handleUnlinkReceipt(receipt.id)}
                  onDelete={() => handleDeleteReceipt(receipt)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="Aucun justificatif"
              description="Ajoutez un ticket ou une facture pour cette dépense."
              action={{
                label: 'Ajouter un justificatif',
                onClick: () => setShowUpload(true),
              }}
            />
          )}
        </SectionCard>
      </div>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la dépense</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            expense={expense}
            onSubmit={handleUpdate}
            onCancel={() => setShowEdit(false)}
            isSubmitting={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un justificatif</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-1">
            Le justificatif sera directement rattaché à cette dépense.
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

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Supprimer la dépense"
        description="Cette action est irréversible. La dépense et ses justificatifs rattachés seront supprimés."
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
