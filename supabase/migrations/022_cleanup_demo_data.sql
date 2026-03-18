-- ============================================
-- NXT Finance V3.5 — Nettoyage données démo parasites
-- ============================================
-- Supprime TOUTES les recettes 2026 (seed + manuelles) et réinsère
-- un jeu propre avec des labels variés et réalistes.
-- CA cible Q1 2026 : ~175 000€ (795k × (0.065+0.070+0.085) = ~175k)
-- Idempotent : supprime puis recrée.
-- ============================================

DO $$
DECLARE
  v_agency UUID := '10000000-0000-0000-0000-000000000001';
  v_user UUID := 'fa91db44-0450-4b34-80be-4d22ab4a3a63';
  v_pid_jan UUID;
  v_pid_feb UUID;
  v_pid_mar UUID;
  v_rid UUID;
  -- Collaborators for commission splits
  v_c2 UUID; -- Jean Martin (agent_commercial, 45%)
  v_c3 UUID; -- Sophie Durand (independant, 50%)
  v_c5 UUID; -- Lucas Bernard (agent_commercial, 40%)
BEGIN

  -- Lookup collaborators
  SELECT id INTO v_c2 FROM collaborators WHERE agency_id = v_agency AND full_name = 'Jean Martin' LIMIT 1;
  SELECT id INTO v_c3 FROM collaborators WHERE agency_id = v_agency AND full_name = 'Sophie Durand' LIMIT 1;
  SELECT id INTO v_c5 FROM collaborators WHERE agency_id = v_agency AND full_name = 'Lucas Bernard' LIMIT 1;

  -- Lookup periods
  SELECT id INTO v_pid_jan FROM accounting_periods WHERE agency_id = v_agency AND month = 1 AND year = 2026;
  SELECT id INTO v_pid_feb FROM accounting_periods WHERE agency_id = v_agency AND month = 2 AND year = 2026;
  SELECT id INTO v_pid_mar FROM accounting_periods WHERE agency_id = v_agency AND month = 3 AND year = 2026;

  -- =============================================
  -- ÉTAPE 1 : Supprimer TOUT en 2026 pour l'agence démo
  -- =============================================

  -- Commission splits liés aux recettes 2026
  DELETE FROM commission_splits
  WHERE revenue_id IN (
    SELECT id FROM revenues
    WHERE agency_id = v_agency AND date >= '2026-01-01' AND date < '2027-01-01'
  );

  -- Recettes 2026
  DELETE FROM revenues
  WHERE agency_id = v_agency AND date >= '2026-01-01' AND date < '2027-01-01';

  -- Dépenses parasites 2026 (garder les charges fixes du seed + dépenses marketing)
  DELETE FROM expenses
  WHERE agency_id = v_agency
    AND date >= '2026-01-01' AND date < '2027-01-01'
    AND supplier NOT IN (
      'SCI Centre Immo', 'AXA Entreprise', 'Orange Pro', 'Divers SaaS', 'Banque Populaire',
      'SeLoger', 'LeBonCoin', 'Bien''ici', 'OVH / Agence web', 'Imprimerie locale'
    );

  -- =============================================
  -- ÉTAPE 2 : Janvier 2026 — CA cible ~51 675€
  -- (795k × 0.065 = 51 675)
  -- =============================================

  -- R1: Vente T4 duplex Bd Gambetta — Jean Martin 45%
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Vente T4 duplex Bd Gambetta', 'honoraires_transaction',
    18087, 18087, 21704.40, 3617.40, '2026-01-08'::date, v_pid_jan, 'collected', v_user)
  RETURNING id INTO v_rid;
  IF v_c2 IS NOT NULL THEN
    INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status, paid_at)
    VALUES (v_rid, v_c2, 18087, 5, 904.35, 50, 8591.33, 45, 8591.32, 'reversement', 'paid', '2026-01-28'::date);
  END IF;

  -- R2: Vente pavillon Quartier des Chartreux — Sophie Durand 50%
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Vente pavillon Quartier des Chartreux', 'honoraires_transaction',
    12919, 12919, 15502.80, 2583.80, '2026-01-14'::date, v_pid_jan, 'collected', v_user)
  RETURNING id INTO v_rid;
  IF v_c3 IS NOT NULL THEN
    INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status, paid_at)
    VALUES (v_rid, v_c3, 12919, 5, 645.95, 45, 5522.87, 50, 6750.18, 'reversement', 'paid', '2026-01-28'::date);
  END IF;

  -- R3: Vente studio investisseur Rue Sainte — Lucas Bernard 40%
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Vente studio investisseur Rue Sainte', 'honoraires_transaction',
    7751, 7751, 9301.20, 1550.20, '2026-01-18'::date, v_pid_jan, 'validated', v_user)
  RETURNING id INTO v_rid;
  IF v_c5 IS NOT NULL THEN
    INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status)
    VALUES (v_rid, v_c5, 7751, 5, 387.55, 55, 4049.90, 40, 3313.55, 'reversement', 'pending');
  END IF;

  -- R4: Honoraires gestion locative portefeuille janvier
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Honoraires gestion locative portefeuille janvier', 'honoraires_gestion',
    6201, 6201, 7441.20, 1240.20, '2026-01-05'::date, v_pid_jan, 'collected', v_user);

  -- R5: Location T2 meublé Cours Julien
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Location T2 meublé Cours Julien', 'honoraires_location',
    4134, 4134, 4960.80, 826.80, '2026-01-15'::date, v_pid_jan, 'validated', v_user);

  -- R6: Frais de dossier vente Dupont/Martin
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Frais de dossier vente Dupont/Martin', 'frais_dossier',
    2583, 2583, 3099.60, 516.60, '2026-01-22'::date, v_pid_jan, 'validated', v_user);
  -- Janvier total : 18087+12919+7751+6201+4134+2583 = 51 675€ ✓

  -- =============================================
  -- ÉTAPE 3 : Février 2026 — CA cible ~55 650€
  -- (795k × 0.070 = 55 650)
  -- =============================================

  -- R1: Vente maison de ville La Ciotat — Jean Martin 45%
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Vente maison de ville La Ciotat', 'honoraires_transaction',
    19478, 19478, 23373.60, 3895.60, '2026-02-06'::date, v_pid_feb, 'collected', v_user)
  RETURNING id INTO v_rid;
  IF v_c2 IS NOT NULL THEN
    INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status, paid_at)
    VALUES (v_rid, v_c2, 19478, 5, 973.90, 50, 9252.05, 45, 9252.05, 'reversement', 'paid', '2026-02-28'::date);
  END IF;

  -- R2: Vente T2 rénové Quartier Joliette — Sophie Durand 50%
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Vente T2 rénové Quartier Joliette', 'honoraires_transaction',
    13913, 13913, 16695.60, 2782.60, '2026-02-12'::date, v_pid_feb, 'collected', v_user)
  RETURNING id INTO v_rid;
  IF v_c3 IS NOT NULL THEN
    INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status, paid_at)
    VALUES (v_rid, v_c3, 13913, 5, 695.65, 45, 5947.81, 50, 7269.54, 'reversement', 'paid', '2026-02-28'::date);
  END IF;

  -- R3: Vente studio Rue Paradis — Lucas Bernard 40%
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Vente studio Rue Paradis', 'honoraires_transaction',
    8348, 8348, 10017.60, 1669.60, '2026-02-17'::date, v_pid_feb, 'validated', v_user)
  RETURNING id INTO v_rid;
  IF v_c5 IS NOT NULL THEN
    INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status)
    VALUES (v_rid, v_c5, 8348, 5, 417.40, 55, 4361.83, 40, 3568.77, 'reversement', 'pending');
  END IF;

  -- R4: Honoraires gestion locative portefeuille février
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Honoraires gestion locative portefeuille février', 'honoraires_gestion',
    6678, 6678, 8013.60, 1335.60, '2026-02-05'::date, v_pid_feb, 'collected', v_user);

  -- R5: Location studio meublé Cours Mirabeau
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Location studio meublé Cours Mirabeau', 'honoraires_location',
    4452, 4452, 5342.40, 890.40, '2026-02-15'::date, v_pid_feb, 'validated', v_user);

  -- R6: Frais de dossier transactions février
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Frais de dossier transactions février', 'frais_dossier',
    2781, 2781, 3337.20, 556.20, '2026-02-20'::date, v_pid_feb, 'validated', v_user);
  -- Février total : 19478+13913+8348+6678+4452+2781 = 55 650€ ✓

  -- =============================================
  -- ÉTAPE 4 : Mars 2026 — CA cible ~67 575€
  -- (795k × 0.085 = 67 575)
  -- =============================================

  -- R1: Vente villa Les Calanques — Jean Martin 45%
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Vente villa avec vue Les Calanques', 'honoraires_transaction',
    23651, 23651, 28381.20, 4730.20, '2026-03-04'::date, v_pid_mar, 'collected', v_user)
  RETURNING id INTO v_rid;
  IF v_c2 IS NOT NULL THEN
    INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status, paid_at)
    VALUES (v_rid, v_c2, 23651, 5, 1182.55, 50, 11234.23, 45, 11234.22, 'reversement', 'paid', '2026-03-28'::date);
  END IF;

  -- R2: Vente T3 lumineux Bd Longchamp — Sophie Durand 50%
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Vente T3 lumineux Bd Longchamp', 'honoraires_transaction',
    16894, 16894, 20272.80, 3378.80, '2026-03-10'::date, v_pid_mar, 'collected', v_user)
  RETURNING id INTO v_rid;
  IF v_c3 IS NOT NULL THEN
    INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status)
    VALUES (v_rid, v_c3, 16894, 5, 844.70, 45, 7222.18, 50, 8827.12, 'reversement', 'pending');
  END IF;

  -- R3: Vente appartement neuf Euroméditerranée — Lucas Bernard 40%
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Vente appartement neuf Euroméditerranée', 'honoraires_transaction',
    10136, 10136, 12163.20, 2027.20, '2026-03-17'::date, v_pid_mar, 'validated', v_user)
  RETURNING id INTO v_rid;
  IF v_c5 IS NOT NULL THEN
    INSERT INTO commission_splits (revenue_id, collaborator_id, gross_amount, network_rate, network_amount, agency_rate, agency_amount, collaborator_rate, collaborator_amount, compensation_type, payout_status)
    VALUES (v_rid, v_c5, 10136, 5, 506.80, 55, 5296.06, 40, 4333.14, 'reversement', 'pending');
  END IF;

  -- R4: Honoraires gestion locative portefeuille mars
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Honoraires gestion locative portefeuille mars', 'honoraires_gestion',
    8109, 8109, 9730.80, 1621.80, '2026-03-05'::date, v_pid_mar, 'collected', v_user);

  -- R5: Location T3 meublé Prado
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Location T3 meublé Prado', 'honoraires_location',
    5406, 5406, 6487.20, 1081.20, '2026-03-15'::date, v_pid_mar, 'validated', v_user);

  -- R6: Frais de dossier transactions mars
  INSERT INTO revenues (agency_id, label, type, amount, amount_ht, amount_ttc, vat_amount, date, period_id, status, created_by)
  VALUES (v_agency, 'Frais de dossier transactions mars', 'frais_dossier',
    3379, 3379, 4054.80, 675.80, '2026-03-22'::date, v_pid_mar, 'validated', v_user);
  -- Mars total : 23651+16894+10136+8109+5406+3379 = 67 575€ ✓

  -- =============================================
  -- ÉTAPE 5 : Corriger les recettes sans amount_ht (toutes années)
  -- =============================================
  UPDATE revenues
  SET amount_ht = amount,
      amount_ttc = ROUND(amount * 1.20, 2),
      vat_amount = ROUND(amount * 0.20, 2)
  WHERE agency_id = v_agency
    AND amount_ht IS NULL
    AND amount IS NOT NULL;

END $$;
