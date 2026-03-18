-- ============================================
-- NXT Finance V3.5 — Complete RLS fix for all V3 tables
-- ============================================
-- This migration ensures ALL V3 tables have complete, consistent
-- RLS policies (SELECT, INSERT, UPDATE, DELETE) following the
-- same pattern as core tables (revenues, expenses).
--
-- Pattern:
--   SELECT: has_agency_permission(agency_id, 'read') — supports accountant role
--   INSERT: role IN ('manager', 'assistant') — staff only
--   UPDATE: role IN ('manager', 'assistant') — staff only
--   DELETE: role IN ('manager', 'assistant') — staff only
--
-- Child tables (items, checks, ratios, insights) use JOIN to parent's agency.
-- ============================================

-- =============================================
-- 0. Ensure temporal_data column exists
-- =============================================
ALTER TABLE financial_analyses
ADD COLUMN IF NOT EXISTS temporal_data JSONB;

-- =============================================
-- Helper: agency staff check (manager/assistant)
-- =============================================
CREATE OR REPLACE FUNCTION public.is_agency_staff(p_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agency_members
    WHERE user_id = auth.uid()
      AND agency_id = p_agency_id
      AND role IN ('manager', 'assistant')
  );
$$;

-- =============================================
-- 1. balance_sheets
-- =============================================
DROP POLICY IF EXISTS "Members can read agency balance sheets" ON balance_sheets;
CREATE POLICY "Members can read agency balance sheets"
  ON balance_sheets FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

DROP POLICY IF EXISTS "Members can insert agency balance sheets" ON balance_sheets;
CREATE POLICY "Members can insert agency balance sheets"
  ON balance_sheets FOR INSERT
  WITH CHECK (is_agency_staff(agency_id));

DROP POLICY IF EXISTS "Members can update agency balance sheets" ON balance_sheets;
CREATE POLICY "Members can update agency balance sheets"
  ON balance_sheets FOR UPDATE
  USING (is_agency_staff(agency_id));

DROP POLICY IF EXISTS "Members can delete agency balance sheets" ON balance_sheets;
CREATE POLICY "Members can delete agency balance sheets"
  ON balance_sheets FOR DELETE
  USING (is_agency_staff(agency_id));

-- =============================================
-- 2. balance_sheet_items (via parent balance_sheet)
-- =============================================
DROP POLICY IF EXISTS "Members can read agency balance sheet items" ON balance_sheet_items;
CREATE POLICY "Members can read agency balance sheet items"
  ON balance_sheet_items FOR SELECT
  USING (
    balance_sheet_id IN (
      SELECT id FROM balance_sheets WHERE has_agency_permission(agency_id, 'read')
    )
  );

DROP POLICY IF EXISTS "Members can insert agency balance sheet items" ON balance_sheet_items;
CREATE POLICY "Members can insert agency balance sheet items"
  ON balance_sheet_items FOR INSERT
  WITH CHECK (
    balance_sheet_id IN (
      SELECT id FROM balance_sheets WHERE is_agency_staff(agency_id)
    )
  );

DROP POLICY IF EXISTS "Members can update agency balance sheet items" ON balance_sheet_items;
CREATE POLICY "Members can update agency balance sheet items"
  ON balance_sheet_items FOR UPDATE
  USING (
    balance_sheet_id IN (
      SELECT id FROM balance_sheets WHERE is_agency_staff(agency_id)
    )
  );

DROP POLICY IF EXISTS "Members can delete agency balance sheet items" ON balance_sheet_items;
CREATE POLICY "Members can delete agency balance sheet items"
  ON balance_sheet_items FOR DELETE
  USING (
    balance_sheet_id IN (
      SELECT id FROM balance_sheets WHERE is_agency_staff(agency_id)
    )
  );

