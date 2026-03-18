-- ============================================
-- NXT Finance V3.5 — Seed dépenses marketing par canal + KPIs canal manquants
-- ============================================
-- Ajoute des dépenses marketing 2024-2025 avec acquisition_channel renseigné
-- + complète les commercial_kpis par canal pour 2024 et canaux manquants 2025
-- ============================================

DO $$
DECLARE
  v_agency UUID := '10000000-0000-0000-0000-000000000001';
  v_user UUID := 'fa91db44-0450-4b34-80be-4d22ab4a3a63';
  v_season DECIMAL[] := ARRAY[0.70, 0.75, 0.95, 1.10, 1.20, 1.30, 1.25, 1.15, 1.10, 1.00, 0.80, 0.70];
  v_month_names TEXT[] := ARRAY['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  m INTEGER;
  v_date TEXT;
  v_ttc DECIMAL;
  v_ht DECIMAL;
  v_vat DECIMAL;
  v_contacts INTEGER;
  v_base_contacts_24 INTEGER := 67;
  v_base_contacts_25 INTEGER := 79;
BEGIN

  -- =============================================
  -- PARTIE 1 : Dépenses marketing 2025 (~42 000€)
  -- =============================================

  FOR m IN 1..12 LOOP
    v_date := '2025-' || LPAD(m::TEXT, 2, '0') || '-05';

    -- SeLoger : ~1 830€/mois → ~22 000€/an
    v_ttc := ROUND(1830 * v_season[m]);
    v_ht := ROUND(v_ttc / 1.20, 2);
    v_vat := ROUND(v_ttc - v_ht, 2);
    INSERT INTO expenses (agency_id, date, supplier, category, amount_ttc, amount_ht, vat_amount, status, payment_method, supplier_name, acquisition_channel, comment, created_by)
    VALUES (v_agency, v_date, 'SeLoger', 'publicite_marketing', v_ttc, v_ht, v_vat, 'validated', 'transfer', 'SeLoger', 'SeLoger', 'Abonnement SeLoger ' || v_month_names[m] || ' 2025', v_user)
    ON CONFLICT DO NOTHING;

    -- LeBonCoin : ~830€/mois → ~10 000€/an
    v_ttc := ROUND(830 * v_season[m]);
    v_ht := ROUND(v_ttc / 1.20, 2);
    v_vat := ROUND(v_ttc - v_ht, 2);
    INSERT INTO expenses (agency_id, date, supplier, category, amount_ttc, amount_ht, vat_amount, status, payment_method, supplier_name, acquisition_channel, comment, created_by)
    VALUES (v_agency, v_date, 'LeBonCoin', 'publicite_marketing', v_ttc, v_ht, v_vat, 'validated', 'transfer', 'LeBonCoin', 'LeBonCoin', 'Abonnement LeBonCoin ' || v_month_names[m] || ' 2025', v_user)
    ON CONFLICT DO NOTHING;

    -- Bien'ici : ~330€/mois → ~4 000€/an
    v_ttc := ROUND(330 * v_season[m]);
    v_ht := ROUND(v_ttc / 1.20, 2);
    v_vat := ROUND(v_ttc - v_ht, 2);
    INSERT INTO expenses (agency_id, date, supplier, category, amount_ttc, amount_ht, vat_amount, status, payment_method, supplier_name, acquisition_channel, comment, created_by)
    VALUES (v_agency, v_date, 'Bien''ici', 'publicite_marketing', v_ttc, v_ht, v_vat, 'validated', 'transfer', 'Bien''ici', 'Bien''ici', 'Abonnement Bien''ici ' || v_month_names[m] || ' 2025', v_user)
    ON CONFLICT DO NOTHING;

    -- Site web agence : ~250€/mois → ~3 000€/an
    v_ttc := 250;
    v_ht := ROUND(v_ttc / 1.20, 2);
    v_vat := ROUND(v_ttc - v_ht, 2);
    INSERT INTO expenses (agency_id, date, supplier, category, amount_ttc, amount_ht, vat_amount, status, payment_method, supplier_name, acquisition_channel, comment, created_by)
    VALUES (v_agency, v_date, 'OVH / Agence web', 'publicite_marketing', v_ttc, v_ht, v_vat, 'validated', 'transfer', 'OVH / Agence web', 'Site web agence', 'Hébergement + SEO ' || v_month_names[m] || ' 2025', v_user)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Panneaux / Vitrine : 4 dépenses trimestrielles ~750€ → ~3 000€/an
  FOR m IN 1..4 LOOP
    v_date := '2025-' || LPAD((m * 3 - 1)::TEXT, 2, '0') || '-15';
    v_ttc := 750;
    v_ht := ROUND(v_ttc / 1.20, 2);
    v_vat := ROUND(v_ttc - v_ht, 2);
    INSERT INTO expenses (agency_id, date, supplier, category, amount_ttc, amount_ht, vat_amount, status, payment_method, supplier_name, acquisition_channel, comment, created_by)
    VALUES (v_agency, v_date, 'Imprimerie locale', 'publicite_marketing', v_ttc, v_ht, v_vat, 'validated', 'transfer', 'Imprimerie locale', 'Panneau / Vitrine', 'Panneaux et vitrine T' || m || ' 2025', v_user)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- =============================================
  -- PARTIE 2 : Dépenses marketing 2024 (~35 000€)
  -- =============================================

  FOR m IN 1..12 LOOP
    v_date := '2024-' || LPAD(m::TEXT, 2, '0') || '-05';

    -- SeLoger : ~1 500€/mois → ~18 000€/an
    v_ttc := ROUND(1500 * v_season[m]);
    v_ht := ROUND(v_ttc / 1.20, 2);
    v_vat := ROUND(v_ttc - v_ht, 2);
    INSERT INTO expenses (agency_id, date, supplier, category, amount_ttc, amount_ht, vat_amount, status, payment_method, supplier_name, acquisition_channel, comment, created_by)
    VALUES (v_agency, v_date, 'SeLoger', 'publicite_marketing', v_ttc, v_ht, v_vat, 'validated', 'transfer', 'SeLoger', 'SeLoger', 'Abonnement SeLoger ' || v_month_names[m] || ' 2024', v_user)
    ON CONFLICT DO NOTHING;

    -- LeBonCoin : ~670€/mois → ~8 000€/an
    v_ttc := ROUND(670 * v_season[m]);
    v_ht := ROUND(v_ttc / 1.20, 2);
    v_vat := ROUND(v_ttc - v_ht, 2);
    INSERT INTO expenses (agency_id, date, supplier, category, amount_ttc, amount_ht, vat_amount, status, payment_method, supplier_name, acquisition_channel, comment, created_by)
    VALUES (v_agency, v_date, 'LeBonCoin', 'publicite_marketing', v_ttc, v_ht, v_vat, 'validated', 'transfer', 'LeBonCoin', 'LeBonCoin', 'Abonnement LeBonCoin ' || v_month_names[m] || ' 2024', v_user)
    ON CONFLICT DO NOTHING;

    -- Bien'ici : ~250€/mois → ~3 000€/an
    v_ttc := ROUND(250 * v_season[m]);
    v_ht := ROUND(v_ttc / 1.20, 2);
    v_vat := ROUND(v_ttc - v_ht, 2);
    INSERT INTO expenses (agency_id, date, supplier, category, amount_ttc, amount_ht, vat_amount, status, payment_method, supplier_name, acquisition_channel, comment, created_by)
    VALUES (v_agency, v_date, 'Bien''ici', 'publicite_marketing', v_ttc, v_ht, v_vat, 'validated', 'transfer', 'Bien''ici', 'Bien''ici', 'Abonnement Bien''ici ' || v_month_names[m] || ' 2024', v_user)
    ON CONFLICT DO NOTHING;

    -- Site web agence : ~250€/mois → ~3 000€/an
    v_ttc := 250;
    v_ht := ROUND(v_ttc / 1.20, 2);
    v_vat := ROUND(v_ttc - v_ht, 2);
    INSERT INTO expenses (agency_id, date, supplier, category, amount_ttc, amount_ht, vat_amount, status, payment_method, supplier_name, acquisition_channel, comment, created_by)
    VALUES (v_agency, v_date, 'OVH / Agence web', 'publicite_marketing', v_ttc, v_ht, v_vat, 'validated', 'transfer', 'OVH / Agence web', 'Site web agence', 'Hébergement + SEO ' || v_month_names[m] || ' 2024', v_user)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Panneaux 2024
  FOR m IN 1..4 LOOP
    v_date := '2024-' || LPAD((m * 3 - 1)::TEXT, 2, '0') || '-15';
    v_ttc := 750;
    v_ht := ROUND(v_ttc / 1.20, 2);
    v_vat := ROUND(v_ttc - v_ht, 2);
    INSERT INTO expenses (agency_id, date, supplier, category, amount_ttc, amount_ht, vat_amount, status, payment_method, supplier_name, acquisition_channel, comment, created_by)
    VALUES (v_agency, v_date, 'Imprimerie locale', 'publicite_marketing', v_ttc, v_ht, v_vat, 'validated', 'transfer', 'Imprimerie locale', 'Panneau / Vitrine', 'Panneaux et vitrine T' || m || ' 2024', v_user)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- =============================================
  -- PARTIE 3 : Commercial KPIs par canal manquants
  -- =============================================
  -- Le seed 020 a déjà SeLoger(40%), LeBonCoin(20%), Réseau personnel(25%), Autre(15%) pour 2025
  -- On ajoute : Bien'ici(10%), Site web agence(15%), Panneau/Vitrine(5%)
  -- ET on crée les KPIs canal pour 2024

  -- 2025 — canaux manquants
  FOR m IN 1..12 LOOP
    v_contacts := ROUND(v_base_contacts_25 * v_season[m]);

    -- Bien'ici ~10%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2025, 'Bien''ici', ROUND(v_contacts * 0.10), ROUND(v_contacts * 0.10 * 0.22), ROUND(v_contacts * 0.10 * 0.09), ROUND(v_contacts * 0.10 * 0.055), ROUND(v_contacts * 0.10 * 0.050), ROUND(638000.0 / 12.0 * v_season[m] * 0.10), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;

    -- Site web agence ~15%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2025, 'Site web agence', ROUND(v_contacts * 0.15), ROUND(v_contacts * 0.15 * 0.28), ROUND(v_contacts * 0.15 * 0.11), ROUND(v_contacts * 0.15 * 0.07), ROUND(v_contacts * 0.15 * 0.063), ROUND(638000.0 / 12.0 * v_season[m] * 0.15), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;

    -- Panneau / Vitrine ~5%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2025, 'Panneau / Vitrine', ROUND(v_contacts * 0.05), ROUND(v_contacts * 0.05 * 0.20), ROUND(v_contacts * 0.05 * 0.08), ROUND(v_contacts * 0.05 * 0.05), ROUND(v_contacts * 0.05 * 0.045), ROUND(638000.0 / 12.0 * v_season[m] * 0.05), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;
  END LOOP;

  -- 2024 — tous les canaux (il n'y en avait aucun en 020)
  FOR m IN 1..12 LOOP
    v_contacts := ROUND(v_base_contacts_24 * v_season[m]);

    -- SeLoger ~40%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2024, 'SeLoger', ROUND(v_contacts * 0.40), ROUND(v_contacts * 0.40 * 0.25), ROUND(v_contacts * 0.40 * 0.10), ROUND(v_contacts * 0.40 * 0.063), ROUND(v_contacts * 0.40 * 0.057), ROUND(560000.0 / 12.0 * v_season[m] * 0.40), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;

    -- LeBonCoin ~20%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2024, 'LeBonCoin', ROUND(v_contacts * 0.20), ROUND(v_contacts * 0.20 * 0.25), ROUND(v_contacts * 0.20 * 0.10), ROUND(v_contacts * 0.20 * 0.063), ROUND(v_contacts * 0.20 * 0.057), ROUND(560000.0 / 12.0 * v_season[m] * 0.20), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;

    -- Bien'ici ~10%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2024, 'Bien''ici', ROUND(v_contacts * 0.10), ROUND(v_contacts * 0.10 * 0.22), ROUND(v_contacts * 0.10 * 0.09), ROUND(v_contacts * 0.10 * 0.055), ROUND(v_contacts * 0.10 * 0.050), ROUND(560000.0 / 12.0 * v_season[m] * 0.10), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;

    -- Site web agence ~15%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2024, 'Site web agence', ROUND(v_contacts * 0.15), ROUND(v_contacts * 0.15 * 0.28), ROUND(v_contacts * 0.15 * 0.11), ROUND(v_contacts * 0.15 * 0.07), ROUND(v_contacts * 0.15 * 0.063), ROUND(560000.0 / 12.0 * v_season[m] * 0.15), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;

    -- Panneau / Vitrine ~5%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2024, 'Panneau / Vitrine', ROUND(v_contacts * 0.05), ROUND(v_contacts * 0.05 * 0.20), ROUND(v_contacts * 0.05 * 0.08), ROUND(v_contacts * 0.05 * 0.05), ROUND(v_contacts * 0.05 * 0.045), ROUND(560000.0 / 12.0 * v_season[m] * 0.05), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;

    -- Réseau personnel ~25%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2024, 'Réseau personnel', ROUND(v_contacts * 0.25), ROUND(v_contacts * 0.25 * 0.30), ROUND(v_contacts * 0.25 * 0.12), ROUND(v_contacts * 0.25 * 0.075), ROUND(v_contacts * 0.25 * 0.068), ROUND(560000.0 / 12.0 * v_season[m] * 0.25), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;
  END LOOP;

END $$;
