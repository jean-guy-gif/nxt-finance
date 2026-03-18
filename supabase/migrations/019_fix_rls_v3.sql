-- ============================================
-- NXT Finance V3.5 — Fix RLS policies for V3 tables
-- ============================================
-- Problem: missing DELETE policies on financial_ratios, financial_insights,
-- balance_sheet_items, balance_sheet_checks. The analysis engine and parse
-- pipeline use DELETE for idempotency, which fails with RLS enabled.
-- Also: missing DELETE policy on financial_analyses.
-- ============================================

-- =============================================
-- 1. financial_ratios — add DELETE policy
-- =============================================
CREATE POLICY "Members can delete agency financial ratios"
  ON financial_ratios FOR DELETE
  USING (
    analysis_id IN (
      SELECT fa.id FROM financial_analyses fa
      JOIN agency_members am ON am.agency_id = fa.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- =============================================
-- 2. financial_insights — add DELETE policy
-- =============================================
CREATE POLICY "Members can delete agency financial insights"
  ON financial_insights FOR DELETE
  USING (
    analysis_id IN (
      SELECT fa.id FROM financial_analyses fa
      JOIN agency_members am ON am.agency_id = fa.agency_id
      WHERE am.user_id = auth.uid()
    )
  );

-- =============================================
-- 3. financial_analyses — add DELETE policy
-- =============================================
CREATE POLICY "Members can delete agency financial analyses"
  ON financial_analyses FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 4. Add temporal_data column (from 018_temporal_data.sql)
-- =============================================
ALTER TABLE financial_analyses
ADD COLUMN IF NOT EXISTS temporal_data JSONB;

COMMENT ON COLUMN financial_analyses.temporal_data IS 'Phase B temporal analysis: monthly_series, monthly_comparison, trends, projection, seasonality';
