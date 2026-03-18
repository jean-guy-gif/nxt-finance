-- ============================================
-- NXT Finance V3.5 — M7 Performance Foundations
-- Étapes 1 + 2 : canaux d'acquisition + KPIs commerciaux
-- ============================================

-- =============================================
-- 1. Enrichir expenses : supplier_name + acquisition_channel
-- =============================================
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS supplier_name TEXT,
ADD COLUMN IF NOT EXISTS acquisition_channel TEXT;

-- =============================================
-- 2. Table acquisition_channels
-- =============================================
CREATE TABLE IF NOT EXISTS acquisition_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, name)
);

ALTER TABLE acquisition_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read agency acquisition channels"
  ON acquisition_channels FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

CREATE POLICY "Staff can insert acquisition channels"
  ON acquisition_channels FOR INSERT
  WITH CHECK (is_agency_staff(agency_id));

CREATE POLICY "Staff can update acquisition channels"
  ON acquisition_channels FOR UPDATE
  USING (is_agency_staff(agency_id));

CREATE POLICY "Staff can delete acquisition channels"
  ON acquisition_channels FOR DELETE
  USING (is_agency_staff(agency_id));

-- =============================================
-- 3. Table commercial_kpis
-- =============================================
CREATE TABLE IF NOT EXISTS commercial_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  source_channel TEXT, -- NULL = total tous canaux
  nb_contacts INTEGER NOT NULL DEFAULT 0,
  nb_estimations INTEGER NOT NULL DEFAULT 0,
  nb_mandats INTEGER NOT NULL DEFAULT 0,
  nb_compromis INTEGER NOT NULL DEFAULT 0,
  nb_actes INTEGER NOT NULL DEFAULT 0,
  ca_generated DECIMAL,
  source_system TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, period_month, period_year, source_channel)
);

ALTER TABLE commercial_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read agency commercial kpis"
  ON commercial_kpis FOR SELECT
  USING (has_agency_permission(agency_id, 'read'));

CREATE POLICY "Staff can insert commercial kpis"
  ON commercial_kpis FOR INSERT
  WITH CHECK (is_agency_staff(agency_id));

CREATE POLICY "Staff can update commercial kpis"
  ON commercial_kpis FOR UPDATE
  USING (is_agency_staff(agency_id));

CREATE POLICY "Staff can delete commercial kpis"
  ON commercial_kpis FOR DELETE
  USING (is_agency_staff(agency_id));

-- =============================================
-- 4. Seed : canaux par défaut pour l'agence démo
-- =============================================
DO $$
DECLARE
  v_agency UUID := '10000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO acquisition_channels (agency_id, name) VALUES
    (v_agency, 'SeLoger'),
    (v_agency, 'LeBonCoin'),
    (v_agency, 'Bien''ici'),
    (v_agency, 'Apporteurs d''affaires'),
    (v_agency, 'Réseau personnel'),
    (v_agency, 'Site web agence'),
    (v_agency, 'Panneau / Vitrine'),
    (v_agency, 'Autre')
  ON CONFLICT (agency_id, name) DO NOTHING;
END $$;

-- =============================================
-- 5. Seed : données commerciales démo 2024-2025
-- =============================================
-- Cohérent avec seed financier : CA 2024 ~560k€, CA 2025 ~638k€
-- Saisonnalité : printemps/été plus fort (×1.2-1.3), hiver plus faible (×0.7-0.8)
DO $$
DECLARE
  v_agency UUID := '10000000-0000-0000-0000-000000000001';
  -- Monthly seasonality multipliers (index 1-12)
  v_season DECIMAL[] := ARRAY[0.70, 0.75, 0.95, 1.10, 1.20, 1.30, 1.25, 1.15, 1.10, 1.00, 0.80, 0.70];
  -- Base monthly values for 2024 (scaled to ~800 contacts total)
  v_base_contacts_24 INTEGER := 67; -- ~800/12
  v_base_contacts_25 INTEGER := 79; -- ~950/12
  m INTEGER;
  v_contacts INTEGER;
  v_estimations INTEGER;
  v_mandats INTEGER;
  v_compromis INTEGER;
  v_actes INTEGER;
  v_ca DECIMAL;
BEGIN
  -- 2024 data
  FOR m IN 1..12 LOOP
    v_contacts := ROUND(v_base_contacts_24 * v_season[m]);
    v_estimations := ROUND(v_contacts * 0.25);
    v_mandats := ROUND(v_estimations * 0.40);
    v_compromis := ROUND(v_mandats * 0.63);
    v_actes := ROUND(v_compromis * 0.90);
    v_ca := ROUND(560000.0 / 12.0 * v_season[m]);

    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2024, NULL, v_contacts, v_estimations, v_mandats, v_compromis, v_actes, v_ca, 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;
  END LOOP;

  -- 2025 data
  FOR m IN 1..12 LOOP
    v_contacts := ROUND(v_base_contacts_25 * v_season[m]);
    v_estimations := ROUND(v_contacts * 0.25);
    v_mandats := ROUND(v_estimations * 0.40);
    v_compromis := ROUND(v_mandats * 0.63);
    v_actes := ROUND(v_compromis * 0.90);
    v_ca := ROUND(638000.0 / 12.0 * v_season[m]);

    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2025, NULL, v_contacts, v_estimations, v_mandats, v_compromis, v_actes, v_ca, 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;
  END LOOP;

  -- 2025 ventilation par canal (top 4 canaux)
  FOR m IN 1..12 LOOP
    v_contacts := ROUND(v_base_contacts_25 * v_season[m]);
    -- SeLoger ~40%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2025, 'SeLoger', ROUND(v_contacts * 0.40), ROUND(v_contacts * 0.40 * 0.25), ROUND(v_contacts * 0.40 * 0.10), ROUND(v_contacts * 0.40 * 0.063), ROUND(v_contacts * 0.40 * 0.057), ROUND(638000.0 / 12.0 * v_season[m] * 0.40), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;
    -- LeBonCoin ~20%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2025, 'LeBonCoin', ROUND(v_contacts * 0.20), ROUND(v_contacts * 0.20 * 0.25), ROUND(v_contacts * 0.20 * 0.10), ROUND(v_contacts * 0.20 * 0.063), ROUND(v_contacts * 0.20 * 0.057), ROUND(638000.0 / 12.0 * v_season[m] * 0.20), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;
    -- Réseau personnel ~25%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2025, 'Réseau personnel', ROUND(v_contacts * 0.25), ROUND(v_contacts * 0.25 * 0.30), ROUND(v_contacts * 0.25 * 0.12), ROUND(v_contacts * 0.25 * 0.075), ROUND(v_contacts * 0.25 * 0.068), ROUND(638000.0 / 12.0 * v_season[m] * 0.25), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;
    -- Autre ~15%
    INSERT INTO commercial_kpis (agency_id, period_month, period_year, source_channel, nb_contacts, nb_estimations, nb_mandats, nb_compromis, nb_actes, ca_generated, source_system)
    VALUES (v_agency, m, 2025, 'Autre', ROUND(v_contacts * 0.15), ROUND(v_contacts * 0.15 * 0.20), ROUND(v_contacts * 0.15 * 0.08), ROUND(v_contacts * 0.15 * 0.05), ROUND(v_contacts * 0.15 * 0.045), ROUND(638000.0 / 12.0 * v_season[m] * 0.15), 'manual')
    ON CONFLICT (agency_id, period_month, period_year, source_channel) DO NOTHING;
  END LOOP;
END $$;
