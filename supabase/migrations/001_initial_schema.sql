-- ============================================
-- NXT Finance — Initial schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE revenue_type AS ENUM (
  'honoraires_transaction',
  'honoraires_gestion',
  'honoraires_location',
  'commission',
  'frais_dossier',
  'autre_recette'
);

CREATE TYPE revenue_status AS ENUM (
  'draft',
  'to_verify',
  'validated',
  'collected',
  'transmitted'
);

CREATE TYPE expense_category AS ENUM (
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
  'autres_charges'
);

CREATE TYPE expense_status AS ENUM (
  'draft',
  'to_verify',
  'validated',
  'transmitted'
);

CREATE TYPE receipt_status AS ENUM (
  'received',
  'to_verify',
  'unreadable',
  'incomplete',
  'usable',
  'transmitted'
);

CREATE TYPE receipt_related_type AS ENUM (
  'expense',
  'revenue'
);

CREATE TYPE period_status AS ENUM (
  'in_progress',
  'incomplete',
  'to_verify',
  'ready_to_transmit',
  'transmitted'
);

CREATE TYPE alert_level AS ENUM (
  'info',
  'vigilance',
  'critical'
);

CREATE TYPE alert_category AS ENUM (
  'treasury',
  'vat',
  'pre_accounting',
  'accountant'
);

CREATE TYPE member_role AS ENUM (
  'manager',
  'assistant',
  'accountant'
);

CREATE TYPE payment_method AS ENUM (
  'card',
  'transfer',
  'check',
  'cash',
  'direct_debit',
  'other'
);

CREATE TYPE comment_type AS ENUM (
  'comment',
  'request',
  'validation',
  'annotation'
);

CREATE TYPE export_type AS ENUM (
  'period_full',
  'period_documents',
  'expenses',
  'revenues',
  'custom'
);

CREATE TYPE export_format AS ENUM (
  'pdf',
  'csv',
  'zip'
);

CREATE TYPE export_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

CREATE TYPE activity_action AS ENUM (
  'created',
  'updated',
  'deleted',
  'status_changed',
  'validated',
  'transmitted',
  'exported',
  'commented'
);

CREATE TYPE activity_entity_type AS ENUM (
  'revenue',
  'expense',
  'receipt',
  'period',
  'export',
  'comment'
);

-- ============================================
-- TABLES
-- ============================================

-- Agencies
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  siret TEXT,
  address TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agency members (junction: user <-> agency with role)
CREATE TABLE agency_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'assistant',
  permissions JSONB, -- Fine-grained accountant permissions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id)
);

-- Accounting periods (before revenues/expenses which reference it)
CREATE TABLE accounting_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status period_status NOT NULL DEFAULT 'in_progress',
  -- TVA snapshots (estimations horodatées, pas source de vérité)
  vat_collected NUMERIC(12,2),
  vat_deductible NUMERIC(12,2),
  vat_balance NUMERIC(12,2),
  vat_snapshot_at TIMESTAMPTZ,
  shared_with_accountant BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, month, year)
);

-- Revenues
CREATE TABLE revenues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type revenue_type NOT NULL,
  source TEXT,
  amount NUMERIC(12,2) NOT NULL,
  amount_ht NUMERIC(12,2),
  amount_ttc NUMERIC(12,2),
  vat_amount NUMERIC(12,2),
  date DATE NOT NULL,
  period_id UUID REFERENCES accounting_periods(id),
  status revenue_status NOT NULL DEFAULT 'draft',
  comment TEXT,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  supplier TEXT NOT NULL,
  amount_ttc NUMERIC(12,2) NOT NULL,
  amount_ht NUMERIC(12,2),
  vat_amount NUMERIC(12,2),
  category expense_category NOT NULL,
  payment_method payment_method,
  status expense_status NOT NULL DEFAULT 'draft',
  period_id UUID REFERENCES accounting_periods(id),
  comment TEXT,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Receipt documents
