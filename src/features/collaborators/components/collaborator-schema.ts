import { z } from 'zod';
import { COLLABORATOR_TYPES, COLLABORATOR_STATUSES } from '@/types/enums';

export const collaboratorFormSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(200, 'Nom trop long'),
  type: z.enum([...COLLABORATOR_TYPES], {
    message: 'Le type est requis',
  }),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  // Split rate — required for independants/agents, ignored for salariés
  default_split_rate: z
    .number()
    .min(0, 'Le taux doit être entre 0 et 100')
    .max(100, 'Le taux doit être entre 0 et 100')
    .optional()
    .or(z.literal(0)),
  // Salary fields — salariés only
  salary_net_monthly: z.number().min(0).optional().or(z.nan()),
  salary_gross_monthly: z.number().min(0).optional().or(z.nan()),
  employer_total_cost_monthly: z.number().min(0).optional().or(z.nan()),
  status: z.enum([...COLLABORATOR_STATUSES]).optional(),
});

export type CollaboratorFormValues = z.infer<typeof collaboratorFormSchema>;

export const defaultCollaboratorValues: CollaboratorFormValues = {
  full_name: '',
  type: 'independant',
  email: '',
  phone: '',
  default_split_rate: 50,
  salary_net_monthly: undefined,
  salary_gross_monthly: undefined,
  employer_total_cost_monthly: undefined,
  status: 'active',
};
