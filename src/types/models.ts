// ============================================
// NXT Finance — Modèles métier TypeScript
// ============================================

import type {
  RevenueType,
  RevenueStatus,
  ExpenseCategory,
  ExpenseStatus,
  ReceiptStatus,
  ReceiptRelatedType,
  PeriodStatus,
  AlertLevel,
  AlertCategory,
  MemberRole,
  AccountantPermission,
  PaymentMethod,
  CommentType,
  ExportType,
  ExportFormat,
  ExportStatus,
  ActivityAction,
  ActivityEntityType,
  CollaboratorType,
  CollaboratorStatus,
  PayoutStatus,
  CompensationType,
} from './enums';

// --- Base ---

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// --- Agence ---

export interface AgencySettings {
  treasury_critical_threshold?: number;
  preparation_deadline_days?: number;
  missing_documents_tolerance?: number;
  notification_frequency?: 'daily' | 'weekly' | 'monthly';
  notification_channels?: ('in_app' | 'email' | 'periodic_summary')[];
}

export interface Agency extends BaseEntity {
  name: string;
  siret: string | null;
  address: string | null;
  is_demo: boolean;
  settings: AgencySettings;
}

// --- Utilisateur ---

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

// --- Membre d'agence ---

export interface AccountantPermissions {
  read: boolean;
  download: boolean;
  comment: boolean;
  request_documents: boolean;
  validate_document: boolean;
  validate_period: boolean;
  export: boolean;
  annotate: boolean;
}

export interface AgencyMember {
  id: string;
  agency_id: string;
  user_id: string;
  role: MemberRole;
  permissions: AccountantPermissions | null;
  created_at: string;
  // Joined
  user_profile?: UserProfile;
}

// --- Recette ---

export interface Revenue extends BaseEntity {
  agency_id: string;
  label: string;
  type: RevenueType;
  source: string | null;
  amount: number;
  amount_ht: number | null;
  amount_ttc: number | null;
  vat_amount: number | null;
  date: string;
  period_id: string | null;
  status: RevenueStatus;
  comment: string | null;
  created_by: string;
  // Joined
  creator?: UserProfile;
  period?: AccountingPeriod;
}

// --- Dépense ---

export interface Expense extends BaseEntity {
  agency_id: string;
  date: string;
  supplier: string;
  amount_ttc: number;
  amount_ht: number | null;
  vat_amount: number | null;
  category: ExpenseCategory;
  payment_method: PaymentMethod | null;
  status: ExpenseStatus;
  period_id: string | null;
  comment: string | null;
  created_by: string;
  // Joined
  creator?: UserProfile;
  period?: AccountingPeriod;
  receipts?: ReceiptDocument[];
}

// --- Justificatif ---

export interface OcrData {
  raw?: string;
  date?: string;
  supplier?: string;
  amount?: number;
  vat?: number;
}

export interface ReceiptAnomaly {
  type: 'missing_vat' | 'inconsistent_amounts' | 'unreadable' | 'duplicate_suspect' | 'missing_supplier' | 'missing_date';
  message: string;
}

export interface ReceiptDocument {
  id: string;
  agency_id: string;
  related_type: ReceiptRelatedType | null;
  related_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string;
  source: 'upload' | 'photo' | 'email';
  ocr_raw: OcrData | null;
  ocr_date: string | null;
  ocr_supplier: string | null;
  ocr_amount: number | null;
  ocr_vat: number | null;
  ocr_confidence: number | null;
  status: ReceiptStatus;
  anomalies: ReceiptAnomaly[];
  created_by: string;
  created_at: string;
  // Joined
  creator?: UserProfile;
}

// --- Période comptable ---

export interface AccountingPeriod extends BaseEntity {
  agency_id: string;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
  vat_collected: number | null;
  vat_deductible: number | null;
  vat_balance: number | null;
  vat_snapshot_at: string | null;
  shared_with_accountant: boolean;
}

/** Computed values — never persisted, always calculated from related data */
export interface PeriodComputed {
  completeness_rate: number;
  expected_documents: number;
  received_documents: number;
  anomaly_count: number;
  total_revenues: number;
  total_expenses: number;
}

// --- Alerte ---

export interface Alert {
  id: string;
  agency_id: string;
  level: AlertLevel;
  category: AlertCategory;
  message: string;
  related_type: ActivityEntityType | null;
  related_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

// --- Commentaire cabinet ---

export interface AccountantComment {
  id: string;
  agency_id: string;
  author_id: string;
  related_type: 'expense' | 'receipt' | 'period';
  related_id: string;
  content: string;
  type: CommentType;
  is_resolved: boolean;
  created_at: string;
  // Joined
  author?: UserProfile;
}

// --- Export ---

export interface ExportJob extends BaseEntity {
  agency_id: string;
  requested_by: string;
  type: ExportType;
  format: ExportFormat;
  period_id: string | null;
  filters: Record<string, unknown> | null;
  status: ExportStatus;
  file_path: string | null;
  file_name: string | null;
  document_count: number;
  error_message: string | null;
  completed_at: string | null;
  // Joined
  requester?: UserProfile;
}

// --- Journal d'activité ---

export interface ActivityLog {
  id: string;
  agency_id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined
  user?: UserProfile;
}

// --- Collaborateur ---

export interface Collaborator {
  id: string;
  agency_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: CollaboratorStatus;
  type: CollaboratorType;
  default_split_rate: number;
  /** Monthly net salary — salariés only, for payroll piloting */
  salary_net_monthly: number | null;
  /** Monthly gross salary — salariés only */
  salary_gross_monthly: number | null;
  /** Monthly total employer cost (gross + charges) — salariés only */
  employer_total_cost_monthly: number | null;
  created_at: string;
  updated_at: string;
}

// --- Commission split ---

export interface CommissionSplit {
  id: string;
  revenue_id: string;
  collaborator_id: string;
  gross_amount: number;
  network_rate: number;
  network_amount: number;
  agency_rate: number;
  agency_amount: number;
  collaborator_rate: number;
  collaborator_amount: number;
  /** Financial nature: reversement (independent), masse_salariale (employee), avance_commission (VRP, future) */
  compensation_type: CompensationType;
  payout_status: PayoutStatus;
  paid_at: string | null;
  created_at: string;
  // Joined
  collaborator?: Collaborator;
}
