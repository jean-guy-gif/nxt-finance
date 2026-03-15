-- ============================================
-- TEST RLS — Vérification isolation inter-agences
-- ============================================

-- === SETUP : 2e agence + 2e user ===

-- Le profil a été créé automatiquement par le trigger, on met à jour le nom
UPDATE user_profiles SET full_name = 'Test Isolation' WHERE id = 'bcfac865-42d9-4433-8370-63c07214c230';

INSERT INTO agencies (id, name, is_demo, settings) VALUES
  ('10000000-0000-0000-0000-000000000099', 'Agence Rivale', false, '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO agency_members (id, agency_id, user_id, role) VALUES
  ('20000000-0000-0000-0000-000000000099',
   '10000000-0000-0000-0000-000000000099',
   'bcfac865-42d9-4433-8370-63c07214c230',
   'manager')
ON CONFLICT DO NOTHING;

-- Données dans l'agence rivale
INSERT INTO accounting_periods (id, agency_id, month, year, start_date, end_date, status) VALUES
  ('30000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000099', 3, 2026, '2026-03-01', '2026-03-31', 'in_progress')
ON CONFLICT DO NOTHING;

INSERT INTO revenues (id, agency_id, label, type, amount, date, status, created_by) VALUES
  ('40000000-0000-0000-0000-000000000099',
   '10000000-0000-0000-0000-000000000099',
   'RIVALE - Cette recette ne doit PAS être visible par le user démo',
   'commission', 99999.00, '2026-03-01', 'validated',
   'bcfac865-42d9-4433-8370-63c07214c230')
ON CONFLICT DO NOTHING;

INSERT INTO expenses (id, agency_id, date, supplier, amount_ttc, category, status, created_by) VALUES
  ('50000000-0000-0000-0000-000000000099',
   '10000000-0000-0000-0000-000000000099',
   '2026-03-01', 'Fournisseur RIVAL', 8888.00, 'autres_charges', 'validated',
   'bcfac865-42d9-4433-8370-63c07214c230')
ON CONFLICT DO NOTHING;

INSERT INTO alerts (id, agency_id, level, category, message) VALUES
  ('70000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000099', 'critical', 'treasury', 'RIVALE - Alerte qui ne doit PAS être visible par le user démo')
ON CONFLICT DO NOTHING;
