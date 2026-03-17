// ============================================
// NXT Finance — Enums métier
// Source de vérité TypeScript (miroir des enums PostgreSQL)
// ============================================

// --- Revenus ---

export const REVENUE_TYPES = [
  'honoraires_transaction',
  'honoraires_gestion',
  'honoraires_location',
  'commission',
  'frais_dossier',
  'autre_recette',
] as const;

export type RevenueType = (typeof REVENUE_TYPES)[number];

export const REVENUE_TYPE_LABELS: Record<RevenueType, string> = {
  honoraires_transaction: 'Honoraires de transaction',
  honoraires_gestion: 'Honoraires de gestion',
  honoraires_location: 'Honoraires de location',
  commission: 'Commission',
  frais_dossier: 'Frais de dossier',
  autre_recette: 'Autre recette',
};

export const REVENUE_STATUSES = [
  'draft',
  'to_verify',
  'validated',
  'collected',
  'transmitted',
] as const;

export type RevenueStatus = (typeof REVENUE_STATUSES)[number];

export const REVENUE_STATUS_LABELS: Record<RevenueStatus, string> = {
  draft: 'Brouillon',
  to_verify: 'À vérifier',
  validated: 'Validée',
  collected: 'Encaissée',
  transmitted: 'Transmise',
};

// --- Dépenses ---

export const EXPENSE_CATEGORIES = [
  'carburant',
  'repas',
  'deplacements',
  'publicite_marketing',
  'logiciels_abonnements',
  'honoraires',
  'fournitures',
  'telephonie_internet',
  'frais_bancaires',
  'loyer_charges',
  'assurances',
  'entretien_reparations',
  'autres_charges',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  carburant: 'Carburant',
  repas: 'Repas',
  deplacements: 'Déplacements',
  publicite_marketing: 'Publicité / Marketing',
  logiciels_abonnements: 'Logiciels / Abonnements',
  honoraires: 'Honoraires',
  fournitures: 'Fournitures',
  telephonie_internet: 'Téléphonie / Internet',
  frais_bancaires: 'Frais bancaires',
  loyer_charges: 'Loyer / Charges',
  assurances: 'Assurances',
  entretien_reparations: 'Entretien / Réparations',
  autres_charges: 'Autres charges',
};

export const EXPENSE_STATUSES = [
  'draft',
  'to_verify',
  'validated',
  'transmitted',
] as const;

export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Brouillon',
  to_verify: 'À vérifier',
  validated: 'Validée',
  transmitted: 'Transmise',
};

// --- Justificatifs ---

export const RECEIPT_STATUSES = [
  'received',
  'to_verify',
  'unreadable',
  'incomplete',
  'usable',
  'transmitted',
] as const;

export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  received: 'Reçu',
  to_verify: 'À vérifier',
  unreadable: 'Illisible',
  incomplete: 'Incomplet',
  usable: 'Exploitable',
  transmitted: 'Transmis',
};

export const RECEIPT_RELATED_TYPES = ['expense', 'revenue'] as const;

export type ReceiptRelatedType = (typeof RECEIPT_RELATED_TYPES)[number];

// --- Périodes comptables ---

export const PERIOD_STATUSES = [
  'in_progress',
  'incomplete',
  'to_verify',
  'ready_to_transmit',
  'transmitted',
] as const;

export type PeriodStatus = (typeof PERIOD_STATUSES)[number];

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  in_progress: 'En cours',
  incomplete: 'Incomplète',
  to_verify: 'À vérifier',
  ready_to_transmit: 'Prête à transmettre',
  transmitted: 'Transmise',
};

// --- Alertes ---

export const ALERT_LEVELS = ['info', 'vigilance', 'critical'] as const;

export type AlertLevel = (typeof ALERT_LEVELS)[number];

export const ALERT_LEVEL_LABELS: Record<AlertLevel, string> = {
  info: 'Information',
  vigilance: 'Vigilance',
  critical: 'Critique',
};

export const ALERT_CATEGORIES = [
  'treasury',
  'vat',
  'pre_accounting',
  'accountant',
] as const;

export type AlertCategory = (typeof ALERT_CATEGORIES)[number];

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  treasury: 'Trésorerie',
  vat: 'TVA',
  pre_accounting: 'Pré-comptabilité',
  accountant: 'Cabinet',
};

// --- Rôles & Permissions ---