-- =============================================
-- 3. balance_sheet_checks (via parent balance_sheet)
-- =============================================
DROP POLICY IF EXISTS "Members can read agency balance sheet checks" ON balance_sheet_checks;
CREATE POLICY "Members can read agency balance sheet checks"
  ON balance_sheet_checks FOR SELECT
  USING (
    balance_sheet_id IN (
      SELECT id FROM balance_sheets WHERE has_agency_permission(agency_id, 'read')
    )
  );

DROP POLICY IF EXISTS "Members can insert agency balance sheet checks" ON balance_sheet_checks;
CREATE POLICY "Members can insert agency balance sheet checks"
  ON balance_sheet_checks FOR INSERT
  WITH CHECK (
    balance_sheet_id IN (
      SELECT id FROM balance_sheets WHERE is_agency_staff(agency_id)
    )
  );

DROP POLICY IF EXISTS "Members can update agency balance sheet checks" ON balance_sheet_checks;
CREATE POLICY "Members can update agency balance sheet checks"
  ON balance_sheet_checks FOR UPDATE
  USING (
    balance_sheet_id IN (
      SELECT id FROM balance_sheets WHERE is_agency_staff(agency_id)
    )
  );

DROP POLICY IF EXISTS "Members can delete agency balance sheet checks" ON balance_sheet_checks;
CREATE POLICY "Members can delete agency balance sheet checks"
  ON balance_sheet_checks FOR DELETE
  USING (
    balance_sheet_id IN (
      SELECT id FROM balance_sheets WHERE is_agency_staff(agency_id)
    )
  );

-- =============================================
-- 4. financial_analyses
-- =============================================
DROP POLICY IF EXISTS "Members can read agency financial analyses" ON financial_analyses;
CREATE POLICY "Members can read agency financial analyses"
  ON financial_analyses FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

DROP POLICY IF EXISTS "Members can insert agency financial analyses" ON financial_analyses;
CREATE POLICY "Members can insert agency financial analyses"
  ON financial_analyses FOR INSERT
  WITH CHECK (is_agency_staff(agency_id));

DROP POLICY IF EXISTS "Members can update agency financial analyses" ON financial_analyses;
CREATE POLICY "Members can update agency financial analyses"
  ON financial_analyses FOR UPDATE
  USING (is_agency_staff(agency_id));

DROP POLICY IF EXISTS "Members can delete agency financial analyses" ON financial_analyses;
CREATE POLICY "Members can delete agency financial analyses"
  ON financial_analyses FOR DELETE
  USING (is_agency_staff(agency_id));

-- =============================================
-- 5. financial_ratios (via parent analysis)
-- =============================================
DROP POLICY IF EXISTS "Members can read agency financial ratios" ON financial_ratios;
CREATE POLICY "Members can read agency financial ratios"
  ON financial_ratios FOR SELECT
  USING (
    analysis_id IN (
      SELECT id FROM financial_analyses WHERE has_agency_permission(agency_id, 'read')
    )
  );

DROP POLICY IF EXISTS "Members can insert agency financial ratios" ON financial_ratios;
CREATE POLICY "Members can insert agency financial ratios"
  ON financial_ratios FOR INSERT
  WITH CHECK (
    analysis_id IN (
      SELECT id FROM financial_analyses WHERE is_agency_staff(agency_id)
    )
  );

DROP POLICY IF EXISTS "Members can update agency financial ratios" ON financial_ratios;
CREATE POLICY "Members can update agency financial ratios"
  ON financial_ratios FOR UPDATE
  USING (
    analysis_id IN (
      SELECT id FROM financial_analyses WHERE is_agency_staff(agency_id)
    )
  );

DROP POLICY IF EXISTS "Members can delete agency financial ratios" ON financial_ratios;
CREATE POLICY "Members can delete agency financial ratios"
  ON financial_ratios FOR DELETE
  USING (
    analysis_id IN (
      SELECT id FROM financial_analyses WHERE is_agency_staff(agency_id)
    )
  );

