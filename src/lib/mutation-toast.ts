/**
 * Standard error messages for mutations.
 * Used with useToast() in mutation onError callbacks.
 */

export const MUTATION_ERRORS = {
  create: 'Impossible de créer l\'élément. Vérifiez votre connexion et réessayez.',
  update: 'Impossible d\'enregistrer les modifications. Vérifiez votre connexion et réessayez.',
  delete: 'Impossible de supprimer l\'élément. Vérifiez votre connexion et réessayez.',
  upload: 'Échec de l\'envoi du fichier. Vérifiez votre connexion et réessayez.',
  resolve: 'Impossible de résoudre cet élément. Vérifiez vos permissions.',
  status: 'Impossible de changer le statut. Vérifiez votre connexion et réessayez.',
  generic: 'Une erreur est survenue. Vérifiez votre connexion et réessayez.',
} as const;

export const MUTATION_SUCCESS = {
  create: 'Élément créé avec succès.',
  update: 'Modifications enregistrées.',
  delete: 'Élément supprimé.',
  upload: 'Fichier envoyé avec succès.',
  resolve: 'Élément résolu.',
  status: 'Statut mis à jour.',
} as const;