export const MEMBER_ROLES = ['manager', 'assistant', 'accountant'] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  manager: 'Gérant',
  assistant: 'Assistant',
  accountant: 'Comptable',
};

export const ACCOUNTANT_PERMISSIONS = [
  'read',
  'download',
  'comment',
  'request_documents',
  'validate_document',
  'validate_period',
  'export',
  'annotate',
] as const;

export type AccountantPermission = (typeof ACCOUNTANT_PERMISSIONS)[number];

// --- Paiement ---

export const PAYMENT_METHODS = [
  'card',
  'transfer',
  'check',
  'cash',
  'direct_debit',
  'other',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: 'Carte bancaire',
  transfer: 'Virement',
  check: 'Chèque',
  cash: 'Espèces',
  direct_debit: 'Prélèvement',
  other: 'Autre',
};

// --- Commentaires cabinet ---

export const COMMENT_TYPES = [
  'comment',
  'request',
  'validation',
  'annotation',
] as const;

export type CommentType = (typeof COMMENT_TYPES)[number];

export const COMMENT_TYPE_LABELS: Record<CommentType, string> = {
  comment: 'Commentaire',
  request: 'Demande',
  validation: 'Validation',
  annotation: 'Annotation',
};

// --- Exports ---

export const EXPORT_TYPES = [
  'period_full',
  'period_documents',
  'expenses',
  'revenues',
  'custom',
] as const;

export type ExportType = (typeof EXPORT_TYPES)[number];

export const EXPORT_FORMATS = ['pdf', 'csv', 'zip'] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;

export type ExportStatus = (typeof EXPORT_STATUSES)[number];

// --- Journal d'activité ---

export const ACTIVITY_ACTIONS = [
  'created',
  'updated',
  'deleted',
  'status_changed',
  'validated',
  'transmitted',
  'exported',
  'commented',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_ENTITY_TYPES = [
  'revenue',
  'expense',
  'receipt',
  'period',
  'export',
  'comment',
  'collaborator',
  'commission_split',
] as const;

export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

// --- Collaborateurs ---

export const COLLABORATOR_TYPES = [
  'salarie',
  'agent_commercial',
  'independant',
] as const;

export type CollaboratorType = (typeof COLLABORATOR_TYPES)[number];

export const COLLABORATOR_TYPE_LABELS: Record<CollaboratorType, string> = {
  salarie: 'Salarié',
  agent_commercial: 'Agent commercial',
  independant: 'Indépendant',
};

export const COLLABORATOR_STATUSES = ['active', 'inactive'] as const;

export type CollaboratorStatus = (typeof COLLABORATOR_STATUSES)[number];

export const COLLABORATOR_STATUS_LABELS: Record<CollaboratorStatus, string> = {
  active: 'Actif',
  inactive: 'Inactif',
};

// --- Commissionnement ---

export const PAYOUT_STATUSES = ['pending', 'paid', 'cancelled'] as const;

export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  pending: 'À reverser',
  paid: 'Reversé',
  cancelled: 'Annulé',
};

export const COMPENSATION_TYPES = [
  'reversement',
  'masse_salariale',
  'avance_commission',
] as const;

export type CompensationType = (typeof COMPENSATION_TYPES)[number];

export const COMPENSATION_TYPE_LABELS: Record<CompensationType, string> = {
  reversement: 'Reversement collaborateur',
  masse_salariale: 'Masse salariale estimée',
  avance_commission: 'Avance sur commission',
};

/**
 * Maps collaborator type → compensation type.
 * This is the SINGLE source of truth for the mapping.
 * avance_commission is never produced until VRP type is active.
 */
export function getCompensationType(collaboratorType: CollaboratorType): CompensationType {
  switch (collaboratorType) {
    case 'salarie':
      return 'masse_salariale';
    case 'agent_commercial':
    case 'independant':
      return 'reversement';
  }
}

// --- Temporalité ---

export const PERIOD_VIEWS = ['monthly', 'quarterly', 'yearly'] as const;

export type PeriodView = (typeof PERIOD_VIEWS)[number];

export const PERIOD_VIEW_LABELS: Record<PeriodView, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
};

// ============================================
// V3 — Processing & LLM
// ============================================

// --- Processing Jobs ---

export const JOB_TYPES = [
  'bilan_parsing',
  'analysis_generation',
  'bp_generation',
  'dossier_generation',
  'dossier_export',
  'llm_generation',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  bilan_parsing: 'Parsing bilan',
  analysis_generation: 'Génération analyse',
  bp_generation: 'Génération business plan',
  dossier_generation: 'Génération dossier bancaire',
  dossier_export: 'Export dossier',
  llm_generation: 'Génération IA',
};