-- =============================================
-- 6. financial_insights (via parent analysis)
-- =============================================
DROP POLICY IF EXISTS "Members can read agency financial insights" ON financial_insights;
CREATE POLICY "Members can read agency financial insights"
  ON financial_insights FOR SELECT
  USING (
    analysis_id IN (
      SELECT id FROM financial_analyses WHERE has_agency_permission(agency_id, 'read')
    )
  );

DROP POLICY IF EXISTS "Members can insert agency financial insights" ON financial_insights;
CREATE POLICY "Members can insert agency financial insights"
  ON financial_insights FOR INSERT
  WITH CHECK (
    analysis_id IN (
      SELECT id FROM financial_analyses WHERE is_agency_staff(agency_id)
    )
  );

DROP POLICY IF EXISTS "Members can update agency financial insights" ON financial_insights;
CREATE POLICY "Members can update agency financial insights"
  ON financial_insights FOR UPDATE
  USING (
    analysis_id IN (
      SELECT id FROM financial_analyses WHERE is_agency_staff(agency_id)
    )
  );

DROP POLICY IF EXISTS "Members can delete agency financial insights" ON financial_insights;
CREATE POLICY "Members can delete agency financial insights"
  ON financial_insights FOR DELETE
  USING (
    analysis_id IN (
      SELECT id FROM financial_analyses WHERE is_agency_staff(agency_id)
    )
  );

-- =============================================
-- 7. processing_jobs — add DELETE policy (missing)
-- =============================================
DROP POLICY IF EXISTS "Members can read agency processing jobs" ON processing_jobs;
CREATE POLICY "Members can read agency processing jobs"
  ON processing_jobs FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

DROP POLICY IF EXISTS "Members can insert agency processing jobs" ON processing_jobs;
CREATE POLICY "Members can insert agency processing jobs"
  ON processing_jobs FOR INSERT
  WITH CHECK (is_agency_staff(agency_id));

DROP POLICY IF EXISTS "Members can update agency processing jobs" ON processing_jobs;
CREATE POLICY "Members can update agency processing jobs"
  ON processing_jobs FOR UPDATE
  USING (is_agency_staff(agency_id));

-- =============================================
-- 8. llm_generations — harmonize pattern
-- =============================================
DROP POLICY IF EXISTS "Members can read agency LLM generations" ON llm_generations;
CREATE POLICY "Members can read agency LLM generations"
  ON llm_generations FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

DROP POLICY IF EXISTS "Members can insert agency LLM generations" ON llm_generations;
CREATE POLICY "Members can insert agency LLM generations"
  ON llm_generations FOR INSERT
  WITH CHECK (is_agency_staff(agency_id));

DROP POLICY IF EXISTS "Members can update agency LLM generations" ON llm_generations;
CREATE POLICY "Members can update agency LLM generations"
  ON llm_generations FOR UPDATE
  USING (is_agency_staff(agency_id));

-- =============================================
-- 9. profitability_snapshots — harmonize pattern
-- =============================================
DROP POLICY IF EXISTS "Members can read agency profitability snapshots" ON profitability_snapshots;
CREATE POLICY "Members can read agency profitability snapshots"
  ON profitability_snapshots FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

DROP POLICY IF EXISTS "Members can insert agency profitability snapshots" ON profitability_snapshots;
CREATE POLICY "Members can insert agency profitability snapshots"
  ON profitability_snapshots FOR INSERT
  WITH CHECK (is_agency_staff(agency_id));

DROP POLICY IF EXISTS "Members can update agency profitability snapshots" ON profitability_snapshots;
CREATE POLICY "Members can update agency profitability snapshots"
  ON profitability_snapshots FOR UPDATE
  USING (is_agency_staff(agency_id));

DROP POLICY IF EXISTS "Members can delete agency profitability snapshots" ON profitability_snapshots;
CREATE POLICY "Members can delete agency profitability snapshots"
  ON profitability_snapshots FOR DELETE
  USING (is_agency_staff(agency_id));
