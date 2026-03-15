-- ============================================
-- NXT Finance — Demo seed data
-- ============================================
-- This seed creates a realistic demo environment.
-- The demo user must be created via Supabase Auth first:
--   Email: demo@nxt-finance.fr / Password: demo2024
-- Then use the resulting UUID below.
--
-- IMPORTANT: Replace 'fa91db44-0450-4b34-80be-4d22ab4a3a63' with
-- the actual auth.users UUID after creating the demo user in Supabase.
-- ============================================

-- Demo user profile (update name if trigger already created it)
INSERT INTO user_profiles (id, full_name, email) VALUES
  ('fa91db44-0450-4b34-80be-4d22ab4a3a63', 'Jean-Marc Dupont', 'demo@nxt-finance.fr')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Demo accountant profile (update name if trigger already created it)
INSERT INTO user_profiles (id, full_name, email) VALUES
  ('3f103675-50d5-45c0-aa07-3831f5940668', 'Marie Lefèvre', 'comptable-demo@nxt-finance.fr')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Demo agency
INSERT INTO agencies (id, name, siret, address, is_demo, settings) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Immobilière du Parc',
    '12345678901234',
    '42 avenue des Champs-Élysées, 75008 Paris',
    true,
    '{"treasury_critical_threshold": 5000, "preparation_deadline_days": 5, "notification_frequency": "weekly"}'
  )
ON CONFLICT (id) DO NOTHING;

-- Agency memberships
INSERT INTO agency_members (id, agency_id, user_id, role, permissions) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'fa91db44-0450-4b34-80be-4d22ab4a3a63',
    'manager',
    NULL
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '3f103675-50d5-45c0-aa07-3831f5940668',
    'accountant',
    '{"read": true, "download": true, "comment": true, "request_documents": true, "validate_document": true, "validate_period": false, "export": true, "annotate": true}'
  )
ON CONFLICT DO NOTHING;

-- Accounting periods (Oct 2025 to Mar 2026)
INSERT INTO accounting_periods (id, agency_id, month, year, start_date, end_date, status, vat_collected, vat_deductible, vat_balance, vat_snapshot_at, shared_with_accountant) VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 10, 2025, '2025-10-01', '2025-10-31', 'transmitted', 7200.00, 2100.00, 5100.00, '2025-11-05T10:00:00Z', true),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 11, 2025, '2025-11-01', '2025-11-30', 'transmitted', 6800.00, 1950.00, 4850.00, '2025-12-04T10:00:00Z', true),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 12, 2025, '2025-12-01', '2025-12-31', 'ready_to_transmit', 8100.00, 2400.00, 5700.00, '2026-01-06T10:00:00Z', false),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 1, 2026, '2026-01-01', '2026-01-31', 'to_verify', 7500.00, 2200.00, 5300.00, '2026-02-03T10:00:00Z', false),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 2, 2026, '2026-02-01', '2026-02-28', 'incomplete', 5900.00, 1800.00, 4100.00, '2026-03-10T10:00:00Z', false),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 3, 2026, '2026-03-01', '2026-03-31', 'in_progress', NULL, NULL, NULL, NULL, false)
ON CONFLICT DO NOTHING;

-- Revenues (sample for recent months)
INSERT INTO revenues (id, agency_id, label, type, source, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by) VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Vente appartement Rue de Rivoli', 'honoraires_transaction', 'Vente', 15000.00, 12500.00, 15000.00, 2500.00, '2026-03-05', '30000000-0000-0000-0000-000000000006', 'validated', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Location T3 Boulevard Haussmann', 'honoraires_location', 'Location', 2400.00, 2000.00, 2400.00, 400.00, '2026-03-08', '30000000-0000-0000-0000-000000000006', 'collected', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Gestion mensuelle portefeuille A', 'honoraires_gestion', 'Gestion', 8500.00, 7083.33, 8500.00, 1416.67, '2026-03-01', '30000000-0000-0000-0000-000000000006', 'validated', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Frais de dossier Dupont', 'frais_dossier', 'Transaction', 500.00, 416.67, 500.00, 83.33, '2026-03-10', '30000000-0000-0000-0000-000000000006', 'draft', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Vente maison Saint-Cloud', 'honoraires_transaction', 'Vente', 22000.00, 18333.33, 22000.00, 3666.67, '2026-03-12', '30000000-0000-0000-0000-000000000006', 'to_verify', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Gestion mensuelle portefeuille B', 'honoraires_gestion', 'Gestion', 6200.00, 5166.67, 6200.00, 1033.33, '2026-02-01', '30000000-0000-0000-0000-000000000005', 'transmitted', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'Location studio Marais', 'honoraires_location', 'Location', 1800.00, 1500.00, 1800.00, 300.00, '2026-02-15', '30000000-0000-0000-0000-000000000005', 'collected', 'fa91db44-0450-4b34-80be-4d22ab4a3a63')
ON CONFLICT DO NOTHING;

