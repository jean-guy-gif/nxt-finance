-- ============================================
-- NXT Finance V3.4 — Profitability Snapshots & Agency Groups
-- ============================================
-- Core tables for profitability analysis engine:
--   - profitability_snapshots: margin/cost snapshots per agency, collaborator or activity
--   - agency_groups: user-defined groupings of agencies
--   - agency_group_members: many-to-many link between groups and agencies
-- ============================================

-- === ENUMS ===

CREATE TYPE profitability_scope AS ENUM (
  'agency',
  'collaborator',
  'activity'
);

-- === TABLE: profitability_snapshots ===

CREATE TABLE profitability_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  scope profitability_scope NOT NULL,
  scope_id UUID,
  scope_label TEXT NOT NULL,
  revenue_total DECIMAL NOT NULL DEFAULT 0,
  cost_total DECIMAL NOT NULL DEFAULT 0,
  margin DECIMAL NOT NULL DEFAULT 0,
  margin_rate DECIMAL NOT NULL DEFAULT 0,
  cost_revenue_ratio DECIMAL NOT NULL DEFAULT 0,
  calculation_version TEXT NOT NULL DEFAULT 'profitability_v1.0',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  input_hash TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garde-fous
  CONSTRAINT chk_profitability_period_month CHECK (period_month >= 1 AND period_month <= 12)
);

-- Unique: one snapshot per agency+period+scope+scope_id (COALESCE handles NULL scope_id)
CREATE UNIQUE INDEX idx_profitability_unique
  ON profitability_snapshots(agency_id, period_month, period_year, scope, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'));

-- === TABLE: agency_groups ===

CREATE TABLE agency_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES user_profiles(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- === TABLE: agency_group_members ===

CREATE TABLE agency_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES agency_groups(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_agency_group_members UNIQUE (group_id, agency_id)
);

-- === INDEXES ===

CREATE INDEX idx_profitability_agency ON profitability_snapshots(agency_id);
CREATE INDEX idx_profitability_period ON profitability_snapshots(agency_id, period_year, period_month);
CREATE INDEX idx_profitability_scope ON profitability_snapshots(agency_id, scope);

CREATE INDEX idx_agency_groups_owner ON agency_groups(owner_id);

CREATE INDEX idx_agency_group_members_group ON agency_group_members(group_id);

-- === RLS ===

ALTER TABLE profitability_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_group_members ENABLE ROW LEVEL SECURITY;

-- profitability_snapshots: agency members can read
CREATE POLICY "Members can read agency profitability snapshots"
  ON profitability_snapshots FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- profitability_snapshots: agency members can insert
CREATE POLICY "Members can insert agency profitability snapshots"
  ON profitability_snapshots FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- profitability_snapshots: agency members can update
CREATE POLICY "Members can update agency profitability snapshots"
  ON profitability_snapshots FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- profitability_snapshots: agency members can delete
CREATE POLICY "Members can delete agency profitability snapshots"
  ON profitability_snapshots FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- agency_groups: owner can read
CREATE POLICY "Owner can read agency groups"
  ON agency_groups FOR SELECT
  USING (owner_id = auth.uid());

-- agency_groups: owner can insert
CREATE POLICY "Owner can insert agency groups"
  ON agency_groups FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- agency_groups: owner can update
CREATE POLICY "Owner can update agency groups"
  ON agency_groups FOR UPDATE
  USING (owner_id = auth.uid());

-- agency_groups: owner can delete
CREATE POLICY "Owner can delete agency groups"
  ON agency_groups FOR DELETE
  USING (owner_id = auth.uid());

-- agency_group_members: user can read if group belongs to them
CREATE POLICY "Owner can read agency group members"
  ON agency_group_members FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM agency_groups WHERE owner_id = auth.uid()
    )
  );

-- agency_group_members: user can insert if group belongs to them
CREATE POLICY "Owner can insert agency group members"
  ON agency_group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM agency_groups WHERE owner_id = auth.uid()
    )
  );

-- agency_group_members: user can update if group belongs to them
CREATE POLICY "Owner can update agency group members"
  ON agency_group_members FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM agency_groups WHERE owner_id = auth.uid()
    )
  );

-- agency_group_members: user can delete if group belongs to them
CREATE POLICY "Owner can delete agency group members"
  ON agency_group_members FOR DELETE
  USING (
    group_id IN (
      SELECT id FROM agency_groups WHERE owner_id = auth.uid()
    )
  );

-- === TRIGGERS: updated_at ===

CREATE TRIGGER set_updated_at_profitability_snapshots
  BEFORE UPDATE ON profitability_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_agency_groups
  BEFORE UPDATE ON agency_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_agency_group_members
  BEFORE UPDATE ON agency_group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
