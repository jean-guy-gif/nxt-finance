-- ============================================
-- NXT Finance — I3: Server-side validation via CHECK constraints
-- ============================================
-- These constraints protect data integrity even if the client
-- validation is bypassed (direct API call, bug, etc.).
-- ============================================

-- === REVENUES ===

-- Amount must be positive
ALTER TABLE revenues ADD CONSTRAINT chk_revenue_amount_positive
  CHECK (amount > 0);

-- Amount HT must be positive or null
ALTER TABLE revenues ADD CONSTRAINT chk_revenue_amount_ht_positive
  CHECK (amount_ht IS NULL OR amount_ht >= 0);

-- Amount TTC must be positive or null
ALTER TABLE revenues ADD CONSTRAINT chk_revenue_amount_ttc_positive
  CHECK (amount_ttc IS NULL OR amount_ttc >= 0);

-- VAT amount must be non-negative or null
ALTER TABLE revenues ADD CONSTRAINT chk_revenue_vat_positive
  CHECK (vat_amount IS NULL OR vat_amount >= 0);

-- Label must not be empty
ALTER TABLE revenues ADD CONSTRAINT chk_revenue_label_not_empty
  CHECK (length(trim(label)) > 0);

-- === EXPENSES ===

-- Amount TTC must be positive
ALTER TABLE expenses ADD CONSTRAINT chk_expense_amount_ttc_positive
  CHECK (amount_ttc > 0);

-- Amount HT must be positive or null
ALTER TABLE expenses ADD CONSTRAINT chk_expense_amount_ht_positive
  CHECK (amount_ht IS NULL OR amount_ht >= 0);

-- VAT amount must be non-negative or null
ALTER TABLE expenses ADD CONSTRAINT chk_expense_vat_positive
  CHECK (vat_amount IS NULL OR vat_amount >= 0);

-- Supplier must not be empty
ALTER TABLE expenses ADD CONSTRAINT chk_expense_supplier_not_empty
  CHECK (length(trim(supplier)) > 0);

-- === ACCOUNTING PERIODS ===

-- VAT amounts must be non-negative or null
ALTER TABLE accounting_periods ADD CONSTRAINT chk_period_vat_collected_positive
  CHECK (vat_collected IS NULL OR vat_collected >= 0);

ALTER TABLE accounting_periods ADD CONSTRAINT chk_period_vat_deductible_positive
  CHECK (vat_deductible IS NULL OR vat_deductible >= 0);

-- Month and year already have CHECK in table definition (1-12, 2020-2100)

-- === RECEIPT DOCUMENTS ===

-- OCR amounts must be non-negative or null
ALTER TABLE receipt_documents ADD CONSTRAINT chk_receipt_ocr_amount_positive
  CHECK (ocr_amount IS NULL OR ocr_amount >= 0);

ALTER TABLE receipt_documents ADD CONSTRAINT chk_receipt_ocr_vat_positive
  CHECK (ocr_vat IS NULL OR ocr_vat >= 0);

-- OCR confidence must be 0-1 or null
ALTER TABLE receipt_documents ADD CONSTRAINT chk_receipt_ocr_confidence_range
  CHECK (ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 1));

-- File name must not be empty
ALTER TABLE receipt_documents ADD CONSTRAINT chk_receipt_file_name_not_empty
  CHECK (length(trim(file_name)) > 0);

-- === EXPORT JOBS ===

-- Document count must be non-negative
ALTER TABLE export_jobs ADD CONSTRAINT chk_export_document_count_positive
  CHECK (document_count >= 0);

-- === AGENCY ===

-- Name must not be empty
ALTER TABLE agencies ADD CONSTRAINT chk_agency_name_not_empty
  CHECK (length(trim(name)) > 0);
