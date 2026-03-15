-- ============================================
-- NXT Finance — Fix: allow members to update accountant_comments
-- Without this, the "Résoudre" button fails silently (RLS blocks UPDATE).
-- ============================================

CREATE POLICY "Members can update agency comments"
  ON accountant_comments FOR UPDATE
  USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );
