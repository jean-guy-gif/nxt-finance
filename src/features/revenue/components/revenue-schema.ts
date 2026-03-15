import { z } from 'zod';
import { REVENUE_TYPES, REVENUE_STATUSES } from '@/types/enums';

export const revenueFormSchema = z.object({
  label: z
    .string()
    .min(2, 'Le libellé doit contenir au moins 2 caractères')
    .max(200, 'Le libellé est trop long'),
  type: z.enum([...REVENUE_TYPES], {
    message: 'Le type est requis',
  }),
  source: z.string().max(100).optional().or(z.literal('')),
  amount: z
    .number({ message: 'Le montant est requis' })
    .positive('Le montant doit être positif'),
  amount_ht: z.number().positive().optional().or(z.literal(0)).or(z.nan()),
  amount_ttc: z.number().positive().optional().or(z.literal(0)).or(z.nan()),
  vat_amount: z.number().min(0).optional().or(z.literal(0)).or(z.nan()),
  date: z.string().min(1, 'La date est requise'),
  status: z.enum([...REVENUE_STATUSES], {
    message: 'Le statut est requis',
  }),
  comment: z.string().max(500).optional().or(z.literal('')),
});

export type RevenueFormValues = z.infer<typeof revenueFormSchema>;

export const defaultRevenueValues: RevenueFormValues = {
  label: '',
  type: 'honoraires_transaction',
  source: '',
  amount: 0,
  amount_ht: undefined,
  amount_ttc: undefined,
  vat_amount: undefined,
  date: new Date().toISOString().split('T')[0],
  status: 'draft',
  comment: '',
};
