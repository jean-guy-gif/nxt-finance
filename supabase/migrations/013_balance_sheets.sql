-- ============================================
-- NXT Finance V3.2 — Balance Sheets, Items & Coherence Checks
-- ============================================
-- Core tables for bilan structured storage:
--   - balance_sheets: uploaded/parsed bilan per agency+fiscal_year
--   - balance_sheet_items: individual line items (PCG-aligned)
--   - balance_sheet_checks: automated coherence validations
-- ============================================

-- === ENUMS ===

CREATE TYPE balance_sheet_source_type AS ENUM (
  'pdf_auto',
  'excel_auto',
  'template',
  'manual'
);

CREATE TYPE balance_sheet_status AS ENUM (
  'uploaded',
  'parsing',
  'parsed',
  'validating',
  'validated',
  'rejected'
);

CREATE TYPE balance_sheet_section AS ENUM (
  'actif_immobilise',
  'actif_circulant',
  'capitaux_propres',
  'dettes',
  'produits_exploitation',
  'charges_exploitation',
  'produits_financiers',
  'charges_financieres',
  'produits_exceptionnels',
  'charges_exceptionnelles'
);

CREATE TYPE coherence_check_type AS ENUM (
  'actif_passif_balance',
  'totals_consistency',
  'missing_items',
  'cross_period',
  'duplicate'
);

CREATE TYPE coherence_check_status AS ENUM (
  'passed',
  'warning',
  'failed'
);

CREATE TYPE coherence_check_severity AS ENUM (
  'info',
  'warning',
  'critical'
);

-- === TABLE: balance_sheets ===

CREATE TABLE balance_sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  source_type balance_sheet_source_type NOT NULL,
  source_file_path TEXT,
  overall_confidence DECIMAL DEFAULT 0,
  status balance_sheet_status NOT NULL DEFAULT 'uploaded',
  validation_notes TEXT,
  validated_by UUID REFERENCES user_profiles(id),
  validated_at TIMESTAMPTZ,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  parent_id UUID REFERENCES balance_sheets(id),
  archived_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garde-fous
  CONSTRAINT chk_balance_sheets_confidence_range CHECK (overall_confidence >= 0 AND overall_confidence <= 100)
);

-- Partial unique: only one validated+current bilan per agency per fiscal year
CREATE UNIQUE INDEX idx_balance_sheets_unique_validated
  ON balance_sheets(agency_id, fiscal_year)
  WHERE status = 'validated' AND is_current = true;

-- === TABLE: balance_sheet_items ===

CREATE TABLE balance_sheet_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  balance_sheet_id UUID NOT NULL REFERENCES balance_sheets(id) ON DELETE CASCADE,
  section balance_sheet_section NOT NULL,
  category TEXT NOT NULL,
  pcg_code TEXT,
  amount DECIMAL NOT NULL,
  amount_n_minus_1 DECIMAL,
  confidence_score DECIMAL DEFAULT 0,
  is_validated BOOLEAN NOT NULL DEFAULT false,
  original_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garde-fous
  CONSTRAINT chk_balance_sheet_items_confidence_range CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- Partial unique: no duplicate pcg_code within same sheet+section
CREATE UNIQUE INDEX idx_balance_sheet_items_unique_pcg
  ON balance_sheet_items(balance_sheet_id, section, pcg_code)
  WHERE pcg_code IS NOT NULL;

-- === TABLE: balance_sheet_checks ===

CREATE TABLE balance_sheet_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  balance_sheet_id UUID NOT NULL REFERENCES balance_sheets(id) ON DELETE CASCADE,
  check_type coherence_check_type NOT NULL,
  status coherence_check_status NOT NULL,
  severity coherence_check_severity NOT NULL,
  expected_value DECIMAL,
  actual_value DECIMAL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === INDEXES ===

