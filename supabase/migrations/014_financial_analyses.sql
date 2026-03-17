-- ============================================
-- NXT Finance V3.3 — Financial Analyses, Ratios & Insights
-- ============================================
-- Core tables for financial analysis engine:
--   - financial_analyses: analysis session per agency+fiscal_year+level
--   - financial_ratios: computed KPIs (one value per ratio per analysis)
--   - financial_insights: AI-generated strengths, weaknesses, recommendations
-- ============================================

-- === ENUMS ===

CREATE TYPE analysis_level AS ENUM (
  'basic',
  'enriched',
  'complete'
);

CREATE TYPE analysis_status AS ENUM (
  'computing',
  'ready',
  'archived'
);

CREATE TYPE ratio_status AS ENUM (
  'healthy',
  'warning',
  'critical'
);

CREATE TYPE ratio_source AS ENUM (
  'bilan',
  'nxt',
  'computed'
);

CREATE TYPE insight_type AS ENUM (
  'strength',
  'weakness',
  'anomaly',
  'recommendation'
);

CREATE TYPE insight_severity AS ENUM (
  'info',
  'attention',
  'critical'
);

-- === TABLE: financial_analyses ===

CREATE TABLE financial_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  balance_sheet_id UUID REFERENCES balance_sheets(id),
  fiscal_year INTEGER NOT NULL,
  analysis_level analysis_level NOT NULL DEFAULT 'basic',
  status analysis_status NOT NULL DEFAULT 'computing',
  health_score DECIMAL,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  parent_id UUID REFERENCES financial_analyses(id),
  archived_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garde-fous
  CONSTRAINT chk_financial_analyses_health_score_range CHECK (health_score >= 0 AND health_score <= 100)
);

-- Partial unique: only one current analysis per agency per fiscal year per level
CREATE UNIQUE INDEX idx_financial_analyses_unique_current
  ON financial_analyses(agency_id, fiscal_year, analysis_level)
  WHERE is_current = true;

-- === TABLE: financial_ratios ===

CREATE TABLE financial_ratios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES financial_analyses(id) ON DELETE CASCADE,
  ratio_key TEXT NOT NULL,
  value DECIMAL NOT NULL,
  value_n_minus_1 DECIMAL,
  benchmark_min DECIMAL,
  benchmark_max DECIMAL,
  status ratio_status NOT NULL,
  source ratio_source NOT NULL,
  calculation_version TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL,
  input_hash TEXT NOT NULL,
  formula_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: one value per ratio per analysis
CREATE UNIQUE INDEX idx_financial_ratios_unique_key
  ON financial_ratios(analysis_id, ratio_key);

-- === TABLE: financial_insights ===

CREATE TABLE financial_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES financial_analyses(id) ON DELETE CASCADE,
  insight_type insight_type NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_ratios TEXT[] DEFAULT '{}',
  severity insight_severity NOT NULL,
  llm_generation_id UUID REFERENCES llm_generations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === INDEXES ===

CREATE INDEX idx_financial_analyses_agency ON financial_analyses(agency_id);
CREATE INDEX idx_financial_analyses_fiscal ON financial_analyses(agency_id, fiscal_year);
CREATE INDEX idx_financial_analyses_status ON financial_analyses(status) WHERE status != 'archived';

CREATE INDEX idx_financial_ratios_analysis ON financial_ratios(analysis_id);
CREATE INDEX idx_financial_ratios_key ON financial_ratios(analysis_id, ratio_key);

CREATE INDEX idx_financial_insights_analysis ON financial_insights(analysis_id);

-- === RLS ===

ALTER TABLE financial_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ratios ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_insights ENABLE ROW LEVEL SECURITY;

-- financial_analyses: agency members can read
CREATE POLICY "Members can read agency financial analyses"
  ON financial_analyses FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- financial_analyses: agency members can insert
CREATE POLICY "Members can insert agency financial analyses"
  ON financial_analyses FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- financial_analyses: agency members can update
CREATE POLICY "Members can update agency financial analyses"
  ON financial_analyses FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- financial_ratios: agency members can read (join through financial_analyses)
CREATE POLICY "Members can read agency financial ratios"
  ON financial_ratios FOR SELECT
  USING (
    analysis_id IN (
      SELECT fa.id FROM financial_analyses fa
      JOIN agency_members am ON am.agency_id = fa.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- financial_ratios: agency members can insert
CREATE POLICY "Members can insert agency financial ratios"
  ON financial_ratios FOR INSERT
  WITH CHECK (
    analysis_id IN (
      SELECT fa.id FROM financial_analyses fa
      JOIN agency_members am ON am.agency_id = fa.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- financial_ratios: agency members can update
CREATE POLICY "Members can update agency financial ratios"
  ON financial_ratios FOR UPDATE
  USING (
    analysis_id IN (
      SELECT fa.id FROM financial_analyses fa
      JOIN agency_members am ON am.agency_id = fa.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- financial_insights: agency members can read (join through financial_analyses)
CREATE POLICY "Members can read agency financial insights"
  ON financial_insights FOR SELECT
  USING (
    analysis_id IN (
      SELECT fa.id FROM financial_analyses fa
      JOIN agency_members am ON am.agency_id = fa.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- financial_insights: agency members can insert
CREATE POLICY "Members can insert agency financial insights"
  ON financial_insights FOR INSERT
  WITH CHECK (
    analysis_id IN (
      SELECT fa.id FROM financial_analyses fa
      JOIN agency_members am ON am.agency_id = fa.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- financial_insights: agency members can update
CREATE POLICY "Members can update agency financial insights"
  ON financial_insights FOR UPDATE
  USING (
    analysis_id IN (
      SELECT fa.id FROM financial_analyses fa
      JOIN agency_members am ON am.agency_id = fa.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- === TRIGGERS: updated_at ===

CREATE TRIGGER set_updated_at_financial_analyses
  BEFORE UPDATE ON financial_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_financial_ratios
  BEFORE UPDATE ON financial_ratios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_financial_insights
  BEFORE UPDATE ON financial_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
