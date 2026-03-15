-- ============================================
-- NXT Finance — I2: Fine-grained RLS for accountant role
-- ============================================
-- Currently, any agency member can read all agency data.
-- This migration restricts accountant access based on
-- the permissions JSONB in agency_members.
--
-- Logic:
-- - Managers and assistants: full read access (unchanged)
-- - Accountants: read access only if permissions->>'read' = 'true'
-- ============================================

-- Helper function: check if the current user has a specific permission
-- for a given agency. Returns true for non-accountant roles (manager, assistant).
CREATE OR REPLACE FUNCTION public.has_agency_permission(
  p_agency_id UUID,
  p_permission TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agency_members
    WHERE user_id = auth.uid()
      AND agency_id = p_agency_id
      AND (
        -- Managers and assistants always have access
        role IN ('manager', 'assistant')
        -- Accountants need the specific permission
        OR (role = 'accountant' AND (permissions->>p_permission)::boolean = true)
      )
  );
$$;

-- ============================================
-- Replace SELECT policies with permission-aware versions
-- ============================================

-- REVENUES: read requires 'read' permission for accountants
DROP POLICY IF EXISTS "Members can read agency revenues" ON revenues;
CREATE POLICY "Members can read agency revenues"
  ON revenues FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

-- EXPENSES: read requires 'read' permission for accountants
DROP POLICY IF EXISTS "Members can read agency expenses" ON expenses;
CREATE POLICY "Members can read agency expenses"
  ON expenses FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

-- RECEIPTS: read requires 'read' permission for accountants
DROP POLICY IF EXISTS "Members can read agency receipts" ON receipt_documents;
CREATE POLICY "Members can read agency receipts"
  ON receipt_documents FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

-- PERIODS: read requires 'read' permission for accountants
DROP POLICY IF EXISTS "Members can read agency periods" ON accounting_periods;
CREATE POLICY "Members can read agency periods"
  ON accounting_periods FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

-- ALERTS: read requires 'read' permission for accountants
DROP POLICY IF EXISTS "Members can read agency alerts" ON alerts;
CREATE POLICY "Members can read agency alerts"
  ON alerts FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

-- COMMENTS: read always allowed for agency members (needed for collaboration)
-- No change — accountants always need to see comments to collaborate.

-- EXPORTS: read requires 'export' permission for accountants
DROP POLICY IF EXISTS "Members can read agency exports" ON export_jobs;
CREATE POLICY "Members can read agency exports"
  ON export_jobs FOR SELECT
  USING (has_agency_permission(agency_id, 'export'));

-- ACTIVITY LOGS: read requires 'read' permission for accountants
DROP POLICY IF EXISTS "Members can read agency logs" ON activity_logs;
CREATE POLICY "Members can read agency logs"
  ON activity_logs FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

-- ============================================
-- INSERT policies: accountants need specific permissions
-- ============================================

-- COMMENTS: insert requires 'comment' permission for accountants
DROP POLICY IF EXISTS "Members can insert agency comments" ON accountant_comments;
CREATE POLICY "Members can insert agency comments"
  ON accountant_comments FOR INSERT
  WITH CHECK (has_agency_permission(agency_id, 'comment'));

-- COMMENTS: update requires 'comment' permission for accountants
DROP POLICY IF EXISTS "Members can update agency comments" ON accountant_comments;
CREATE POLICY "Members can update agency comments"
  ON accountant_comments FOR UPDATE
  USING (has_agency_permission(agency_id, 'comment'));

-- ============================================
-- Write policies: accountants cannot write business data
-- (INSERT/UPDATE on revenues, expenses, receipts, periods
-- already restricted to managers/assistants by the existing
-- membership check — accountants can insert but the data
-- would be scoped to their agency. For extra safety:)
-- ============================================

-- REVENUES: insert/update restricted to non-accountant roles
DROP POLICY IF EXISTS "Members can insert agency revenues" ON revenues;
CREATE POLICY "Members can insert agency revenues"
  ON revenues FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role IN ('manager', 'assistant')
    )
  );

DROP POLICY IF EXISTS "Members can update agency revenues" ON revenues;
CREATE POLICY "Members can update agency revenues"
  ON revenues FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role IN ('manager', 'assistant')
    )
  );

-- EXPENSES: insert/update restricted to non-accountant roles
DROP POLICY IF EXISTS "Members can insert agency expenses" ON expenses;
CREATE POLICY "Members can insert agency expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role IN ('manager', 'assistant')
    )
  );

DROP POLICY IF EXISTS "Members can update agency expenses" ON expenses;
CREATE POLICY "Members can update agency expenses"
  ON expenses FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role IN ('manager', 'assistant')
    )
  );

-- RECEIPTS: insert/update restricted to non-accountant roles
DROP POLICY IF EXISTS "Members can insert agency receipts" ON receipt_documents;
CREATE POLICY "Members can insert agency receipts"
  ON receipt_documents FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role IN ('manager', 'assistant')
    )
  );

DROP POLICY IF EXISTS "Members can update agency receipts" ON receipt_documents;
CREATE POLICY "Members can update agency receipts"
  ON receipt_documents FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role IN ('manager', 'assistant')
    )
  );
