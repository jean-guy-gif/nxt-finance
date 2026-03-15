'use client';

import { useState, useCallback } from 'react';
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
  REVENUE_TYPES,
  REVENUE_TYPE_LABELS,
  REVENUE_STATUSES,
  REVENUE_STATUS_LABELS,
} from '@/types/enums';
import {
  revenueFormSchema,
  defaultRevenueValues,
  type RevenueFormValues,
} from './revenue-schema';
import { CommissionSplitBlock, type SplitParams } from './commission-split-block';
import type { Revenue } from '@/types/models';
import { Loader2 } from 'lucide-react';

export interface RevenueFormSubmitData {
  values: RevenueFormValues;
  split: SplitParams | null;
}

interface RevenueFormProps {
  revenue?: Revenue;
  /** Existing collaborator ID (from commission_splits) */
  existingCollaboratorId?: string | null;
  existingNetworkRate?: number;
  existingCollaboratorRate?: number;
  onSubmit: (data: RevenueFormSubmitData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function RevenueForm({
  revenue,
  existingCollaboratorId,
  existingNetworkRate,
  existingCollaboratorRate,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: RevenueFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RevenueFormValues>({
    resolver: zodResolver(revenueFormSchema),
    defaultValues: revenue
      ? {
          label: revenue.label,
          type: revenue.type,
          source: revenue.source ?? '',
          amount: revenue.amount,
          amount_ht: revenue.amount_ht ?? undefined,
          amount_ttc: revenue.amount_ttc ?? undefined,
          vat_amount: revenue.vat_amount ?? undefined,
          date: revenue.date,
          status: revenue.status,
          comment: revenue.comment ?? '',
        }
      : defaultRevenueValues,
  });

  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(
    existingCollaboratorId ?? null
  );
  const [splitParams, setSplitParams] = useState<SplitParams | null>(null);

  const currentType = watch('type');
  const currentStatus = watch('status');
  const currentAmount = watch('amount');

  const handleSplitChange = useCallback((split: SplitParams | null) => {
    setSplitParams(split);
  }, []);

  function handleFormSubmit(values: RevenueFormValues) {
    onSubmit({ values, split: selectedCollaboratorId ? splitParams : null });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Label */}
      <div className="space-y-1.5">
        <Label htmlFor="label">Libellé *</Label>
        <Input
          id="label"
          placeholder="Ex : Vente appartement Rue de Rivoli"
          {...register('label')}
        />
        {errors.label && (
          <p className="text-xs text-destructive">{errors.label.message}</p>
        )}
      </div>

      {/* Type + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Type *</Label>
          <Select
            value={currentType}
            onValueChange={(v) => { if (v) setValue('type', v as RevenueFormValues['type']); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type de recette" />
            </SelectTrigger>
            <SelectContent>
              {REVENUE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {REVENUE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-xs text-destructive">{errors.type.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Statut *</Label>
          <Select
            value={currentStatus}
            onValueChange={(v) => { if (v) setValue('status', v as RevenueFormValues['status']); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              {REVENUE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {REVENUE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date + Source */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date *</Label>
          <Input id="date" type="date" {...register('date')} />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            placeholder="Ex : Vente, Location, Gestion"
            {...register('source')}
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label>Montant principal *</Label>
          <CurrencyInput
            value={watch('amount') || ''}
            onChange={(v) => setValue('amount', v ? parseFloat(v) : 0, { shouldValidate: true })}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
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
          <Label>Montant TTC</Label>
          <CurrencyInput
            value={watch('amount_ttc') || ''}
            onChange={(v) => setValue('amount_ttc', v ? parseFloat(v) : undefined)}
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

      {/* Commission split */}
      <CommissionSplitBlock
        grossAmount={currentAmount || 0}
        selectedCollaboratorId={selectedCollaboratorId}
        onCollaboratorChange={setSelectedCollaboratorId}
        onSplitChange={handleSplitChange}
        initialNetworkRate={existingNetworkRate}
        initialCollaboratorRate={existingCollaboratorRate}
      />

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
          {revenue ? 'Enregistrer' : 'Créer la recette'}
        </Button>
      </div>
    </form>
  );
}
