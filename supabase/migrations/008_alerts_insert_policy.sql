-- ============================================
-- Fix: allow members to insert alerts (needed by alert engine)
-- ============================================

CREATE POLICY "Members can insert agency alerts"
  ON alerts FOR INSERT
  WITH CHECK (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );
