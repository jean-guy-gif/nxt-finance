import { z } from 'zod';
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, PAYMENT_METHODS } from '@/types/enums';

export const expenseFormSchema = z.object({
  supplier: z
    .string()
    .min(1, 'Le fournisseur est requis')
    .max(200, 'Nom trop long'),
  category: z.enum([...EXPENSE_CATEGORIES], {
    message: 'La catégorie est requise',
  }),
  amount_ttc: z
    .number({ message: 'Le montant TTC est requis' })
    .positive('Le montant doit être positif'),
  amount_ht: z.number().positive().optional().or(z.literal(0)).or(z.nan()),
  vat_amount: z.number().min(0).optional().or(z.literal(0)).or(z.nan()),
  date: z.string().min(1, 'La date est requise'),
  payment_method: z
    .enum([...PAYMENT_METHODS])
    .optional()
    .or(z.literal('' as const)),
  status: z.enum([...EXPENSE_STATUSES], {
    message: 'Le statut est requis',
  }),
  comment: z.string().max(500).optional().or(z.literal('')),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const defaultExpenseValues: ExpenseFormValues = {
  supplier: '',
  category: 'autres_charges',
  amount_ttc: 0,
  amount_ht: undefined,
  vat_amount: undefined,
  date: new Date().toISOString().split('T')[0],
  payment_method: undefined,
  status: 'draft',
  comment: '',
};
