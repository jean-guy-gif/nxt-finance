-- ============================================
-- NXT Finance V2.1 — Collaborators & Commission Splits
-- ============================================
-- Source of truth rule:
--   commission_splits.collaborator_id is the SINGLE source of truth.
--   revenues.collaborator_id is a denormalized shortcut for display/filtering only.
--   It MUST always match commission_splits.collaborator_id for the same revenue.
--   If commission_splits is deleted, revenues.collaborator_id is set to NULL.
-- ============================================

-- === ENUMS ===

CREATE TYPE collaborator_type AS ENUM (
  'salarie',
  'agent_commercial',
  'independant'
);

CREATE TYPE collaborator_status AS ENUM (
  'active',
  'inactive'
);

CREATE TYPE payout_status AS ENUM (
  'pending',
  'paid',
  'cancelled'
);

-- === TABLE: collaborators ===

CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status collaborator_status NOT NULL DEFAULT 'active',
  type collaborator_type NOT NULL,
  default_split_rate NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garde-fous
  CONSTRAINT chk_collaborator_name_not_empty CHECK (length(trim(full_name)) > 0),
  CONSTRAINT chk_collaborator_rate_range CHECK (default_split_rate >= 0 AND default_split_rate <= 100)
);

-- === TABLE: commission_splits ===

CREATE TABLE commission_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revenue_id UUID NOT NULL UNIQUE REFERENCES revenues(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES collaborators(id),

  -- Amounts
  gross_amount NUMERIC(12,2) NOT NULL,
  network_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  network_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  agency_rate NUMERIC(5,2) NOT NULL,
  agency_amount NUMERIC(12,2) NOT NULL,
  collaborator_rate NUMERIC(5,2) NOT NULL,
  collaborator_amount NUMERIC(12,2) NOT NULL,

  -- Payout tracking
  payout_status payout_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garde-fous: rates between 0 and 100
  CONSTRAINT chk_split_network_rate_range CHECK (network_rate >= 0 AND network_rate <= 100),
  CONSTRAINT chk_split_collaborator_rate_range CHECK (collaborator_rate >= 0 AND collaborator_rate <= 100),
  CONSTRAINT chk_split_agency_rate_range CHECK (agency_rate >= 0 AND agency_rate <= 100),

  -- Garde-fous: amounts non-negative
  CONSTRAINT chk_split_gross_positive CHECK (gross_amount > 0),
  CONSTRAINT chk_split_network_amount_positive CHECK (network_amount >= 0),
  CONSTRAINT chk_split_agency_amount_positive CHECK (agency_amount >= 0),
  CONSTRAINT chk_split_collaborator_amount_positive CHECK (collaborator_amount >= 0),

  -- Garde-fou: sum must equal gross (with 1 cent tolerance for rounding)
  CONSTRAINT chk_split_sum_equals_gross CHECK (
    ABS(network_amount + agency_amount + collaborator_amount - gross_amount) <= 0.01
  ),

  -- Garde-fou: paid_at only when status is paid
  CONSTRAINT chk_split_paid_at_consistency CHECK (
    (payout_status = 'paid' AND paid_at IS NOT NULL)
    OR (payout_status != 'paid')
  )
);

-- === ALTER revenues: add collaborator shortcut ===

ALTER TABLE revenues ADD COLUMN collaborator_id UUID REFERENCES collaborators(id);

-- === INDEXES ===

CREATE INDEX idx_collaborators_agency ON collaborators(agency_id);
CREATE INDEX idx_collaborators_status ON collaborators(status);
CREATE INDEX idx_commission_splits_revenue ON commission_splits(revenue_id);
CREATE INDEX idx_commission_splits_collaborator ON commission_splits(collaborator_id);
CREATE INDEX idx_commission_splits_payout ON commission_splits(payout_status);
CREATE INDEX idx_revenues_collaborator ON revenues(collaborator_id);

-- === RLS ===

ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_splits ENABLE ROW LEVEL SECURITY;

-- Collaborators: members can read their agency's collaborators
CREATE POLICY "Members can read agency collaborators"
  ON collaborators FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

-- Collaborators: managers/assistants can manage
CREATE POLICY "Staff can insert collaborators"
  ON collaborators FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role IN ('manager', 'assistant')
    )
  );

CREATE POLICY "Staff can update collaborators"
  ON collaborators FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role IN ('manager', 'assistant')
    )
  );

CREATE POLICY "Managers can delete collaborators"
  ON collaborators FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Commission splits: readable if the revenue is readable (via agency membership)
CREATE POLICY "Members can read commission splits"
  ON commission_splits FOR SELECT
  USING (
    revenue_id IN (
      SELECT id FROM revenues WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can insert commission splits"
  ON commission_splits FOR INSERT
  WITH CHECK (
    revenue_id IN (
      SELECT id FROM revenues WHERE agency_id IN (
        SELECT agency_id FROM agency_members
        WHERE user_id = auth.uid() AND role IN ('manager', 'assistant')
      )
    )
  );

CREATE POLICY "Staff can update commission splits"
  ON commission_splits FOR UPDATE
  USING (
    revenue_id IN (
      SELECT id FROM revenues WHERE agency_id IN (
        SELECT agency_id FROM agency_members
        WHERE user_id = auth.uid() AND role IN ('manager', 'assistant')
      )
    )
  );

CREATE POLICY "Managers can delete commission splits"
  ON commission_splits FOR DELETE
  USING (
    revenue_id IN (
      SELECT id FROM revenues WHERE agency_id IN (
        SELECT agency_id FROM agency_members
        WHERE user_id = auth.uid() AND role = 'manager'
      )
    )
  );

-- === TRIGGER: updated_at on collaborators ===

CREATE TRIGGER set_updated_at_collaborators
  BEFORE UPDATE ON collaborators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- === TRIGGER: sync revenues.collaborator_id when split is deleted ===

CREATE OR REPLACE FUNCTION sync_revenue_collaborator_on_split_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE revenues SET collaborator_id = NULL WHERE id = OLD.revenue_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_split_delete_sync_revenue
  AFTER DELETE ON commission_splits
  FOR EACH ROW
  EXECUTE FUNCTION sync_revenue_collaborator_on_split_delete();

-- === TRIGGER: sync revenues.collaborator_id when split is inserted/updated ===

CREATE OR REPLACE FUNCTION sync_revenue_collaborator_on_split_upsert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE revenues SET collaborator_id = NEW.collaborator_id WHERE id = NEW.revenue_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_split_upsert_sync_revenue
  AFTER INSERT OR UPDATE ON commission_splits
  FOR EACH ROW
  EXECUTE FUNCTION sync_revenue_collaborator_on_split_upsert();