-- Expenses (sample for recent months)
INSERT INTO expenses (id, agency_id, date, supplier, amount_ttc, amount_ht, vat_amount, category, payment_method, status, period_id, created_by) VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2026-03-02', 'TotalEnergies', 85.40, 71.17, 14.23, 'carburant', 'card', 'validated', '30000000-0000-0000-0000-000000000006', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '2026-03-03', 'Restaurant Le Petit Zinc', 62.50, 52.08, 10.42, 'repas', 'card', 'to_verify', '30000000-0000-0000-0000-000000000006', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '2026-03-04', 'SeLoger.com', 450.00, 375.00, 75.00, 'publicite_marketing', 'transfer', 'validated', '30000000-0000-0000-0000-000000000006', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '2026-03-06', 'Orange Pro', 89.99, 74.99, 15.00, 'telephonie_internet', 'direct_debit', 'validated', '30000000-0000-0000-0000-000000000006', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '2026-03-07', 'Leroy Merlin', 156.80, 130.67, 26.13, 'entretien_reparations', 'card', 'draft', '30000000-0000-0000-0000-000000000006', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('50000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '2026-03-10', 'SNCF', 124.00, 124.00, 0.00, 'deplacements', 'card', 'to_verify', '30000000-0000-0000-0000-000000000006', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('50000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '2026-03-11', 'Bureau Vallée', 45.90, 38.25, 7.65, 'fournitures', 'card', 'validated', '30000000-0000-0000-0000-000000000006', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('50000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '2026-02-05', 'Banque Populaire', 35.00, 35.00, 0.00, 'frais_bancaires', 'direct_debit', 'transmitted', '30000000-0000-0000-0000-000000000005', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('50000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', '2026-02-12', 'Norauto', 220.00, 183.33, 36.67, 'deplacements', 'card', 'transmitted', '30000000-0000-0000-0000-000000000005', 'fa91db44-0450-4b34-80be-4d22ab4a3a63')
ON CONFLICT DO NOTHING;

-- Receipt documents (some linked to expenses, some orphan)
INSERT INTO receipt_documents (id, agency_id, related_type, related_id, file_name, file_path, file_type, source, ocr_date, ocr_supplier, ocr_amount, ocr_vat, ocr_confidence, status, anomalies, created_by) VALUES
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'expense', '50000000-0000-0000-0000-000000000001', 'ticket-total-mars.jpg', 'receipts/demo/ticket-total-mars.jpg', 'image/jpeg', 'photo', '2026-03-02', 'TotalEnergies', 85.40, 14.23, 0.92, 'usable', '[]', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'expense', '50000000-0000-0000-0000-000000000003', 'facture-seloger-mars.pdf', 'receipts/demo/facture-seloger-mars.pdf', 'application/pdf', 'upload', '2026-03-04', 'SeLoger.com', 450.00, 75.00, 0.98, 'usable', '[]', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'expense', '50000000-0000-0000-0000-000000000004', 'facture-orange-mars.pdf', 'receipts/demo/facture-orange-mars.pdf', 'application/pdf', 'upload', '2026-03-06', 'Orange Pro', 89.99, 15.00, 0.95, 'usable', '[]', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'expense', '50000000-0000-0000-0000-000000000002', 'ticket-restaurant-mars.jpg', 'receipts/demo/ticket-restaurant-mars.jpg', 'image/jpeg', 'photo', '2026-03-03', NULL, 62.50, NULL, 0.45, 'to_verify', '[{"type": "missing_supplier", "message": "Fournisseur non détecté"}, {"type": "missing_vat", "message": "TVA non exploitable"}]', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('60000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', NULL, NULL, 'ticket-inconnu.jpg', 'receipts/demo/ticket-inconnu.jpg', 'image/jpeg', 'photo', NULL, NULL, NULL, NULL, 0.15, 'unreadable', '[{"type": "unreadable", "message": "Pièce illisible"}]', 'fa91db44-0450-4b34-80be-4d22ab4a3a63'),
  ('60000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', NULL, NULL, 'facture-fournisseur-x.pdf', 'receipts/demo/facture-fournisseur-x.pdf', 'application/pdf', 'upload', '2026-03-09', 'Fournisseur X', 340.00, 56.67, 0.88, 'received', '[]', 'fa91db44-0450-4b34-80be-4d22ab4a3a63')
ON CONFLICT DO NOTHING;

-- Alerts
INSERT INTO alerts (id, agency_id, level, category, message, related_type, related_id, is_read) VALUES
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'critical', 'pre_accounting', '3 dépenses sans justificatif ce mois-ci', 'expense', NULL, false),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'vigilance', 'vat', 'Période de février incomplète — 2 pièces manquantes', 'period', '30000000-0000-0000-0000-000000000005', false),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'info', 'accountant', 'Votre comptable a validé 4 pièces', NULL, NULL, false),
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'vigilance', 'treasury', 'Dépenses supérieures aux encaissements sur février', 'period', '30000000-0000-0000-0000-000000000005', true),
  ('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'info', 'pre_accounting', 'Pièce justificative en attente de rattachement', 'receipt', '60000000-0000-0000-0000-000000000006', false)
ON CONFLICT DO NOTHING;

-- Accountant comments
INSERT INTO accountant_comments (id, agency_id, author_id, related_type, related_id, content, type, is_resolved) VALUES
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '3f103675-50d5-45c0-aa07-3831f5940668', 'expense', '50000000-0000-0000-0000-000000000006', 'Merci de préciser le motif de déplacement pour le billet SNCF.', 'request', false),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '3f103675-50d5-45c0-aa07-3831f5940668', 'period', '30000000-0000-0000-0000-000000000003', 'Période de décembre validée côté cabinet. Prête pour transmission finale.', 'validation', false),
  ('80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '3f103675-50d5-45c0-aa07-3831f5940668', 'receipt', '60000000-0000-0000-0000-000000000004', 'Le ticket restaurant est difficile à exploiter. Pouvez-vous demander un duplicata ?', 'comment', false)
ON CONFLICT DO NOTHING;
