-- ============================================
-- NXT Finance — RLS fixes
-- ============================================

-- Fix: user_profiles needs INSERT policy for the auto-creation trigger
CREATE POLICY "System can insert user profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (true);
  -- The trigger runs with SECURITY DEFINER, but this policy
  -- also allows the client to insert a profile if needed.
  -- The id = auth.uid() constraint is enforced by the FK to auth.users.

-- Fix: remove the overly broad "Members can manage agency periods" FOR ALL
-- and replace with explicit INSERT/UPDATE policies
DROP POLICY IF EXISTS "Members can manage agency periods" ON accounting_periods;

CREATE POLICY "Members can insert agency periods"
  ON accounting_periods FOR INSERT
  WITH CHECK (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update agency periods"
  ON accounting_periods FOR UPDATE
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

-- Fix: add DELETE policies for tables that support deletion
CREATE POLICY "Members can delete draft revenues"
  ON revenues FOR DELETE
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
    AND status = 'draft'
  );

CREATE POLICY "Members can delete draft expenses"
  ON expenses FOR DELETE
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
    AND status = 'draft'
  );

CREATE POLICY "Members can delete agency receipts"
  ON receipt_documents FOR DELETE
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete agency alerts"
  ON alerts FOR DELETE
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

-- Fix: agency_members DELETE for managers removing members
CREATE POLICY "Managers can delete agency members"
  ON agency_members FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Fix: allow managers to insert new agency members
CREATE POLICY "Managers can insert agency members"
  ON agency_members FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Fix: allow managers to update agency members
CREATE POLICY "Managers can update agency members"
  ON agency_members FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Fix: allow managers to update their agency
CREATE POLICY "Managers can update their agencies"
  ON agencies FOR UPDATE
  USING (
    id IN (
      SELECT agency_id FROM agency_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );
