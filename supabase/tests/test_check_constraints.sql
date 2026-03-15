-- ============================================
-- TEST I3 — CHECK constraints validation
-- ============================================
-- Exécuter APRÈS la migration 007.
-- Chaque test doit ÉCHOUER avec une violation de contrainte.
-- ============================================

-- === TEST 1: Revenue with negative amount → MUST FAIL ===
INSERT INTO revenues (agency_id, label, type, amount, date, status, created_by)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Test négatif', 'commission', -500.00, '2026-03-15', 'draft',
  'fa91db44-0450-4b34-80be-4d22ab4a3a63'
);
-- Expected: ERROR check constraint "chk_revenue_amount_positive"

-- === TEST 2: Revenue with empty label → MUST FAIL ===
INSERT INTO revenues (agency_id, label, type, amount, date, status, created_by)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '', 'commission', 100.00, '2026-03-15', 'draft',
  'fa91db44-0450-4b34-80be-4d22ab4a3a63'
);
-- Expected: ERROR check constraint "chk_revenue_label_not_empty"

-- === TEST 3: Expense with zero amount → MUST FAIL ===
INSERT INTO expenses (agency_id, date, supplier, amount_ttc, category, status, created_by)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '2026-03-15', 'Test Zero', 0, 'autres_charges', 'draft',
  'fa91db44-0450-4b34-80be-4d22ab4a3a63'
);
-- Expected: ERROR check constraint "chk_expense_amount_ttc_positive"

-- === TEST 4: Expense with empty supplier → MUST FAIL ===
INSERT INTO expenses (agency_id, date, supplier, amount_ttc, category, status, created_by)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '2026-03-15', '  ', 100.00, 'autres_charges', 'draft',
  'fa91db44-0450-4b34-80be-4d22ab4a3a63'
);
-- Expected: ERROR check constraint "chk_expense_supplier_not_empty"

-- === TEST 5: Receipt with OCR confidence > 1 → MUST FAIL ===
INSERT INTO receipt_documents (agency_id, file_name, file_path, file_type, source, ocr_confidence, status, anomalies, created_by)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'test.jpg', 'test/test.jpg', 'image/jpeg', 'upload', 1.5, 'received', '[]',
  'fa91db44-0450-4b34-80be-4d22ab4a3a63'
);
-- Expected: ERROR check constraint "chk_receipt_ocr_confidence_range"

-- === TEST 6: Valid revenue → MUST SUCCEED ===
INSERT INTO revenues (agency_id, label, type, amount, date, status, created_by)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Test valide', 'commission', 1000.00, '2026-03-15', 'draft',
  'fa91db44-0450-4b34-80be-4d22ab4a3a63'
);
-- Expected: SUCCESS

-- Cleanup test 6
DELETE FROM revenues WHERE label = 'Test valide';
