-- ============================================
-- NXT Finance V3 — Seed démo cohérent
-- ============================================
-- CA cibles : 560K (2024), 638K (2025), 175K (2026 Q1)
-- 5 collaborateurs, charges réalistes, commissions cohérentes
-- ============================================

DO $$
DECLARE
  v_agency UUID := '10000000-0000-0000-0000-000000000001';
  v_user UUID;
  v_c1 UUID; -- Marie Dupont (salariée senior)
  v_c2 UUID; -- Jean Martin (VRP 45%)
  v_c3 UUID; -- Sophie Durand (indépendante 50%)
  v_c4 UUID; -- Pierre Petit (salarié junior)
  v_c5 UUID; -- Lucas Bernard (VRP 40%)
  v_pid UUID; -- period id
  v_rid UUID; -- revenue id
  v_y INT;
  v_m INT;
  v_dt TEXT;
  v_annual DECIMAL;
  v_season DECIMAL;
  v_target DECIMAL; -- monthly CA target
  v_amt DECIMAL;
  v_net DECIMAL;
  v_col DECIMAL;
  v_ag DECIMAL;
  v_exp DECIMAL;
BEGIN
  SELECT id INTO v_user FROM user_profiles LIMIT 1;

  -- ============================================
  -- NETTOYAGE COMPLET (ordre FK respecté)
  -- ============================================
  -- 1. Business plans (dépend de financial_analyses)
  DELETE FROM bp_narratives WHERE business_plan_id IN (SELECT id FROM business_plans WHERE agency_id = v_agency);
  DELETE FROM bp_projections WHERE business_plan_id IN (SELECT id FROM business_plans WHERE agency_id = v_agency);
  DELETE FROM bp_hypotheses WHERE business_plan_id IN (SELECT id FROM business_plans WHERE agency_id = v_agency);
  DELETE FROM business_plans WHERE agency_id = v_agency;
  -- 2. Financial analyses (maintenant libérées des FK business_plans)
  DELETE FROM financial_insights WHERE analysis_id IN (SELECT id FROM financial_analyses WHERE agency_id = v_agency);
  DELETE FROM financial_ratios WHERE analysis_id IN (SELECT id FROM financial_analyses WHERE agency_id = v_agency);
  DELETE FROM financial_analyses WHERE agency_id = v_agency;
  -- 3. Balance sheets
  DELETE FROM balance_sheet_checks WHERE balance_sheet_id IN (SELECT id FROM balance_sheets WHERE agency_id = v_agency);
  DELETE FROM balance_sheet_items WHERE balance_sheet_id IN (SELECT id FROM balance_sheets WHERE agency_id = v_agency);
  DELETE FROM balance_sheets WHERE agency_id = v_agency;
  -- 4. Commissions (dépend de revenues + collaborators)
  DELETE FROM commission_splits WHERE revenue_id IN (SELECT id FROM revenues WHERE agency_id = v_agency);
  -- 5. Revenues (dépend de accounting_periods)
  DELETE FROM revenues WHERE agency_id = v_agency;
  -- 6. Expenses (dépend de accounting_periods)
  DELETE FROM expenses WHERE agency_id = v_agency;
  -- 7. Alertes, jobs, LLM
  DELETE FROM alerts WHERE agency_id = v_agency;
  DELETE FROM processing_jobs WHERE agency_id = v_agency;
  DELETE FROM llm_generations WHERE agency_id = v_agency;
  -- 8. Profitability
  DELETE FROM profitability_snapshots WHERE agency_id = v_agency;
  -- 9. Collaborateurs
  DELETE FROM collaborators WHERE agency_id = v_agency;
  -- 10. Périodes (plus rien ne les référence)
  DELETE FROM accounting_periods WHERE agency_id = v_agency;

  -- ============================================
  -- COLLABORATEURS
  -- ============================================
  INSERT INTO collaborators (id, agency_id, full_name, email, phone, type, status, default_split_rate, salary_net_monthly, salary_gross_monthly, employer_total_cost_monthly)
  VALUES (uuid_generate_v4(), v_agency, 'Marie Dupont', 'marie.dupont@agence-immo.fr', '06 12 34 56 78', 'salarie', 'active', 0, 2800, 3500, 4800)
  RETURNING id INTO v_c1;

  INSERT INTO collaborators (id, agency_id, full_name, email, phone, type, status, default_split_rate)
  VALUES (uuid_generate_v4(), v_agency, 'Jean Martin', 'jean.martin@agence-immo.fr', '06 23 45 67 89', 'agent_commercial', 'active', 45)
  RETURNING id INTO v_c2;

  INSERT INTO collaborators (id, agency_id, full_name, email, phone, type, status, default_split_rate)
  VALUES (uuid_generate_v4(), v_agency, 'Sophie Durand', 'sophie.durand@immo-indep.fr', '06 34 56 78 90', 'independant', 'active', 50)
  RETURNING id INTO v_c3;

  INSERT INTO collaborators (id, agency_id, full_name, email, phone, type, status, default_split_rate, salary_net_monthly, salary_gross_monthly, employer_total_cost_monthly)
  VALUES (uuid_generate_v4(), v_agency, 'Pierre Petit', 'pierre.petit@agence-immo.fr', '06 45 67 89 01', 'salarie', 'active', 0, 2200, 2800, 3900)
  RETURNING id INTO v_c4;

  INSERT INTO collaborators (id, agency_id, full_name, email, phone, type, status, default_split_rate)
  VALUES (uuid_generate_v4(), v_agency, 'Lucas Bernard', 'lucas.bernard@agence-immo.fr', '06 56 78 90 12', 'agent_commercial', 'active', 40)
  RETURNING id INTO v_c5;

  -- ============================================
  -- BOUCLE 2024-2026
  -- ============================================
  FOR v_y IN 2024..2026 LOOP
    FOR v_m IN 1..12 LOOP

      IF v_y = 2026 AND v_m > 3 THEN EXIT; END IF;

      -- CA annuel cible
      v_annual := CASE v_y WHEN 2024 THEN 560000 WHEN 2025 THEN 638000 WHEN 2026 THEN 795000 END;

      -- Saisonnalité (total = 1.000)
      v_season := CASE v_m
        WHEN 1 THEN 0.065 WHEN 2 THEN 0.070 WHEN 3 THEN 0.085
        WHEN 4 THEN 0.100 WHEN 5 THEN 0.110 WHEN 6 THEN 0.120
        WHEN 7 THEN 0.105 WHEN 8 THEN 0.070 WHEN 9 THEN 0.105
        WHEN 10 THEN 0.095 WHEN 11 THEN 0.045 WHEN 12 THEN 0.030
      END;

      v_target := ROUND(v_annual * v_season, 2);
      v_dt := v_y || '-' || lpad(v_m::text, 2, '0');

      -- Période
      INSERT INTO accounting_periods (id, agency_id, month, year, start_date, end_date, status)
      VALUES (uuid_generate_v4(), v_agency, v_m, v_y, (v_dt||'-01')::date, ((v_dt||'-01')::date + interval '1 month' - interval '1 day')::date, 'in_progress')
      ON CONFLICT (agency_id, month, year) DO NOTHING;
      SELECT id INTO v_pid FROM accounting_periods WHERE agency_id = v_agency AND month = v_m AND year = v_y;

      -- ==========================================
      -- RECETTES
      -- ==========================================

      -- R1: Transaction principale (35% CA) → Jean Martin VRP 45%
      v_amt := ROUND(v_target * 0.35, 2);
      INSERT INTO revenues (id, agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
      VALUES (uuid_generate_v4(), v_agency, 'Vente appartement T3 centre-ville', 'honoraires_transaction',
        v_amt, v_amt, ROUND(v_amt*1.2,2), ROUND(v_amt*0.2,2),
        (v_dt || '-' || lpad((4 + v_m % 5)::text, 2, '0'))::date, v_pid, 'collected', v_user)
      RETURNING id INTO v_rid;
      -- Commission Jean Martin
      v_net := ROUND(v_amt * 0.05, 2);
      v_col := ROUND((v_amt - v_net) * 0.45, 2);
      v_ag := v_amt - v_net - v_col;
      INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status, paid_at)
      VALUES (v_rid, v_c2, v_amt, 5, v_net, ROUND(v_ag/(v_amt-v_net)*100,2), v_ag, 45, v_col, 'reversement', 'paid', (v_dt||'-28')::date);

      -- R2: Transaction moyenne (25% CA) → Sophie Durand indep 50%
      v_amt := ROUND(v_target * 0.25, 2);
      INSERT INTO revenues (id, agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
      VALUES (uuid_generate_v4(), v_agency, 'Vente maison avec jardin', 'honoraires_transaction',
        v_amt, v_amt, ROUND(v_amt*1.2,2), ROUND(v_amt*0.2,2),
        (v_dt || '-' || lpad((10 + v_m % 7)::text, 2, '0'))::date, v_pid, 'validated', v_user)
      RETURNING id INTO v_rid;
      v_net := ROUND(v_amt * 0.05, 2);
      v_col := ROUND((v_amt - v_net) * 0.50, 2);
      v_ag := v_amt - v_net - v_col;
      INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status, paid_at)
      VALUES (v_rid, v_c3, v_amt, 5, v_net, ROUND(v_ag/(v_amt-v_net)*100,2), v_ag, 50, v_col, 'reversement', 'paid', (v_dt||'-28')::date);

      -- R3: Transaction petite (15% CA) → Lucas Bernard VRP 40%
      v_amt := ROUND(v_target * 0.15, 2);
      INSERT INTO revenues (id, agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
      VALUES (uuid_generate_v4(), v_agency, 'Vente studio investisseur', 'honoraires_transaction',
        v_amt, v_amt, ROUND(v_amt*1.2,2), ROUND(v_amt*0.2,2),
        (v_dt || '-' || lpad((16 + v_m % 6)::text, 2, '0'))::date, v_pid, 'validated', v_user)
      RETURNING id INTO v_rid;
      v_net := ROUND(v_amt * 0.05, 2);
      v_col := ROUND((v_amt - v_net) * 0.40, 2);
      v_ag := v_amt - v_net - v_col;
      INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status, paid_at)
      VALUES (v_rid, v_c5, v_amt, 5, v_net, ROUND(v_ag/(v_amt-v_net)*100,2), v_ag, 40, v_col, 'reversement', 'paid', (v_dt||'-28')::date);

      -- R4: Gestion locative (12% CA) — pas de commission, géré par Marie Dupont (salariée)
      v_amt := ROUND(v_target * 0.12, 2);
      INSERT INTO revenues (id, agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
      VALUES (uuid_generate_v4(), v_agency, 'Honoraires gestion locative portefeuille', 'honoraires_gestion',
        v_amt, v_amt, ROUND(v_amt*1.2,2), ROUND(v_amt*0.2,2),
        (v_dt || '-05')::date, v_pid, 'validated', v_user);

      -- R5: Location (8% CA)
      v_amt := ROUND(v_target * 0.08, 2);
      INSERT INTO revenues (id, agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
      VALUES (uuid_generate_v4(), v_agency, 'Honoraires mise en location', 'honoraires_location',
        v_amt, v_amt, ROUND(v_amt*1.2,2), ROUND(v_amt*0.2,2),
        (v_dt || '-15')::date, v_pid, 'validated', v_user);

      -- R6: Frais de dossier (5% CA)
      v_amt := ROUND(v_target * 0.05, 2);
      INSERT INTO revenues (id, agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
      VALUES (uuid_generate_v4(), v_agency, 'Frais de dossier transactions', 'frais_dossier',
        v_amt, v_amt, ROUND(v_amt*1.2,2), ROUND(v_amt*0.2,2),
        (v_dt || '-20')::date, v_pid, 'validated', v_user);

      -- ==========================================
      -- DÉPENSES
      -- ==========================================

      -- Charges fixes mensuelles
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES
        (v_agency, (v_dt||'-01')::date, 'SCI Centre Immo', 'Loyer bureau + charges locatives', 2400, 2000, 400, 'loyer_charges', 'transfer', v_pid, 'validated', v_user),
        (v_agency, (v_dt||'-05')::date, 'AXA Entreprise', 'RC Pro + multirisque bureau', 420, 350, 70, 'assurances', 'direct_debit', v_pid, 'validated', v_user),
        (v_agency, (v_dt||'-10')::date, 'Orange Pro', '5 lignes mobiles + fibre agence', 480, 400, 80, 'telephonie_internet', 'direct_debit', v_pid, 'validated', v_user),
        (v_agency, (v_dt||'-15')::date, 'Divers SaaS', 'CRM Apimo + SeLoger + LeBonCoin Pro + Pennylane', 850, 708.33, 141.67, 'logiciels_abonnements', 'card', v_pid, 'validated', v_user),
        (v_agency, (v_dt||'-28')::date, 'Banque Populaire', 'Frais tenue de compte pro', 95, 95, 0, 'frais_bancaires', 'direct_debit', v_pid, 'validated', v_user);

      -- Charges variables
      -- Marketing (proportionnel à la saison)
      v_exp := ROUND(1400 * (v_season / 0.085), 2);
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES (v_agency, (v_dt||'-12')::date, 'Meta + Google Ads', 'Publicité digitale + print local', v_exp, ROUND(v_exp/1.2,2), ROUND(v_exp-v_exp/1.2,2), 'publicite_marketing', 'card', v_pid, 'validated', v_user);

      -- Carburant
      v_exp := ROUND(450 + (v_season / 0.085 - 1) * 150, 2);
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES (v_agency, (v_dt||'-18')::date, 'TotalEnergies', 'Carburant visites clients', v_exp, ROUND(v_exp/1.2,2), ROUND(v_exp-v_exp/1.2,2), 'carburant', 'card', v_pid, 'validated', v_user);

      -- Repas pro
      v_exp := ROUND(350 + (v_season / 0.085 - 1) * 200, 2);
      INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
      VALUES (v_agency, (v_dt||'-22')::date, 'Restaurants divers', 'Déjeuners clients et équipe', v_exp, ROUND(v_exp/1.1,2), ROUND(v_exp-v_exp/1.1,2), 'repas', 'card', v_pid, 'validated', v_user);

      -- Honoraires comptable (trimestriel)
      IF v_m IN (3, 6, 9, 12) THEN
        INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
        VALUES (v_agency, (v_dt||'-25')::date, 'Cabinet Duval & Associés', 'Mission trimestrielle comptabilité + social', 1800, 1500, 300, 'honoraires', 'transfer', v_pid, 'validated', v_user);
      END IF;

      -- Fournitures (bimestriel)
      IF v_m % 2 = 0 THEN
        INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
        VALUES (v_agency, (v_dt||'-20')::date, 'Bureau Vallée', 'Papeterie + cartouches + affiches vitrine', 320, 266.67, 53.33, 'fournitures', 'card', v_pid, 'validated', v_user);
      END IF;

      -- Déplacements exceptionnels (certains mois)
      IF v_m IN (3, 5, 9, 11) THEN
        INSERT INTO expenses (agency_id, date, supplier, comment, amount_ttc, amount_ht, vat_amount, category, payment_method, period_id, status, created_by)
        VALUES (v_agency, (v_dt||'-14')::date, 'SNCF / Parking', 'Déplacements salon immobilier + formations', 380, 316.67, 63.33, 'deplacements', 'card', v_pid, 'validated', v_user);
      END IF;

    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Seed démo V3 complet';
  RAISE NOTICE '  2024 : 560 000 € CA cible';
  RAISE NOTICE '  2025 : 638 000 € CA cible (+14%%)';
  RAISE NOTICE '  2026 Q1 : ~175 000 € CA cible';
  RAISE NOTICE '  5 collaborateurs, charges réalistes, commissions cohérentes';

END $$;