export const JOB_STATUSES = [
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'En attente',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échoué',
  cancelled: 'Annulé',
};

// --- LLM Generations ---

export const LLM_OUTPUT_TYPES = [
  'financial_insight',
  'bp_narrative',
  'alert_recommendation',
  'slide_narrative',
  'director_summary',
] as const;

export type LlmOutputType = (typeof LLM_OUTPUT_TYPES)[number];

export const LLM_OUTPUT_TYPE_LABELS: Record<LlmOutputType, string> = {
  financial_insight: 'Insight financier',
  bp_narrative: 'Narratif business plan',
  alert_recommendation: 'Recommandation alerte',
  slide_narrative: 'Narratif slide',
  director_summary: 'Synthèse dirigeant',
};

export const LLM_GENERATION_STATUSES = [
  'pending',
  'completed',
  'failed',
] as const;

export type LlmGenerationStatus = (typeof LLM_GENERATION_STATUSES)[number];

// ============================================
// V3.2 — Import Bilan
// ============================================

// --- Balance Sheets ---

export const BALANCE_SHEET_SOURCE_TYPES = [
  'pdf_auto', 'excel_auto', 'template', 'manual',
] as const;
export type BalanceSheetSourceType = (typeof BALANCE_SHEET_SOURCE_TYPES)[number];
export const BALANCE_SHEET_SOURCE_TYPE_LABELS: Record<BalanceSheetSourceType, string> = {
  pdf_auto: 'PDF (extraction automatique)',
  excel_auto: 'Excel (extraction automatique)',
  template: 'Template NXT Finance',
  manual: 'Saisie manuelle',
};

export const BALANCE_SHEET_STATUSES = [
  'uploaded', 'parsing', 'parsed', 'validating', 'validated', 'rejected',
] as const;
export type BalanceSheetStatus = (typeof BALANCE_SHEET_STATUSES)[number];
export const BALANCE_SHEET_STATUS_LABELS: Record<BalanceSheetStatus, string> = {
  uploaded: 'Téléversé',
  parsing: 'Extraction en cours',
  parsed: 'Extrait',
  validating: 'En validation',
  validated: 'Validé',
  rejected: 'Rejeté',
};

export const BALANCE_SHEET_SECTIONS = [
  'actif_immobilise', 'actif_circulant', 'capitaux_propres', 'dettes',
  'produits_exploitation', 'charges_exploitation',
  'produits_financiers', 'charges_financieres',
  'produits_exceptionnels', 'charges_exceptionnelles',
] as const;
export type BalanceSheetSection = (typeof BALANCE_SHEET_SECTIONS)[number];
export const BALANCE_SHEET_SECTION_LABELS: Record<BalanceSheetSection, string> = {
  actif_immobilise: 'Actif immobilisé',
  actif_circulant: 'Actif circulant',
  capitaux_propres: 'Capitaux propres',
  dettes: 'Dettes',
  produits_exploitation: "Produits d'exploitation",
  charges_exploitation: "Charges d'exploitation",
  produits_financiers: 'Produits financiers',
  charges_financieres: 'Charges financières',
  produits_exceptionnels: 'Produits exceptionnels',
  charges_exceptionnelles: 'Charges exceptionnelles',
};

// --- Coherence Checks ---

export const COHERENCE_CHECK_TYPES = [
  'actif_passif_balance', 'totals_consistency', 'missing_items', 'cross_period', 'duplicate',
] as const;
export type CoherenceCheckType = (typeof COHERENCE_CHECK_TYPES)[number];
export const COHERENCE_CHECK_TYPE_LABELS: Record<CoherenceCheckType, string> = {
  actif_passif_balance: 'Équilibre actif / passif',
  totals_consistency: 'Cohérence des totaux',
  missing_items: 'Postes manquants',
  cross_period: 'Comparaison inter-périodes',
  duplicate: 'Doublons détectés',
};

export const COHERENCE_CHECK_STATUSES = ['passed', 'warning', 'failed'] as const;
export type CoherenceCheckStatus = (typeof COHERENCE_CHECK_STATUSES)[number];

export const COHERENCE_CHECK_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type CoherenceCheckSeverity = (typeof COHERENCE_CHECK_SEVERITIES)[number];
