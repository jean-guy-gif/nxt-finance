-- ============================================
-- NXT Finance — Salary fields for salarié collaborators
-- ============================================
-- The commission split for a salarié is a PERFORMANCE indicator.
-- The actual cost is the monthly employer total cost, not a % of commission.
--
-- employer_cost_rate is deprecated — replaced by fixed monthly amounts.
-- ============================================

-- Add salary fields
ALTER TABLE collaborators ADD COLUMN salary_net_monthly NUMERIC(12,2);
ALTER TABLE collaborators ADD COLUMN salary_gross_monthly NUMERIC(12,2);
ALTER TABLE collaborators ADD COLUMN employer_total_cost_monthly NUMERIC(12,2);

-- Constraints: salary fields must be non-negative when set
ALTER TABLE collaborators ADD CONSTRAINT chk_salary_net_positive
  CHECK (salary_net_monthly IS NULL OR salary_net_monthly >= 0);
ALTER TABLE collaborators ADD CONSTRAINT chk_salary_gross_positive
  CHECK (salary_gross_monthly IS NULL OR salary_gross_monthly >= 0);
ALTER TABLE collaborators ADD CONSTRAINT chk_employer_cost_positive
  CHECK (employer_total_cost_monthly IS NULL OR employer_total_cost_monthly >= 0);

-- Drop the deprecated employer_cost_rate constraint and column
ALTER TABLE collaborators DROP CONSTRAINT IF EXISTS chk_employer_cost_rate_range;
ALTER TABLE collaborators DROP COLUMN IF EXISTS employer_cost_rate;
