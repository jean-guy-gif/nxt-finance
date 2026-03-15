-- ============================================
-- NXT Finance V2.2b — Compensation type + employer cost rate
-- ============================================
-- compensation_type distinguishes the financial nature of a split:
--   'reversement' = payout to independent collaborator
--   'masse_salariale' = estimated payroll cost for employee
--   'avance_commission' = reserved for future VRP logic (not active)
-- ============================================

CREATE TYPE compensation_type AS ENUM (
  'reversement',
  'masse_salariale',
  'avance_commission'
);

ALTER TABLE commission_splits
  ADD COLUMN compensation_type compensation_type NOT NULL DEFAULT 'reversement';

ALTER TABLE collaborators
  ADD COLUMN employer_cost_rate NUMERIC(5,2);

ALTER TABLE collaborators
  ADD CONSTRAINT chk_employer_cost_rate_range
  CHECK (employer_cost_rate IS NULL OR (employer_cost_rate >= 0 AND employer_cost_rate <= 200));
