-- ============================================
-- NXT Finance V3.1 — Processing Jobs, LLM Generations & Bilans Storage
-- ============================================
-- Foundation tables for V3 async processing pipeline:
--   - processing_jobs: tracks background jobs (parsing, generation, export)
--   - llm_generations: audit trail for all LLM calls
--   - bilans storage bucket: private file storage for uploaded bilans
-- ============================================

-- === ENUMS ===

CREATE TYPE job_type AS ENUM (
  'bilan_parsing',
  'analysis_generation',
  'bp_generation',
  'dossier_generation',
  'dossier_export',
  'llm_generation'
);

CREATE TYPE job_status AS ENUM (
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE llm_output_type AS ENUM (
  'financial_insight',
  'bp_narrative',
  'alert_recommendation',
  'slide_narrative',
  'director_summary'
);

CREATE TYPE llm_generation_status AS ENUM (
  'pending',
  'completed',
  'failed'
);

-- === TABLE: processing_jobs ===

CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  job_type job_type NOT NULL,
  status job_status NOT NULL DEFAULT 'queued',
  related_type TEXT NOT NULL,
  related_id UUID NOT NULL,
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  triggered_by UUID REFERENCES user_profiles(id),
  payload_json JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garde-fous
  CONSTRAINT chk_jobs_progress_range CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT chk_jobs_related_type_not_empty CHECK (length(trim(related_type)) > 0)
);

-- === TABLE: llm_generations ===

CREATE TABLE llm_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'anthropic',
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  input_refs JSONB NOT NULL DEFAULT '{}',
  output_type llm_output_type NOT NULL,
  output_id UUID,
  tokens_input INTEGER,
  tokens_output INTEGER,
  duration_ms INTEGER,
  status llm_generation_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garde-fous
  CONSTRAINT chk_llm_tokens_input_positive CHECK (tokens_input >= 0),
  CONSTRAINT chk_llm_tokens_output_positive CHECK (tokens_output >= 0)
);

-- === INDEXES ===

CREATE INDEX idx_jobs_agency ON processing_jobs(agency_id);
CREATE INDEX idx_jobs_status ON processing_jobs(status) WHERE status IN ('queued', 'processing');
CREATE INDEX idx_jobs_related ON processing_jobs(related_type, related_id);

CREATE INDEX idx_llm_agency ON llm_generations(agency_id);
CREATE INDEX idx_llm_output ON llm_generations(output_type, output_id);
CREATE INDEX idx_llm_status ON llm_generations(status) WHERE status = 'pending';

-- Unique partial index: prevents duplicate active jobs for the same target
CREATE UNIQUE INDEX idx_jobs_no_duplicate_active
  ON processing_jobs(related_type, related_id, job_type)
  WHERE status IN ('queued', 'processing');

-- === RLS ===

ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_generations ENABLE ROW LEVEL SECURITY;

-- processing_jobs: agency members can read
CREATE POLICY "Members can read agency processing jobs"
  ON processing_jobs FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- processing_jobs: agency members can insert
CREATE POLICY "Members can insert agency processing jobs"
  ON processing_jobs FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- processing_jobs: agency members can update
CREATE POLICY "Members can update agency processing jobs"
  ON processing_jobs FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- llm_generations: agency members can read
CREATE POLICY "Members can read agency LLM generations"
  ON llm_generations FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- llm_generations: agency members can insert
CREATE POLICY "Members can insert agency LLM generations"
  ON llm_generations FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- llm_generations: agency members can update
CREATE POLICY "Members can update agency LLM generations"
  ON llm_generations FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- === TRIGGER: updated_at on processing_jobs ===

CREATE TRIGGER set_updated_at_processing_jobs
  BEFORE UPDATE ON processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- === STORAGE: bilans bucket ===

-- Create the bilans bucket (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bilans', 'bilans', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users can upload to their agency folder
CREATE POLICY "Agency members can upload bilans"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bilans'
    AND (storage.foldername(name))[1] IN (
      SELECT agency_id::text FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- Policy: authenticated users can read from their agency folder
CREATE POLICY "Agency members can read bilans"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bilans'
    AND (storage.foldername(name))[1] IN (
      SELECT agency_id::text FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- Policy: authenticated users can delete from their agency folder
CREATE POLICY "Agency members can delete bilans"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bilans'
    AND (storage.foldername(name))[1] IN (
      SELECT agency_id::text FROM agency_members WHERE user_id = auth.uid()
    )
  );