CREATE INDEX idx_balance_sheets_agency ON balance_sheets(agency_id);
CREATE INDEX idx_balance_sheets_fiscal_year ON balance_sheets(agency_id, fiscal_year);
CREATE INDEX idx_balance_sheets_status ON balance_sheets(status) WHERE status NOT IN ('rejected');

CREATE INDEX idx_balance_sheet_items_sheet ON balance_sheet_items(balance_sheet_id);
CREATE INDEX idx_balance_sheet_items_section ON balance_sheet_items(balance_sheet_id, section);

CREATE INDEX idx_balance_sheet_checks_sheet ON balance_sheet_checks(balance_sheet_id);

-- === RLS ===

ALTER TABLE balance_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet_checks ENABLE ROW LEVEL SECURITY;

-- balance_sheets: agency members can read
CREATE POLICY "Members can read agency balance sheets"
  ON balance_sheets FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- balance_sheets: agency members can insert
CREATE POLICY "Members can insert agency balance sheets"
  ON balance_sheets FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- balance_sheets: agency members can update
CREATE POLICY "Members can update agency balance sheets"
  ON balance_sheets FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- balance_sheets: agency members can delete
CREATE POLICY "Members can delete agency balance sheets"
  ON balance_sheets FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- balance_sheet_items: agency members can read (join through balance_sheets)
CREATE POLICY "Members can read agency balance sheet items"
  ON balance_sheet_items FOR SELECT
  USING (
    balance_sheet_id IN (
      SELECT bs.id FROM balance_sheets bs
      JOIN agency_members am ON am.agency_id = bs.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- balance_sheet_items: agency members can insert
CREATE POLICY "Members can insert agency balance sheet items"
  ON balance_sheet_items FOR INSERT
  WITH CHECK (
    balance_sheet_id IN (
      SELECT bs.id FROM balance_sheets bs
      JOIN agency_members am ON am.agency_id = bs.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- balance_sheet_items: agency members can update
CREATE POLICY "Members can update agency balance sheet items"
  ON balance_sheet_items FOR UPDATE
  USING (
    balance_sheet_id IN (
      SELECT bs.id FROM balance_sheets bs
      JOIN agency_members am ON am.agency_id = bs.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- balance_sheet_items: agency members can delete (for corrections)
CREATE POLICY "Members can delete agency balance sheet items"
  ON balance_sheet_items FOR DELETE
  USING (
    balance_sheet_id IN (
      SELECT bs.id FROM balance_sheets bs
      JOIN agency_members am ON am.agency_id = bs.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- balance_sheet_checks: agency members can read
CREATE POLICY "Members can read agency balance sheet checks"
  ON balance_sheet_checks FOR SELECT
  USING (
    balance_sheet_id IN (
      SELECT bs.id FROM balance_sheets bs
      JOIN agency_members am ON am.agency_id = bs.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- balance_sheet_checks: agency members can insert
CREATE POLICY "Members can insert agency balance sheet checks"
  ON balance_sheet_checks FOR INSERT
  WITH CHECK (
    balance_sheet_id IN (
      SELECT bs.id FROM balance_sheets bs
      JOIN agency_members am ON am.agency_id = bs.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- balance_sheet_checks: agency members can update
CREATE POLICY "Members can update agency balance sheet checks"
  ON balance_sheet_checks FOR UPDATE
  USING (
    balance_sheet_id IN (
      SELECT bs.id FROM balance_sheets bs
      JOIN agency_members am ON am.agency_id = bs.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- balance_sheet_checks: agency members can delete
CREATE POLICY "Members can delete agency balance sheet checks"
  ON balance_sheet_checks FOR DELETE
  USING (
    balance_sheet_id IN (
      SELECT bs.id FROM balance_sheets bs
      JOIN agency_members am ON am.agency_id = bs.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- === TRIGGERS: updated_at ===

CREATE TRIGGER set_updated_at_balance_sheets
  BEFORE UPDATE ON balance_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_balance_sheet_items
  BEFORE UPDATE ON balance_sheet_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_balance_sheet_checks
  BEFORE UPDATE ON balance_sheet_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
