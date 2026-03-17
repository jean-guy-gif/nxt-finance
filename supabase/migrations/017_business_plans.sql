-- ============================================
-- NXT Finance V3.6 — Business Plans
-- ============================================
-- Core tables for business plan engine:
--   - business_plans: main BP entity per agency/year with versioning
--   - bp_hypotheses: scenario-based growth/cost hypotheses
--   - bp_projections: monthly computed projections per scenario
--   - bp_narratives: AI-generated narrative sections per scenario
-- ============================================

-- === ENUMS ===

CREATE TYPE bp_status AS ENUM (
  'draft',
  'computing',
  'ready',
  'archived'
);

CREATE TYPE bp_scenario AS ENUM (
  'pessimistic',
  'realistic',
  'optimistic'
);

CREATE TYPE bp_hypothesis_level AS ENUM (
  'auto',
  'macro',
  'detailed'
);

CREATE TYPE bp_hypothesis_value_type AS ENUM (
  'percentage',
  'amount',
  'count'
);

CREATE TYPE bp_period_granularity AS ENUM (
  'annual',
  'monthly'
);

-- === TABLE: business_plans ===

CREATE TABLE business_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES financial_analyses(id),
  target_year INTEGER NOT NULL,
  status bp_status NOT NULL DEFAULT 'draft',
  version_number INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  parent_id UUID REFERENCES business_plans(id),
  archived_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique: only one current BP per agency+year
CREATE UNIQUE INDEX idx_business_plans_current
  ON business_plans(agency_id, target_year, is_current)
  WHERE is_current = true;

-- === TABLE: bp_hypotheses ===

CREATE TABLE bp_hypotheses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  scenario bp_scenario NOT NULL,
  level bp_hypothesis_level NOT NULL DEFAULT 'auto',
  category TEXT NOT NULL,
  parent_category TEXT,
  label TEXT NOT NULL,
  value DECIMAL NOT NULL,
  value_type bp_hypothesis_value_type NOT NULL,
  period_granularity bp_period_granularity NOT NULL DEFAULT 'annual',
  month INTEGER,
  is_user_override BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garde-fous
  CONSTRAINT chk_bp_hypotheses_month CHECK (month IS NULL OR (month >= 1 AND month <= 12))
);

-- === TABLE: bp_projections ===

CREATE TABLE bp_projections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  scenario bp_scenario NOT NULL,
  month INTEGER NOT NULL,
  revenue_projected DECIMAL NOT NULL DEFAULT 0,
  expenses_projected DECIMAL NOT NULL DEFAULT 0,
  margin_projected DECIMAL NOT NULL DEFAULT 0,
  treasury_projected DECIMAL NOT NULL DEFAULT 0,
  details_json JSONB,
  calculation_version TEXT NOT NULL DEFAULT 'bp_engine_v1.0',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  input_hash TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garde-fous
  CONSTRAINT chk_bp_projections_month CHECK (month >= 1 AND month <= 12)
);

-- Unique: one projection per BP+scenario+month
CREATE UNIQUE INDEX idx_bp_projections_unique
  ON bp_projections(business_plan_id, scenario, month);

-- === TABLE: bp_narratives ===

CREATE TABLE bp_narratives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  scenario bp_scenario NOT NULL,
  section TEXT NOT NULL,
  content TEXT NOT NULL,
  llm_generation_id UUID REFERENCES llm_generations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === INDEXES ===

CREATE INDEX idx_business_plans_agency ON business_plans(agency_id);
CREATE INDEX idx_business_plans_agency_year ON business_plans(agency_id, target_year);
CREATE INDEX idx_business_plans_status ON business_plans(agency_id, status);

CREATE INDEX idx_bp_hypotheses_bp ON bp_hypotheses(business_plan_id);
CREATE INDEX idx_bp_hypotheses_bp_scenario ON bp_hypotheses(business_plan_id, scenario);

CREATE INDEX idx_bp_projections_bp ON bp_projections(business_plan_id);
CREATE INDEX idx_bp_projections_bp_scenario ON bp_projections(business_plan_id, scenario);

CREATE INDEX idx_bp_narratives_bp ON bp_narratives(business_plan_id);
CREATE INDEX idx_bp_narratives_bp_scenario ON bp_narratives(business_plan_id, scenario);

-- === RLS ===

ALTER TABLE business_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_narratives ENABLE ROW LEVEL SECURITY;

-- business_plans: agency members can read
CREATE POLICY "Members can read agency business plans"
  ON business_plans FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- business_plans: agency members can insert
CREATE POLICY "Members can insert agency business plans"
  ON business_plans FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- business_plans: agency members can update
CREATE POLICY "Members can update agency business plans"
  ON business_plans FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- business_plans: agency members can delete
CREATE POLICY "Members can delete agency business plans"
  ON business_plans FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- bp_hypotheses: access through business_plan's agency
CREATE POLICY "Members can read bp hypotheses"
  ON bp_hypotheses FOR SELECT
  USING (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can insert bp hypotheses"
  ON bp_hypotheses FOR INSERT
  WITH CHECK (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can update bp hypotheses"
  ON bp_hypotheses FOR UPDATE
  USING (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can delete bp hypotheses"
  ON bp_hypotheses FOR DELETE
  USING (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

-- bp_projections: access through business_plan's agency
CREATE POLICY "Members can read bp projections"
  ON bp_projections FOR SELECT
  USING (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can insert bp projections"
  ON bp_projections FOR INSERT
  WITH CHECK (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can update bp projections"
  ON bp_projections FOR UPDATE
  USING (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can delete bp projections"
  ON bp_projections FOR DELETE
  USING (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

-- bp_narratives: access through business_plan's agency
CREATE POLICY "Members can read bp narratives"
  ON bp_narratives FOR SELECT
  USING (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can insert bp narratives"
  ON bp_narratives FOR INSERT
  WITH CHECK (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can update bp narratives"
  ON bp_narratives FOR UPDATE
  USING (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can delete bp narratives"
  ON bp_narratives FOR DELETE
  USING (
    business_plan_id IN (
      SELECT id FROM business_plans WHERE agency_id IN (
        SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
      )
    )
  );

-- === TRIGGERS: updated_at ===

CREATE TRIGGER set_updated_at_business_plans
  BEFORE UPDATE ON business_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_bp_hypotheses
  BEFORE UPDATE ON bp_hypotheses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_bp_projections
  BEFORE UPDATE ON bp_projections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_bp_narratives
  BEFORE UPDATE ON bp_narratives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
