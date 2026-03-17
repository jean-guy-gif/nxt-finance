-- ============================================
-- NXT Finance V3 — Données de démonstration
-- ============================================
-- Agence immobilière réaliste : 24 mois de données (2024-2025)
-- 5 collaborateurs, recettes variées, dépenses mensuelles, commissions
-- À exécuter APRÈS avoir une agence + user existants
-- ============================================

-- IMPORTANT: Remplacez ces valeurs par les vrais IDs de votre agence et user
-- Exécutez d'abord: SELECT id FROM agencies LIMIT 1;
-- Et: SELECT id FROM user_profiles LIMIT 1;

DO $$
DECLARE
  v_agency_id UUID;
  v_user_id UUID;
  v_collab_1 UUID;
  v_collab_2 UUID;
  v_collab_3 UUID;
  v_collab_4 UUID;
  v_collab_5 UUID;
  v_period_id UUID;
  v_revenue_id UUID;
  v_month INTEGER;
  v_year INTEGER;
  v_date TEXT;
  v_amount DECIMAL;
  v_base_amount DECIMAL;
  v_seasonality DECIMAL;
  v_random_factor DECIMAL;
  v_network DECIMAL;
  v_collab_amt DECIMAL;
  v_agency_amt DECIMAL;
BEGIN

  -- Récupérer la première agence et le premier user
  SELECT id INTO v_agency_id FROM agencies LIMIT 1;
  SELECT id INTO v_user_id FROM user_profiles LIMIT 1;

  IF v_agency_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucune agence ou utilisateur trouvé. Créez-en d''abord.';
  END IF;

  -- ============================================
  -- 1. COLLABORATEURS (5)
  -- ============================================

  INSERT INTO collaborators (id, agency_id, full_name, email, phone, type, status, default_split_rate, salary_net_monthly, salary_gross_monthly, employer_total_cost_monthly)
  VALUES
    (uuid_generate_v4(), v_agency_id, 'Marie Dupont', 'marie.dupont@agence.fr', '06 12 34 56 78', 'salarie', 'active', 0, 2800, 3500, 4800)
  RETURNING id INTO v_collab_1;

  INSERT INTO collaborators (id, agency_id, full_name, email, phone, type, status, default_split_rate)
  VALUES
    (uuid_generate_v4(), v_agency_id, 'Jean Martin', 'jean.martin@agence.fr', '06 23 45 67 89', 'agent_commercial', 'active', 45)
  RETURNING id INTO v_collab_2;

  INSERT INTO collaborators (id, agency_id, full_name, email, phone, type, status, default_split_rate)
  VALUES
    (uuid_generate_v4(), v_agency_id, 'Sophie Durand', 'sophie.durand@agence.fr', '06 34 56 78 90', 'independant', 'active', 50)
  RETURNING id INTO v_collab_3;

  INSERT INTO collaborators (id, agency_id, full_name, email, phone, type, status, default_split_rate, salary_net_monthly, salary_gross_monthly, employer_total_cost_monthly)
  VALUES
    (uuid_generate_v4(), v_agency_id, 'Pierre Petit', 'pierre.petit@agence.fr', '06 45 67 89 01', 'salarie', 'active', 0, 2200, 2800, 3900)
  RETURNING id INTO v_collab_4;

  INSERT INTO collaborators (id, agency_id, full_name, email, phone, type, status, default_split_rate)
  VALUES
    (uuid_generate_v4(), v_agency_id, 'Lucas Bernard', 'lucas.bernard@agence.fr', '06 56 78 90 12', 'agent_commercial', 'active', 40)
  RETURNING id INTO v_collab_5;

  -- ============================================
  -- 2. RECETTES + DÉPENSES (24 mois : 2024 + 2025)
  -- ============================================

  FOR v_year IN 2024..2025 LOOP
    FOR v_month IN 1..12 LOOP

      -- Saisonnalité immobilier (printemps/été fort, hiver faible)
      v_seasonality := CASE v_month
        WHEN 1 THEN 0.65  -- Janvier creux
        WHEN 2 THEN 0.70
        WHEN 3 THEN 0.85  -- Reprise
        WHEN 4 THEN 1.05  -- Printemps
        WHEN 5 THEN 1.15
        WHEN 6 THEN 1.25  -- Pic
        WHEN 7 THEN 1.10
        WHEN 8 THEN 0.75  -- Vacances
        WHEN 9 THEN 1.15  -- Rentrée
        WHEN 10 THEN 1.10
        WHEN 11 THEN 0.90
        WHEN 12 THEN 0.60  -- Décembre creux
      END;

      -- Croissance 2025 vs 2024 : +8%
      IF v_year = 2025 THEN
        v_seasonality := v_seasonality * 1.08;
      END IF;

      v_date := v_year || '-' || lpad(v_month::text, 2, '0');

      -- Créer ou récupérer la période
      INSERT INTO accounting_periods (id, agency_id, month, year, start_date, end_date, status)
      VALUES (
        uuid_generate_v4(), v_agency_id, v_month, v_year,
        (v_date || '-01')::date,
        (v_date || '-01')::date + interval '1 month' - interval '1 day',
        'in_progress'
      )
      ON CONFLICT (agency_id, month, year) DO UPDATE SET status = accounting_periods.status
      RETURNING id INTO v_period_id;

      -- ---- HONORAIRES TRANSACTION (2-4 par mois) ----
      -- Transaction moyenne : 8000-15000€
      v_random_factor := 0.85 + random() * 0.3;
      v_base_amount := 12000 * v_seasonality * v_random_factor;
      INSERT INTO revenues (id, agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
      VALUES (uuid_generate_v4(), v_agency_id,
        'Transaction ' || v_month || '/' || v_year || ' - Appartement',
        'honoraires_transaction', v_base_amount, v_base_amount, v_base_amount * 1.2, v_base_amount * 0.2,
        (v_date || '-' || lpad((5 + floor(random() * 20))::text, 2, '0'))::date,
        v_period_id, 'validated', v_user_id)
      RETURNING id INTO v_revenue_id;

      -- Commission split pour Jean Martin (VRP) — network=5%, collab=45%, agency=remainder
      v_network := ROUND(v_base_amount * 5 / 100, 2);
      v_collab_amt := ROUND((v_base_amount - v_network) * 45 / 100, 2);
      v_agency_amt := v_base_amount - v_network - v_collab_amt;
      INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status, paid_at)
      VALUES (v_revenue_id, v_collab_2, v_base_amount, 5, v_network, ROUND(v_agency_amt / (v_base_amount - v_network) * 100, 2), v_agency_amt, 45, v_collab_amt, 'reversement', 'paid', now());

      -- 2ème transaction
      v_random_factor := 0.85 + random() * 0.3;
      v_base_amount := 9500 * v_seasonality * v_random_factor;
      INSERT INTO revenues (id, agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
      VALUES (uuid_generate_v4(), v_agency_id,
        'Transaction ' || v_month || '/' || v_year || ' - Maison',
        'honoraires_transaction', v_base_amount, v_base_amount, v_base_amount * 1.2, v_base_amount * 0.2,
        (v_date || '-' || lpad((10 + floor(random() * 15))::text, 2, '0'))::date,
        v_period_id, 'collected', v_user_id)
      RETURNING id INTO v_revenue_id;

      -- Commission split pour Sophie Durand (indépendante) — network=5%, collab=50%, agency=remainder
      v_network := ROUND(v_base_amount * 5 / 100, 2);
      v_collab_amt := ROUND((v_base_amount - v_network) * 50 / 100, 2);
      v_agency_amt := v_base_amount - v_network - v_collab_amt;
      INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status, paid_at)
      VALUES (v_revenue_id, v_collab_3, v_base_amount, 5, v_network, ROUND(v_agency_amt / (v_base_amount - v_network) * 100, 2), v_agency_amt, 50, v_collab_amt, 'reversement', 'paid', now());

      -- ---- HONORAIRES GESTION (récurrent) ----
      v_base_amount := 3500 * (0.95 + random() * 0.1);
      IF v_year = 2025 THEN v_base_amount := v_base_amount * 1.05; END IF;
      INSERT INTO revenues (id, agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
      VALUES (uuid_generate_v4(), v_agency_id,
        'Gestion locative ' || v_month || '/' || v_year,
        'honoraires_gestion', v_base_amount, v_base_amount, v_base_amount * 1.2, v_base_amount * 0.2,
        (v_date || '-05')::date,
        v_period_id, 'validated', v_user_id);

      -- ---- HONORAIRES LOCATION (variable) ----
      IF random() > 0.3 THEN  -- 70% chance d'avoir une location
        v_random_factor := 0.8 + random() * 0.4;
        v_base_amount := 2800 * v_seasonality * v_random_factor;
        INSERT INTO revenues (id, agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
        VALUES (uuid_generate_v4(), v_agency_id,
          'Location ' || v_month || '/' || v_year,
          'honoraires_location', v_base_amount, v_base_amount, v_base_amount * 1.2, v_base_amount * 0.2,
          (v_date || '-' || lpad((15 + floor(random() * 10))::text, 2, '0'))::date,
          v_period_id, 'validated', v_user_id)
        RETURNING id INTO v_revenue_id;

        -- Commission Lucas Bernard — network=5%, collab=40%, agency=remainder
        v_network := ROUND(v_base_amount * 5 / 100, 2);
        v_collab_amt := ROUND((v_base_amount - v_network) * 40 / 100, 2);
        v_agency_amt := v_base_amount - v_network - v_collab_amt;
        INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status)
        VALUES (v_revenue_id, v_collab_5, v_base_amount, 5, v_network, ROUND(v_agency_amt / (v_base_amount - v_network) * 100, 2), v_agency_amt, 40, v_collab_amt, 'reversement', 'pending');
      END IF;

      -- ---- FRAIS DOSSIER (1-2 par mois) ----
      v_base_amount := 350 + floor(random() * 200);
      INSERT INTO revenues (id, agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
      VALUES (uuid_generate_v4(), v_agency_id,
        'Frais de dossier ' || v_month || '/' || v_year,
        'frais_dossier', v_base_amount, v_base_amount, v_base_amount * 1.2, v_base_amount * 0.2,
        (v_date || '-20')::date,
        v_period_id, 'validated', v_user_id);

      -- ============================================
      -- DÉPENSES MENSUELLES
      -- ============================================

      -- Loyer + charges (fixe)
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES (v_agency_id, (v_date || '-01')::date, 'SCI Immobilier Centre', 'Loyer bureau ' || v_month || '/' || v_year,
        2400, 2000, 400, 'loyer_charges', 'transfer', v_period_id, 'validated', v_user_id);

      -- Assurances (fixe)
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES (v_agency_id, (v_date || '-05')::date, 'AXA Pro', 'Assurance RC Pro ' || v_month || '/' || v_year,
        380, 316.67, 63.33, 'assurances', 'direct_debit', v_period_id, 'validated', v_user_id);

      -- Téléphonie/Internet (fixe)
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES (v_agency_id, (v_date || '-10')::date, 'Orange Pro', 'Forfaits téléphone + internet ' || v_month || '/' || v_year,
        450, 375, 75, 'telephonie_internet', 'direct_debit', v_period_id, 'validated', v_user_id);

      -- Logiciels/Abonnements (fixe)
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES (v_agency_id, (v_date || '-15')::date, 'Divers SaaS', 'Abonnements logiciels ' || v_month || '/' || v_year,
        650, 541.67, 108.33, 'logiciels_abonnements', 'card', v_period_id, 'validated', v_user_id);

      -- Publicité/Marketing (variable, saisonnier)
      v_base_amount := 800 * v_seasonality * (0.8 + random() * 0.4);
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES (v_agency_id, (v_date || '-12')::date, 'Divers marketing', 'Publicité ' || v_month || '/' || v_year,
        v_base_amount, v_base_amount / 1.2, v_base_amount - v_base_amount / 1.2, 'publicite_marketing', 'card', v_period_id, 'validated', v_user_id);

      -- Carburant (variable)
      v_base_amount := 350 + floor(random() * 200);
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES (v_agency_id, (v_date || '-18')::date, 'Stations-service', 'Carburant ' || v_month || '/' || v_year,
        v_base_amount, v_base_amount / 1.2, v_base_amount - v_base_amount / 1.2, 'carburant', 'card', v_period_id, 'validated', v_user_id);

      -- Frais bancaires (fixe)
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES (v_agency_id, (v_date || '-28')::date, 'Banque Populaire', 'Frais bancaires ' || v_month || '/' || v_year,
        85, 85, 0, 'frais_bancaires', 'direct_debit', v_period_id, 'validated', v_user_id);

      -- Repas/déplacements (variable)
      v_base_amount := 200 + floor(random() * 300);
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES (v_agency_id, (v_date || '-22')::date, 'Divers', 'Repas professionnels ' || v_month || '/' || v_year,
        v_base_amount, v_base_amount / 1.1, v_base_amount - v_base_amount / 1.1, 'repas', 'card', v_period_id, 'validated', v_user_id);

    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Données de démonstration V3 créées avec succès';
  RAISE NOTICE '  - 5 collaborateurs (2 salariés, 2 VRP, 1 indépendant)';
  RAISE NOTICE '  - 24 mois de recettes (2024-2025) avec saisonnalité';
  RAISE NOTICE '  - 24 mois de dépenses mensuelles';
  RAISE NOTICE '  - Commissions et reversements';
  RAISE NOTICE '  - Croissance 2025 vs 2024 : +8%%';

END $$;
