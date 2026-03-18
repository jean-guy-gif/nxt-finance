'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/shared/currency-input';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUSES,
  EXPENSE_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from '@/types/enums';
import {
  expenseFormSchema,
  defaultExpenseValues,
  type ExpenseFormValues,
} from './expense-schema';
import type { Expense } from '@/types/models';
import { Loader2 } from 'lucide-react';
import { useAcquisitionChannels } from '@/features/performance/hooks/use-commercial-kpis';

interface ExpenseFormProps {
  expense?: Expense;
  onSubmit: (values: ExpenseFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ExpenseForm({
  expense,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense
      ? {
          supplier: expense.supplier,
          category: expense.category,
          amount_ttc: expense.amount_ttc,
          amount_ht: expense.amount_ht ?? undefined,
          vat_amount: expense.vat_amount ?? undefined,
          date: expense.date,
          payment_method: expense.payment_method ?? undefined,
          status: expense.status,
          comment: expense.comment ?? '',
        }
      : defaultExpenseValues,
  });

  const currentCategory = watch('category');
  const currentStatus = watch('status');
  const currentPayment = watch('payment_method');
  const { data: channels } = useAcquisitionChannels();
  const isMarketingCategory = currentCategory === 'publicite_marketing';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Supplier */}
      <div className="space-y-1.5">
        <Label htmlFor="supplier">Fournisseur *</Label>
        <Input
          id="supplier"
          placeholder="Ex : TotalEnergies, Orange, SeLoger"
          {...register('supplier')}
        />
        {errors.supplier && (
          <p className="text-xs text-destructive">{errors.supplier.message}</p>
        )}
      </div>

      {/* Category + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Catégorie *</Label>
          <Select
            value={currentCategory}
            onValueChange={(v) => { if (v) setValue('category', v as ExpenseFormValues['category']); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Statut *</Label>
          <Select
            value={currentStatus}
            onValueChange={(v) => { if (v) setValue('status', v as ExpenseFormValues['status']); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {EXPENSE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conditional: marketing supplier + channel */}
      {isMarketingCategory && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="supplier_name">Fournisseur pub / média</Label>
            <Input
              id="supplier_name"
              placeholder="Ex : SeLoger, Google Ads"
              {...register('supplier_name')}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Canal d&apos;acquisition</Label>
            <Select
              value={watch('acquisition_channel') ?? undefined}
              onValueChange={(v) => { if (v) setValue('acquisition_channel', v); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Canal (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                {(channels ?? []).map((ch) => (
                  <SelectItem key={ch.id} value={ch.name}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Date + Payment method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date *</Label>
          <Input id="date" type="date" {...register('date')} />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Mode de paiement</Label>
          <Select
            value={currentPayment ?? undefined}
            onValueChange={(v) => { if (v) setValue('payment_method', v as ExpenseFormValues['payment_method']); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Mode de paiement" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PAYMENT_METHOD_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Montant TTC *</Label>
          <CurrencyInput
            value={watch('amount_ttc') || ''}
            onChange={(v) => setValue('amount_ttc', v ? parseFloat(v) : 0, { shouldValidate: true })}
            placeholder="0.00"
          />
          {errors.amount_ttc && (
            <p className="text-xs text-destructive">{errors.amount_ttc.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Montant HT</Label>
          <CurrencyInput
            value={watch('amount_ht') || ''}
            onChange={(v) => setValue('amount_ht', v ? parseFloat(v) : undefined)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label>TVA</Label>
          <CurrencyInput
            value={watch('vat_amount') || ''}
            onChange={(v) => setValue('vat_amount', v ? parseFloat(v) : undefined)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-1.5">
        <Label htmlFor="comment">Commentaire</Label>
        <Input
          id="comment"
          placeholder="Note libre (optionnel)"
          {...register('comment')}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {expense ? 'Enregistrer' : 'Créer la dépense'}
        </Button>
      </div>
    </form>
  );
}
