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
  default_split_rate: z
    .number({ message: 'Le taux est requis' })
    .min(0, 'Le taux doit être entre 0 et 100')
    .max(100, 'Le taux doit être entre 0 et 100'),
  employer_cost_rate: z
    .number()
    .min(0)
    .max(200)
    .optional()
    .or(z.nan()),
  status: z.enum([...COLLABORATOR_STATUSES]).optional(),
});

export type CollaboratorFormValues = z.infer<typeof collaboratorFormSchema>;

export const defaultCollaboratorValues: CollaboratorFormValues = {
  full_name: '',
  type: 'independant',
  email: '',
  phone: '',
  default_split_rate: 50,
  employer_cost_rate: undefined,
  status: 'active',
};