CREATE TABLE receipt_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  related_type receipt_related_type,
  related_id UUID,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'upload',
  ocr_raw JSONB,
  ocr_date DATE,
  ocr_supplier TEXT,
  ocr_amount NUMERIC(12,2),
  ocr_vat NUMERIC(12,2),
  ocr_confidence REAL,
  status receipt_status NOT NULL DEFAULT 'received',
  anomalies JSONB NOT NULL DEFAULT '[]',
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  level alert_level NOT NULL,
  category alert_category NOT NULL,
  message TEXT NOT NULL,
  related_type activity_entity_type,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accountant comments
CREATE TABLE accountant_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES user_profiles(id),
  related_type TEXT NOT NULL CHECK (related_type IN ('expense', 'receipt', 'period')),
  related_id UUID NOT NULL,
  content TEXT NOT NULL,
  type comment_type NOT NULL DEFAULT 'comment',
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Export jobs
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES user_profiles(id),
  type export_type NOT NULL,
  format export_format NOT NULL DEFAULT 'csv',
  period_id UUID REFERENCES accounting_periods(id),
  filters JSONB,
  status export_status NOT NULL DEFAULT 'pending',
  file_path TEXT,
  file_name TEXT,
  document_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Activity logs (audit trail)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  action activity_action NOT NULL,
  entity_type activity_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_revenues_agency ON revenues(agency_id);
CREATE INDEX idx_revenues_period ON revenues(period_id);
CREATE INDEX idx_revenues_status ON revenues(status);
CREATE INDEX idx_revenues_date ON revenues(date);

CREATE INDEX idx_expenses_agency ON expenses(agency_id);
CREATE INDEX idx_expenses_period ON expenses(period_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

CREATE INDEX idx_receipt_documents_agency ON receipt_documents(agency_id);
CREATE INDEX idx_receipt_documents_related ON receipt_documents(related_type, related_id);
CREATE INDEX idx_receipt_documents_status ON receipt_documents(status);

CREATE INDEX idx_accounting_periods_agency ON accounting_periods(agency_id);
CREATE INDEX idx_accounting_periods_year_month ON accounting_periods(year, month);

CREATE INDEX idx_alerts_agency ON alerts(agency_id);
CREATE INDEX idx_alerts_level ON alerts(level);
CREATE INDEX idx_alerts_read ON alerts(is_read);

CREATE INDEX idx_accountant_comments_agency ON accountant_comments(agency_id);
CREATE INDEX idx_accountant_comments_related ON accountant_comments(related_type, related_id);

CREATE INDEX idx_export_jobs_agency ON export_jobs(agency_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);

CREATE INDEX idx_activity_logs_agency ON activity_logs(agency_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

CREATE INDEX idx_agency_members_agency ON agency_members(agency_id);
CREATE INDEX idx_agency_members_user ON agency_members(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountant_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Users can read agencies they belong to
CREATE POLICY "Members can read their agencies"
  ON agencies FOR SELECT
  USING (
    id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

-- Users can read their own memberships
CREATE POLICY "Users can read own memberships"
  ON agency_members FOR SELECT
  USING (user_id = auth.uid());

-- Agency data policies: members can read data for their agencies
CREATE POLICY "Members can read agency revenues"
  ON revenues FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert agency revenues"
  ON revenues FOR INSERT
  WITH CHECK (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update agency revenues"
  ON revenues FOR UPDATE
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can read agency expenses"
  ON expenses FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert agency expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update agency expenses"
  ON expenses FOR UPDATE
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can read agency periods"
  ON accounting_periods FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can manage agency periods"
  ON accounting_periods FOR ALL
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can read agency receipts"
  ON receipt_documents FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert agency receipts"
  ON receipt_documents FOR INSERT
  WITH CHECK (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update agency receipts"
  ON receipt_documents FOR UPDATE
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can read agency alerts"
  ON alerts FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update agency alerts"
  ON alerts FOR UPDATE
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can read agency comments"
  ON accountant_comments FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert agency comments"
  ON accountant_comments FOR INSERT
  WITH CHECK (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can read agency exports"
  ON export_jobs FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert agency exports"
  ON export_jobs FOR INSERT
  WITH CHECK (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can read agency logs"
  ON activity_logs FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert agency logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_agencies
  BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_revenues
  BEFORE UPDATE ON revenues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_expenses
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_periods
  BEFORE UPDATE ON accounting_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_export_jobs
  BEFORE UPDATE ON export_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
