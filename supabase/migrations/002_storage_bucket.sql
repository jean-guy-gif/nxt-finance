-- ============================================
-- NXT Finance — Storage bucket for receipts
-- ============================================

-- Create the receipts bucket (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users can upload to their agency folder
CREATE POLICY "Agency members can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT agency_id::text FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- Policy: authenticated users can read from their agency folder
CREATE POLICY "Agency members can read receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT agency_id::text FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- Policy: authenticated users can delete from their agency folder
CREATE POLICY "Agency members can delete receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT agency_id::text FROM agency_members WHERE user_id = auth.uid()
    )
  );
