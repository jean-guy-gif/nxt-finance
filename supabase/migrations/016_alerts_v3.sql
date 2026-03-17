-- ============================================
-- NXT Finance V3.5 — Alerts V3: Domains, Lifecycle & Recommendations
-- ============================================
-- Extends the existing alerts table with:
--   - alert_domain: classifies alerts by financial domain
--   - alert_lifecycle: tracks alert state (active → read → treated/snoozed/dismissed)
--   - recommendation fields: LLM-generated recommendation text + traceability
--   - measured/threshold values for quantitative alerts
--   - related_entity_name for contextual display
-- ============================================

-- === ENUMS ===

CREATE TYPE alert_domain AS ENUM (
  'treasury',
  'vat',
  'pre_accounting',
  'accountant',
  'profitability_agency',
  'profitability_collaborator',
  'business_trend',
  'business_plan_tracking'
);

CREATE TYPE alert_lifecycle AS ENUM (
  'active',
  'read',
  'treated',
  'snoozed',
  'dismissed'
);

-- === ALTER TABLE: alerts ===

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_domain alert_domain;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS indicator_key TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS measured_value DECIMAL;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS threshold_value DECIMAL;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS recommendation TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS recommendation_at TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS llm_generation_id UUID REFERENCES llm_generations(id);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS lifecycle alert_lifecycle NOT NULL DEFAULT 'active';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS treated_at TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS related_entity_name TEXT;

-- === INDEXES ===

CREATE INDEX IF NOT EXISTS idx_alerts_domain ON alerts(alert_domain) WHERE alert_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_lifecycle ON alerts(lifecycle) WHERE lifecycle = 'active';
CREATE INDEX IF NOT EXISTS idx_alerts_agency_domain ON alerts(agency_id, alert_domain);

-- === BACKFILL: map existing category → alert_domain ===

UPDATE alerts SET alert_domain = 'treasury' WHERE category = 'treasury' AND alert_domain IS NULL;
UPDATE alerts SET alert_domain = 'vat' WHERE category = 'vat' AND alert_domain IS NULL;
UPDATE alerts SET alert_domain = 'pre_accounting' WHERE category = 'pre_accounting' AND alert_domain IS NULL;
UPDATE alerts SET alert_domain = 'accountant' WHERE category = 'accountant' AND alert_domain IS NULL;

-- === BACKFILL: sync lifecycle with existing is_dismissed flag ===

UPDATE alerts SET lifecycle = 'dismissed' WHERE is_dismissed = true AND lifecycle = 'active';
