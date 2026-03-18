-- ============================================
-- NXT Finance V3.5 — Phase B: Temporal data column
-- ============================================
-- Adds JSONB column for temporal analysis data
-- (monthly series, trends, projections, seasonality)
-- ============================================

ALTER TABLE financial_analyses
ADD COLUMN IF NOT EXISTS temporal_data JSONB;

COMMENT ON COLUMN financial_analyses.temporal_data IS 'Phase B temporal analysis: monthly_series, monthly_comparison, trends, projection, seasonality';
