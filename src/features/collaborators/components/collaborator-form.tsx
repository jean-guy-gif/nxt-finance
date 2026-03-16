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
  COLLABORATOR_TYPES,
  COLLABORATOR_TYPE_LABELS,
} from '@/types/enums';
import {
  collaboratorFormSchema,
  defaultCollaboratorValues,
  type CollaboratorFormValues,
} from './collaborator-schema';
import type { Collaborator } from '@/types/models';
import { Loader2 } from 'lucide-react';

interface CollaboratorFormProps {
  collaborator?: Collaborator;
  onSubmit: (values: CollaboratorFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CollaboratorForm({
  collaborator,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CollaboratorFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorFormSchema),
    defaultValues: collaborator
      ? {
          full_name: collaborator.full_name,
          type: collaborator.type,
          email: collaborator.email ?? '',
          phone: collaborator.phone ?? '',
          default_split_rate: collaborator.default_split_rate,
          salary_net_monthly: collaborator.salary_net_monthly ?? undefined,
          salary_gross_monthly: collaborator.salary_gross_monthly ?? undefined,
          employer_total_cost_monthly: collaborator.employer_total_cost_monthly ?? undefined,
          status: collaborator.status,
        }
      : defaultCollaboratorValues,
  });

  const currentType = watch('type');
  const isSalarie = currentType === 'salarie';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nom complet *</Label>
        <Input
          id="full_name"
          placeholder="Ex : Sophie Martin"
          {...register('full_name')}
        />
        {errors.full_name && (
          <p className="text-xs text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      {/* Type + Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Type *</Label>
          <Select
            value={currentType}
            onValueChange={(v) => { if (v) setValue('type', v as CollaboratorFormValues['type']); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type de collaborateur" />
            </SelectTrigger>
            <SelectContent>
              {COLLABORATOR_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {COLLABORATOR_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-xs text-destructive">{errors.type.message}</p>
          )}
        </div>

        {/* Split rate — only for non-salariés */}
        {!isSalarie && (
          <div className="space-y-1.5">
            <Label>Taux collaborateur par défaut *</Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                {...register('default_split_rate', { valueAsNumber: true })}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
            </div>
            {errors.default_split_rate && (
              <p className="text-xs text-destructive">{errors.default_split_rate.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Salary fields — only for salariés */}
      {isSalarie && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">Rémunération mensuelle</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Salaire net</Label>
              <CurrencyInput
                value={watch('salary_net_monthly') ?? ''}
                onChange={(v) => setValue('salary_net_monthly', v ? parseFloat(v) : undefined)}
                placeholder="2 000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Salaire brut</Label>
              <CurrencyInput
                value={watch('salary_gross_monthly') ?? ''}
                onChange={(v) => setValue('salary_gross_monthly', v ? parseFloat(v) : undefined)}
                placeholder="2 600"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Coût total employeur</Label>
              <CurrencyInput
                value={watch('employer_total_cost_monthly') ?? ''}
                onChange={(v) => setValue('employer_total_cost_monthly', v ? parseFloat(v) : undefined)}
                placeholder="3 400"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Indicateurs de pilotage — ne constituent pas des données de paie certifiées.
          </p>
        </div>
      )}

      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="sophie@agence.fr"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            placeholder="06 12 34 56 78"
            {...register('phone')}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {collaborator ? 'Enregistrer' : 'Ajouter le collaborateur'}
        </Button>
      </div>
    </form>
  );
}
