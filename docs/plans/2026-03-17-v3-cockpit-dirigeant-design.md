# NXT Finance V3 — Cockpit Dirigeant

**Date :** 2026-03-17
**Statut :** Design validé — prêt pour planification d'implémentation
**Auteur :** Jean-Guy Ourmieres + Claude

---

## 1. Vision produit

Transformer NXT Finance d'un outil de gestion financière en **cockpit de pilotage pour dirigeants d'agences immobilières**.

### Objectifs V3

1. Analyse automatique d'un bilan comptable
2. Business plan automatique N+1 avec 3 scénarios
3. Génération de dossier bancaire premium (deck visuel)
4. Pilotage de rentabilité (collaborateur, activité, agence)
5. Intelligence opérationnelle (alertes + recommandations)

---

## 2. Décisions produit de référence

### 2.1 Source du bilan — Double source

- **Primaire :** bilan importé (PDF/Excel) produit par l'expert-comptable = source de vérité comptable
- **Secondaire :** données NXT Finance pour enrichissement, contexte et comparaison
- **Règle :** le bilan importé reste la base comptable de référence. NXT ne remplace jamais la comptabilité officielle.

### 2.2 Moteur d'intelligence — Hybride

- **Moteur déterministe :** calcule ratios, projections, anomalies, produit les variables
- **LLM (Claude API) :** rédige synthèses, recommandations, argumentaires bancaires
- **Règle absolue :** le LLM ne calcule jamais, ne modifie jamais les chiffres. Il rédige, structure et adapte le discours.

### 2.3 Multi-agences

- Vue consolidée comparant les agences entre elles
- Analyse temporelle par agence (N vs N-1)

### 2.4 Dossier bancaire — Deck premium

- **Format :** présentation visuelle type slides (PowerPoint/Gamma), pas un PDF tabulaire
- **Exports :** PDF + PPTX
- **Flux :** Générer → personnaliser sections/texte → exporter
- **Compatibilité future :** API externe de génération de présentations
- **Architecture :** moteur déterministe (données) + LLM (narratif) + composition (slides)

### 2.5 Import bilan — Double mode avec validation

- **Mode 1 — Parsing automatique :** PDF/Excel libre, extraction auto, score de confiance, validation humaine si nécessaire
- **Mode 2 — Template standardisé :** Excel NXT Finance, import fiable et rapide, mode recommandé
- **Contrôles obligatoires :** actif=passif, totaux cohérents, postes manquants, comparaison inter-périodes
- **Gate :** aucune analyse financière sur données avec incohérences majeures non résolues
- **Doctrine :** import libre (friction minimale) → validation humaine (sécurité) → template (fiabilité)

### 2.6 Business plan — Hypothèses progressives

- **Niveau 1 — Auto :** projection N+1 depuis l'historique, zéro saisie
- **Niveau 2 — Macro :** paramètres globaux ajustables (croissance CA, charges, inflation, masse salariale)
- **Niveau 3 — Détail :** zoom par poste (CA par type, charges par catégorie, recrutements)
- **Règle de surcharge :** détail surcharge macro, macro surcharge auto
- **Moteur :** 100% déterministe. LLM rédige uniquement les narratifs.

### 2.7 Alertes V3 — Détection + recommandations

- **Détection :** 100% déterministe (règles étendues)
- **Nouveaux domaines :** rentabilité agence, rentabilité collaborateur, tendances business, suivi business plan
- **LLM (post-détection) :** explique, contextualise, recommande
- **Structure alerte :** type, indicateur, valeur, seuil, sévérité, explication, recommandations

### 2.8 Architecture — Hybride avec fonctions isolées

- **Coeur (Next.js server) :** logique métier, multi-tenant, moteur déterministe, orchestration, API, UI
- **Fonctions isolées (Edge Functions) :** parsing bilan, appels LLM, génération deck, exports fichiers
- **Contraintes :** pas de traitement lourd dans le runtime principal, architecture orientée jobs, chaque fonction isolée = module remplaçable
- **Évolution :** Edge Functions d'abord, migrables vers backend dédié si nécessaire

---

## 3. Architecture fonctionnelle — 6 modules

```
┌─────────────────────────────────────────────────────────────┐
│                 NXT FINANCE V3 — COCKPIT DIRIGEANT          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │  M1. IMPORT  │──▶│  M2. ANALYSE │──▶│  M3. BUSINESS  │  │
│  │  BILAN       │   │  FINANCIÈRE  │   │  PLAN N+1      │  │
│  └──────────────┘   └──────┬───────┘   └───────┬────────┘  │
│                            │                    │           │
│                            ▼                    ▼           │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │  M4. PILOTAGE│◀──│  M5. ALERTES │──▶│  M6. DOSSIER   │  │
│  │  RENTABILITÉ │   │  INTELLIGENTES│   │  BANCAIRE      │  │
│  └──────────────┘   └──────────────┘   └────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  EXISTANT V1-V2 : Dashboard, Recettes, Dépenses, TVA,      │
│  Comptable, Collaborateurs, Commissionnement, Reversements  │
└─────────────────────────────────────────────────────────────┘
```

### Flux de données

| Source | Destination | Données |
|--------|-------------|---------|
| M1 Import Bilan | M2 Analyse | Postes comptables structurés et validés |
| M2 Analyse | M3 Business Plan | Ratios, tendances, structure financière |
| M2 Analyse | M5 Alertes | Anomalies détectées, indicateurs calculés |
| M2 Analyse | M6 Dossier Bancaire | Synthèse financière, points forts/faibles |
| M3 Business Plan | M5 Alertes | Projections pour suivi écarts réel vs prévu |
| M3 Business Plan | M6 Dossier Bancaire | Scénarios de projection |
| M4 Pilotage | M5 Alertes | KPIs rentabilité par collaborateur/activité |
| Données NXT (V1-V2) | M2, M3, M4, M5 | Recettes, dépenses, collaborateurs, commissions |

### Niveaux de fonctionnement par module

Chaque module fonctionne en 3 niveaux :

| Module | Minimum viable | Enrichi | Complet |
|--------|---------------|---------|---------|
| M1 | Template importé | PDF/Excel auto parsé | Parsé + validé + historique |
| M2 | Ratios NXT seuls | NXT + bilan non validé | NXT + bilan validé + N-1 |
| M3 | Auto-hypothèses seules | + macro ajustées | + détail par poste |
| M4 | Données NXT seules | + ratios M2 | + consolidation multi-agences |
| M5 | Règles existantes | + règles V3 | + recommandations LLM |
| M6 | Données + layout | + narratifs LLM | + personnalisation complète |

### Dépendances fonctionnelles

- **M1** est autonome
- **M2** est partiellement autonome (NXT seul), enrichi par M1
- **M3** dépend de M2
- **M4** est semi-autonome (NXT seul), enrichi par M2
- **M5** est transverse, consomme M2, M3, M4 et données NXT
- **M6** dépend de M2 + M3, enrichissement optionnel par M4

---

## 4. Modèle de données V3

### 4.1 Tables transverses

#### `processing_jobs`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| agency_id | UUID FK → agencies | |
| job_type | ENUM | bilan_parsing, analysis_generation, bp_generation, dossier_generation, dossier_export, llm_generation |
| status | ENUM | queued → processing → completed → failed → cancelled |
| related_type | TEXT | ex: "balance_sheet" |
| related_id | UUID | |
| progress | INTEGER (0-100) | nullable |
| error_message | TEXT | nullable |
| triggered_by | UUID FK → user_profiles | nullable |
| payload_json | JSONB | nullable |
| started_at | TIMESTAMPTZ | nullable |
| completed_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `llm_generations`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| agency_id | UUID FK → agencies | |
| provider | TEXT | ex: "anthropic" |
| model | TEXT | ex: "claude-sonnet-4-6" |
| prompt_version | TEXT | ex: "insight_v1.2" |
| input_refs | JSONB | ex: {"analysis_id": "...", "ratio_keys": [...]} |
| output_type | TEXT | financial_insight, bp_narrative, alert_recommendation, slide_narrative |
| output_id | UUID | FK vers l'entité générée |
| tokens_input | INTEGER | nullable |
| tokens_output | INTEGER | nullable |
| duration_ms | INTEGER | nullable |
| status | ENUM | pending, completed, failed |
| error_message | TEXT | nullable |
| generated_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

### 4.2 M1 — Import Bilan

#### `balance_sheets`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| agency_id | UUID FK → agencies | |
| fiscal_year | INTEGER | |
| source_type | ENUM | pdf_auto, excel_auto, template, manual |
| source_file_path | TEXT | |
| overall_confidence | DECIMAL (0-100) | |
| status | ENUM | uploaded → parsing → parsed → validating → validated → rejected |
| validation_notes | TEXT | nullable |
| validated_by | UUID FK → user_profiles | nullable |
| validated_at | TIMESTAMPTZ | nullable |
| version_number | INTEGER | DEFAULT 1 |
| is_current | BOOLEAN | DEFAULT true |
| parent_id | UUID FK → balance_sheets | nullable |
| archived_reason | TEXT | nullable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Contrainte :** UNIQUE (agency_id, fiscal_year, status) WHERE status = 'validated' AND is_current = true — un seul bilan validé courant par agence/exercice.

#### `balance_sheet_items`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| balance_sheet_id | UUID FK → balance_sheets | |
| section | ENUM | actif_immobilise, actif_circulant, capitaux_propres, dettes, produits_exploitation, charges_exploitation, produits_financiers, charges_financieres, produits_exceptionnels, charges_exceptionnelles |
| category | TEXT | ex: "Créances clients" |
| pcg_code | TEXT | nullable |
| amount | DECIMAL | |
| amount_n_minus_1 | DECIMAL | nullable |
| confidence_score | DECIMAL (0-100) | |
| is_validated | BOOLEAN | DEFAULT false |
| original_label | TEXT | label brut extrait |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Contrainte :** UNIQUE (balance_sheet_id, section, pcg_code)

#### `balance_sheet_checks`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| balance_sheet_id | UUID FK → balance_sheets | |
| check_type | ENUM | actif_passif_balance, totals_consistency, missing_items, cross_period, duplicate |
| status | ENUM | passed, warning, failed |
| severity | ENUM | info, warning, critical |
| expected_value | DECIMAL | nullable |
| actual_value | DECIMAL | nullable |
| message | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 4.3 M2 — Analyse Financière

#### `financial_analyses`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| agency_id | UUID FK → agencies | |
| balance_sheet_id | UUID FK → balance_sheets | nullable (mode NXT seul) |
| fiscal_year | INTEGER | |
| analysis_level | ENUM | basic, enriched, complete |
| status | ENUM | computing → ready → archived |
| version_number | INTEGER | DEFAULT 1 |
| is_current | BOOLEAN | DEFAULT true |
| parent_id | UUID FK → financial_analyses | nullable |
| archived_reason | TEXT | nullable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Contrainte :** UNIQUE (agency_id, fiscal_year, analysis_level, is_current) WHERE is_current = true

#### `financial_ratios`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| analysis_id | UUID FK → financial_analyses | |
| ratio_key | TEXT | ex: "marge_nette", "taux_endettement" |
| value | DECIMAL | |
| value_n_minus_1 | DECIMAL | nullable |
| benchmark_min | DECIMAL | nullable |
| benchmark_max | DECIMAL | nullable |
| status | ENUM | healthy, warning, critical |
| source | ENUM | bilan, nxt, computed |
| calculation_version | TEXT | ex: "ratio_engine_v1.0" |
| computed_at | TIMESTAMPTZ | |
| input_hash | TEXT | hash des données source |
| formula_key | TEXT | ex: "marge_nette = resultat_net / ca_ht" |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `financial_insights`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| analysis_id | UUID FK → financial_analyses | |
| insight_type | ENUM | strength, weakness, anomaly, recommendation |
| category | TEXT | ex: "rentabilité", "trésorerie" |
| title | TEXT | |
| content | TEXT | rédigé par LLM |
| related_ratios | TEXT[] | ratio_keys concernés |
| severity | ENUM | info, attention, critical |
| llm_generation_id | UUID FK → llm_generations | nullable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 4.4 M3 — Business Plan

#### `business_plans`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| agency_id | UUID FK → agencies | |
| analysis_id | UUID FK → financial_analyses | nullable |
| target_year | INTEGER | |
| status | ENUM | draft → computing → ready → archived |
| version_number | INTEGER | DEFAULT 1 |
| is_current | BOOLEAN | DEFAULT true |
| parent_id | UUID FK → business_plans | nullable |
| archived_reason | TEXT | nullable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Contrainte :** UNIQUE (agency_id, target_year, is_current) WHERE is_current = true

#### `bp_hypotheses`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| business_plan_id | UUID FK → business_plans | |
| scenario | ENUM | pessimistic, realistic, optimistic |
| level | ENUM | auto, macro, detailed |
| category | TEXT | ex: "ca_global", "ca_transaction" |
| parent_category | TEXT | nullable, ex: "ca_global" pour "ca_transaction" |
| label | TEXT | ex: "Croissance CA transactions" |
| value | DECIMAL | |
| value_type | ENUM | percentage, amount, count |
| period_granularity | ENUM | annual, monthly |
| month | INTEGER | nullable (1-12, si monthly) |
| is_user_override | BOOLEAN | DEFAULT false |
| sort_order | INTEGER | DEFAULT 0 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `bp_projections`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| business_plan_id | UUID FK → business_plans | |
| scenario | ENUM | pessimistic, realistic, optimistic |
| month | INTEGER (1-12) | |
| revenue_projected | DECIMAL | |
| expenses_projected | DECIMAL | |
| margin_projected | DECIMAL | |
| treasury_projected | DECIMAL | |
| details_json | JSONB | breakdown par catégorie |
| calculation_version | TEXT | |
| computed_at | TIMESTAMPTZ | |
| input_hash | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Contrainte :** UNIQUE (business_plan_id, scenario, month)

#### `bp_narratives`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| business_plan_id | UUID FK → business_plans | |
| scenario | ENUM | pessimistic, realistic, optimistic |
| section | TEXT | ex: "executive_summary", "risk_factors" |
| content | TEXT | |
| llm_generation_id | UUID FK → llm_generations | nullable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 4.5 M4 — Pilotage Rentabilité

#### `profitability_snapshots`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| agency_id | UUID FK → agencies | |
| period_month | INTEGER | |
| period_year | INTEGER | |
| scope | ENUM | agency, collaborator, activity |
| scope_id | UUID | nullable |
| scope_label | TEXT | |
| revenue_total | DECIMAL | |
| cost_total | DECIMAL | |
| margin | DECIMAL | |
| margin_rate | DECIMAL | |
| cost_revenue_ratio | DECIMAL | |
| calculation_version | TEXT | |
| computed_at | TIMESTAMPTZ | |
| input_hash | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Contrainte :** UNIQUE (agency_id, period_month, period_year, scope, scope_id)

#### `agency_groups`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| owner_id | UUID FK → user_profiles | |
| name | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `agency_group_members`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| group_id | UUID FK → agency_groups | |
| agency_id | UUID FK → agencies | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Contrainte :** UNIQUE (group_id, agency_id)

#### `consolidated_snapshots`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| group_id | UUID FK → agency_groups | |
| period_month | INTEGER | |
| period_year | INTEGER | |
| scope | ENUM | group_total, per_agency, per_activity |
| scope_id | UUID | nullable |
| scope_label | TEXT | |
| revenue_total | DECIMAL | |
| cost_total | DECIMAL | |
| margin | DECIMAL | |
| margin_rate | DECIMAL | |
| agency_count | INTEGER | |
| calculation_version | TEXT | |
| computed_at | TIMESTAMPTZ | |
| input_hash | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Contrainte :** UNIQUE (group_id, period_month, period_year, scope, scope_id)

### 4.6 M5 — Alertes V3 (extension)

Nouveaux champs sur la table `alerts` existante :

| Colonne | Type | Description |
|---------|------|-------------|
| alert_domain | ENUM | treasury, vat, pre_accounting, accountant, profitability_agency, profitability_collaborator, business_trend, business_plan_tracking |
| indicator_key | TEXT | ex: "cost_ca_ratio" |
| measured_value | DECIMAL | nullable |
| threshold_value | DECIMAL | nullable |
| recommendation | TEXT | nullable, généré par LLM |
| recommendation_at | TIMESTAMPTZ | nullable |
| llm_generation_id | UUID FK → llm_generations | nullable |

### 4.7 M6 — Dossier Bancaire

#### `bank_dossiers`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| agency_id | UUID FK → agencies | |
| analysis_id | UUID FK → financial_analyses | |
| business_plan_id | UUID FK → business_plans | nullable |
| request_type | ENUM | pret_immobilier, tresorerie, developpement, refinancement, autre |
| requested_amount | DECIMAL | nullable |
| status | ENUM | draft → generating → ready → exported |
| version_number | INTEGER | DEFAULT 1 |
| is_current | BOOLEAN | DEFAULT true |
| parent_id | UUID FK → bank_dossiers | nullable |
| archived_reason | TEXT | nullable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Contrainte :** UNIQUE (agency_id, analysis_id, request_type, is_current) WHERE is_current = true

#### `bank_dossier_slides`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| dossier_id | UUID FK → bank_dossiers | |
| position | INTEGER | |
| slide_type | ENUM | cover, company_overview, financial_summary, ratio_highlights, projection_chart, scenario_comparison, strengths_weaknesses, funding_request, conclusion, custom |
| title | TEXT | |
| source_data_json | JSONB | données déterministes (ratios, montants, séries) |
| layout_type | ENUM | title_only, text_left_chart_right, full_chart, two_columns, key_figures, bullet_points, comparison_table, custom |
| layout_options_json | JSONB | couleurs, tailles, options visuelles |
| narrative | TEXT | texte LLM initial |
| llm_generation_id | UUID FK → llm_generations | nullable |
| user_title_override | TEXT | nullable |
| user_narrative_override | TEXT | nullable |
| user_layout_override | JSONB | nullable |
| is_user_modified | BOOLEAN | DEFAULT false |
| is_visible | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Contrainte :** UNIQUE (dossier_id, position)

#### `bank_dossier_exports`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| dossier_id | UUID FK → bank_dossiers | |
| format | ENUM | pdf, pptx |
| file_path | TEXT | |
| exported_by | UUID FK → user_profiles | |
| export_status | ENUM | generating, completed, failed |
| generation_duration_ms | INTEGER | nullable |
| exported_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

### 4.8 Résumé modèle de données

| Module | Tables | Détail |
|--------|--------|--------|
| Transverses | 2 | processing_jobs, llm_generations |
| M1 Import | 3 | balance_sheets, items, checks |
| M2 Analyse | 3 | analyses, ratios, insights |
| M3 Business Plan | 4 | plans, hypotheses, projections, narratives |
| M4 Pilotage | 4 | snapshots, groups, group_members, consolidated_snapshots |
| M5 Alertes | 0 | +7 champs sur table existante |
| M6 Dossier | 3 | dossiers, slides, exports |
| **Total** | **19 nouvelles tables** | **1 table étendue** |

---

## 5. Services backend

### 5.1 Architecture des services

```
┌──────────────────────────────────────────────────────────────┐
│                        NEXT.JS SERVER                         │
│                                                               │
│  Services métier (déterministes)                              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│  │ balance-sheet- │ │ analysis-     │ │ bp-engine     │      │
│  │ service        │ │ engine        │ │               │      │
│  └───────────────┘ └───────────────┘ └───────────────┘      │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│  │ ratio-engine   │ │ profitability-│ │ alert-engine  │      │
│  │ (4 sous-modules)│ │ engine       │ │ -v3           │      │
│  └───────────────┘ └───────────────┘ └───────────────┘      │
│  ┌───────────────┐ ┌───────────────┐                        │
│  │ dossier-      │ │ consolidation-│                        │
│  │ orchestrator  │ │ service       │                        │
│  └───────────────┘ └───────────────┘                        │
│                                                               │
│  Services d'orchestration                                     │
│  ┌───────────────┐ ┌──────────────────────────────┐          │
│  │ job-          │ │ registries (benchmarks,       │          │
│  │ orchestrator  │ │ alert-thresholds, prompts)    │          │
│  └───────────────┘ └──────────────────────────────┘          │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                    FONCTIONS ISOLÉES                           │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│  │ parse-bilan   │ │ llm-gateway   │ │ export-       │      │
│  │               │ │               │ │ generator     │      │
│  └───────────────┘ └───────────────┘ └───────────────┘      │
└───────────────────────────────────────────────────────────────┘
```

### 5.2 Détail des services

#### `balance-sheet-service` (Next.js server — M1)

- `fetchBalanceSheets(agencyId, fiscalYear?)` → liste des bilans
- `fetchBalanceSheet(id)` → bilan + items + checks
- `createBalanceSheet(agencyId, fiscalYear, file, sourceType)` → crée entrée, upload fichier, crée processing_job via job-orchestrator
- `validateBalanceSheetItem(itemId, correctedAmount?)` → marque validé
- `validateBalanceSheet(id, validatedBy)` → vérifie checks, gate confiance, status → validated, archive versions précédentes
- `rejectBalanceSheet(id, reason)` → status → rejected
- `runCoherenceChecks(balanceSheetId)` → contrôles actif/passif, totaux, postes manquants, met à jour overall_confidence

#### `parse-bilan` (Fonction isolée — M1)

Interface d'entrée : `{ jobId, fileUrl, sourceType, balanceSheetId }`

Pipeline : extraction → normalisation → mapping comptable PCG → persistance items → déclenchement cohérence checks.

Logique par source :
- template → mapping direct (confiance 95-100%)
- excel_auto → détection headers, heuristiques comptables
- pdf_auto → extraction texte, pattern matching PCG

#### `ratio-engine` (Next.js server — M2/M4/M5)

4 sous-modules :
- `bilan` : computeRatiosFromBilan — marge_nette, taux_endettement, BFR, CAF, liquidité, couverture_dettes, rotation_créances
- `nxt` : computeRatiosFromNxt — CA total/par type, charges total/par catégorie, marge opérationnelle, ratio masse salariale, CA/collaborateur
- `merged` : computeRatiosComplete — fusion bilan + NXT, ratios croisés, comparaison N vs N-1, évaluation status via benchmarks
- `benchmarks` : getRatioBenchmarks — seuils de référence secteur immobilier (configuration, pas en DB)

Traçabilité : input_hash + computed_at + calculation_version + formula_key sur chaque ratio.

#### `analysis-engine` (Next.js server — M2)

- `createAnalysis(agencyId, fiscalYear, balanceSheetId?)` → détermine level, crée analyse, appelle ratio-engine, status → ready (sans attendre LLM), lance job async pour insights LLM
- `refreshAnalysis(analysisId)` → recalcule ratios, regénère insights si changement, incrémente version
- `getAnalysisFreshness(analysisId)` → compare input_hash actuel vs données source → fresh | stale | outdated
- `archiveAnalysis(analysisId, reason)` → is_current → false

**Règle :** l'analyse est prête dès que les ratios sont calculés. Les insights LLM arrivent en async.

#### `bp-engine` (Next.js server — M3)

Projections (déterministes) :
- `generateAutoHypotheses(agencyId, targetYear)` → analyse historique, tendances, saisonnalité → hypothèses auto
- `computeProjections(businessPlanId, scenario)` → calcul mensuel (revenue, expenses, margin, treasury) avec override cascade (auto → macro → detail)
- `computeAllScenarios(businessPlanId)` → pessimiste (×0.8), réaliste (×1.0), optimiste (×1.2), coefficients configurables
- `compareHistoryVsProjection(businessPlanId)` → écarts mensuels + cumulés → alimente M5

Narratives (séparées, async) :
- Job async → llm-gateway pour narratives par scénario/section
- BP exploitable immédiatement sans attendre les textes

#### `profitability-engine` (Next.js server — M4)

- `computeCollaboratorProfitability(agencyId, month, year)` → par collaborateur : revenue, cost (selon type), margin, ratios → upsert snapshots
- `computeActivityProfitability(agencyId, month, year)` → par revenue_type → upsert snapshots
- `computeAgencyProfitability(agencyId, month, year)` → agrégé → upsert snapshots
- `computeConsolidation(groupId, month, year)` → agrège snapshots multi-agences → insère consolidated_snapshots
- `getDirectorSummary(agencyId | groupId, month, year)` → 100% déterministe : meilleure agence, meilleur collaborateur, meilleure activité, vigilance principale

#### `alert-engine-v3` (Next.js server — M5)

Nouvelles règles :

| Clé | Domaine | Déclencheur |
|-----|---------|-------------|
| margin_decline | profitability_agency | marge N < marge N-1 × 0.9 |
| charges_ca_ratio_high | profitability_agency | ratio > seuil agence |
| collaborator_unprofitable | profitability_collaborator | margin_rate < 0, 2 mois consécutifs |
| collaborator_low_productivity | profitability_collaborator | CA mois < seuil min |
| ca_declining_3m | business_trend | CA en baisse 3 mois consécutifs |
| seasonal_anomaly | business_trend | CA mois < même mois N-1 × 0.7 |
| bp_revenue_gap | business_plan_tracking | CA réel < projection × 0.9 |
| bp_charges_drift | business_plan_tracking | charges réelles > projection × 1.1 |

Pipeline : évaluation règles → upsert alertes (déduplication par clé) → sélection alertes nécessitant recommandation (filtre : non déjà recommandées, sévérité >= vigilance) → job async batch → llm-gateway → recommandations persistées.

#### `dossier-orchestrator` (Next.js server — M6)

- `createBankDossier(agencyId, analysisId, businessPlanId?, requestType, amount?)` → génère structure slides, source_data_json depuis ratios/projections, job async pour narratives LLM
- `regenerateBankDossier(dossierId)` → recalcule données source, regénère narratives
- `fetchBankDossiers(agencyId)` → liste
- `fetchBankDossier(id)` → dossier + slides + exports
- `updateSlide(slideId, updates)` → titre, narrative, layout overrides, marque is_user_modified
- `reorderSlides(dossierId, positions[])` → réordonne
- `toggleSlideVisibility(slideId)` → is_visible toggle
- `duplicateDossier(dossierId)` → copie complète avec nouveau version_number
- `archiveDossier(dossierId, reason)` → is_current → false
- `getCompletionScore(dossierId)` → % slides avec données + narrative + layout

**Règle :** le dossier-orchestrator gère la composition métier. L'export-generator ne fait que la génération technique.

#### `export-generator` (Fonction isolée — M6)

Interface : `{ type, format, sourceId, exportedBy }`

Rôle limité : reçoit le payload complet (slides visibles, user overrides appliqués) du dossier-orchestrator → génère le fichier PDF ou PPTX → upload Storage → retourne filePath.

#### `llm-gateway` (Fonction isolée — transverse)

Interface : `generateContent({ type, promptVersion, variables, agencyId, userId })`

- Sélectionne prompt template depuis prompt-registry
- Injecte les variables pré-calculées (jamais de données brutes à calculer)
- Appelle Claude API
- Insère dans llm_generations (traçabilité complète)
- Rate limiting par agence, retry backoff exponentiel
- Dégradation gracieuse : si LLM indisponible, les modules fonctionnent sans textes

#### `job-orchestrator` (Next.js server — transverse)

- `createJob(agencyId, jobType, relatedType, relatedId, payload?, triggeredBy?)` → idempotence (vérifie pas de job identique en cours), verrou logique, insère queued
- `pollJobStatus(jobId)` → status + progress
- `onJobComplete(jobId, result)` → status completed, déclenche actions suivantes
- `onJobFailed(jobId, error)` → status failed, notification utilisateur
- Prévention doublons : UNIQUE partiel sur (related_type, related_id, job_type) WHERE status IN ('queued', 'processing')
- Relance contrôlée : mécanisme de retry avec compteur, pas de boucle infinie

#### `consolidation-service` (Next.js server — M4/M8)

- `fetchGroups(ownerId)` → groupes de l'utilisateur
- `createGroup(ownerId, name, agencyIds[])` → crée groupe + membres
- `updateGroupMembers(groupId, agencyIds[])` → sync
- `refreshConsolidation(groupId, month, year)` → appelle profitability-engine.computeConsolidation

#### Registries métier versionnés

- `ratio-benchmarks` : seuils secteur immobilier par ratio_key (min, max, status)
- `alert-thresholds` : seuils de déclenchement par règle, surchargeables par agence dans settings
- `prompt-registry` : templates de prompts versionnés par type + version, avec variables attendues

### 5.3 Hooks React Query (front)

#### Queries

| Hook | Service |
|------|---------|
| useBalanceSheets | balance-sheet-service |
| useBalanceSheet | balance-sheet-service |
| useAnalyses | analysis-engine |
| useAnalysis | analysis-engine |
| useAnalysisFreshness | analysis-engine |
| useRatios | ratio-engine |
| useInsights | analysis-engine |
| useBusinessPlans | bp-engine |
| useBusinessPlan | bp-engine |
| useProjections | bp-engine |
| useHypotheses | bp-engine |
| useProfitabilitySnapshots | profitability-engine |
| useCollaboratorProfitability | profitability-engine |
| useActivityProfitability | profitability-engine |
| useDirectorSummary | profitability-engine |
| useAgencyGroups | consolidation-service |
| useConsolidation | consolidation-service |
| useAlertsV3 | alert-engine-v3 |
| useAlertsByDomain | alert-engine-v3 |
| useBankDossiers | dossier-orchestrator |
| useBankDossier | dossier-orchestrator |
| useDossierSlides | dossier-orchestrator |
| useJobStatus | job-orchestrator (polling) |

#### Mutations

| Hook | Service |
|------|---------|
| useCreateBalanceSheet | balance-sheet-service |
| useValidateBalanceSheet | balance-sheet-service |
| useValidateItem | balance-sheet-service |
| useRejectBalanceSheet | balance-sheet-service |
| useCreateAnalysis | analysis-engine |
| useRefreshAnalysis | analysis-engine |
| useArchiveAnalysis | analysis-engine |
| useCreateBusinessPlan | bp-engine |
| useUpdateHypothesis | bp-engine |
| useRefreshProjections | bp-engine |
| useArchiveBusinessPlan | bp-engine |
| useRefreshProfitability | profitability-engine |
| useCreateGroup | consolidation-service |
| useUpdateGroupMembers | consolidation-service |
| useRefreshConsolidation | consolidation-service |
| useMarkAlertTreated | alert-engine-v3 |
| useSnoozeAlert | alert-engine-v3 |
| useDismissAlert | alert-engine-v3 |
| useCreateDossier | dossier-orchestrator |
| useUpdateSlide | dossier-orchestrator |
| useReorderSlides | dossier-orchestrator |
| useToggleSlideVisibility | dossier-orchestrator |
| useDuplicateDossier | dossier-orchestrator |
| useArchiveDossier | dossier-orchestrator |
| useExportDossier | dossier-orchestrator |

---

## 6. Écrans V3

### 6.1 Navigation

```
Sidebar V3
├── Dashboard (enrichi V3)
├── Recettes
├── Dépenses
├── Périodes & TVA
├── Collaborateurs
├── Reversements
├── ─────────────
├── Analyse financière (M1 + M2)
├── Business Plan (M3)
├── Pilotage rentabilité (M4)
├── Dossier bancaire (M6)
├── ─────────────
├── Espace comptable
└── Paramètres

Topbar : + Centre de notifications (M5)
```

### 6.2 Écrans par module

#### `/analyse` — Page principale (M1+M2)

- Bandeau de fraîcheur : date dernière génération, source données, niveau d'analyse, statut recalcul
- État des données : données NXT (complétude), bilan importé (statut), niveau analyse
- Synthèse dirigeant (LLM)
- Ratios clés avec indicateurs santé
- Tendances avec évolution
- Cards insights par catégorie (points forts, points faibles, anomalies)

#### `/analyse/import` — Import bilan (M1)

Parcours 4 étapes visuelles :
1. Import (choix mode + upload)
2. Parsing (progression job)
3. Validation (résultat avec scores confiance, corrections, contrôles cohérence)
4. Analyse (confirmation + lancement)

Template NXT Finance téléchargeable.

#### `/analyse/[id]` — Détail analyse (M2)

Tabs : Synthèse, Ratios, Charges, Revenus, Comparaison N-1, Bilan importé, Traçabilité.
Tab Traçabilité : version calcul, source données, date génération, provenance insights IA.
Actions : Générer Business Plan, Créer dossier bancaire, Exporter PDF.

#### `/business-plan` — Liste (M3)

Cards des plans avec version, scénario, CA projeté, marge, date.
Actions : Ouvrir, Dupliquer, Archiver.

#### `/business-plan/[id]` — Éditeur (M3)

- Sélecteur scénario (pessimiste/réaliste/optimiste)
- Panneau hypothèses rétractable (macro → détail en dépliable)
- Graphique projection mensuelle (Recharts, 12 mois, bande pessim/optim)
- Vue "Historique vs projection" (N vs N+1)
- Synthèse rédigée (LLM, apparaît après job async)
- Actions : Modifier hypothèses, Générer dossier bancaire

#### `/pilotage` — Dashboard rentabilité (M4)

- Bandeau synthèse dirigeant : agence la plus rentable, collaborateur le plus contributif, activité la plus rentable, point de vigilance
- Tabs : Par agence, Par collaborateur, Par activité, Vue consolidée
- Classement avec indicateurs couleur (vert/jaune/rouge)
- Graphiques comparatifs (Recharts)

#### `/pilotage/collaborateur/[id]` — Fiche rentabilité (M4)

- KPIs individuels (CA, commission, coût, marge)
- Évolution 12 mois (graphique)
- Analyse contextuelle (LLM si disponible)

#### `/dossier-bancaire` — Liste (M6)

Cards des dossiers avec type demande, montant, statut, date.
Actions : Ouvrir, Dupliquer, Archiver.

#### `/dossier-bancaire/[id]` — Éditeur de deck (M6)

- Bandeau global : score complétude, nb slides visibles, dernier export, badges auto/modifié/masqué
- Panneau slides (gauche) avec drag-and-drop réordonnement
- Preview visuelle (droite)
- Éditeur slide (bas) : titre, layout, texte modifiable, regénérer/restaurer
- Export PDF / PPTX
- Preview deck complet

#### Centre de notifications (M5 — topbar)

- Panneau déroulant depuis icône cloche
- Filtres : domaine, sévérité, lu/non-lu, "nécessite action"
- Actions : marquer traitée, snooze, lien direct vers écran concerné

#### Dashboard enrichi (existant + V3)

- Score de santé financière (dès V3.3)
- Top 3 alertes V3 (dès V3.5)
- Raccourcis cockpit : dernière analyse, business plan, dossier bancaire

### 6.3 Résumé écrans

| Route | Module | Type |
|-------|--------|------|
| `/analyse` | M1+M2 | Page principale |
| `/analyse/import` | M1 | Import bilan (4 étapes) |
| `/analyse/[id]` | M2 | Détail analyse (tabs) |
| `/business-plan` | M3 | Liste |
| `/business-plan/[id]` | M3 | Éditeur BP |
| `/pilotage` | M4 | Dashboard rentabilité (tabs) |
| `/pilotage/collaborateur/[id]` | M4 | Fiche rentabilité |
| `/dossier-bancaire` | M6 | Liste |
| `/dossier-bancaire/[id]` | M6 | Éditeur deck |
| Centre notifications | M5 | Panneau topbar |
| Dashboard enrichi | M5 | Enrichissements |

**Total : 9 nouvelles pages + 2 enrichissements**

---

## 7. Roadmap de build

### 7.1 Principes

1. Fondations d'abord — services transverses et modèle de données avant modules métier
2. Dépendances respectées — M1 avant M2, M2 avant M3, M4 semi-autonome
3. Valeur incrémentale — chaque phase livre une fonctionnalité utilisable
4. Complexité progressive — déterministe d'abord, LLM après
5. Sécurité et monitoring dès le départ — pas repoussés en fin de projet

### 7.2 Jalons produit

| Jalon | Phase | Signification |
|-------|-------|--------------|
| MVP démontrable | V3.4 | Import + analyse + pilotage rentabilité fonctionnels |
| MVP commercial crédible | V3.6 | + business plan N+1 avec projections |
| Version premium complète | V3.7b/V3.8 | + dossier bancaire premium + multi-agences |

### 7.3 Phases détaillées

---

#### V3.1 — Fondations & Infrastructure

**Objectif :** Poser les bases techniques partagées par tous les modules V3.

**Tables :** processing_jobs, llm_generations

**Services :**
- job-orchestrator (idempotence, verrou logique, prévention doublons, relance contrôlée, monitoring)
- llm-gateway (fonction isolée : prompt routing, rate limiting, retry, dégradation gracieuse)
- Registries : ratio-benchmarks, alert-thresholds, prompt-registry

**Infrastructure :**
- Setup fonctions isolées (Edge Functions ou équivalent)
- Supabase Storage bucket bilans
- Configuration Claude API
- Structure /features/shared/
- RLS minimal sur processing_jobs et llm_generations
- Monitoring processing_jobs (dashboard jobs en erreur, durée moyenne)

**Hooks :** useJobStatus

**Definition of Done :**
- Un job peut être créé, exécuté, complété ou échoué
- Le llm-gateway appelle Claude API et persiste la trace
- Les registries sont chargés et versionnés
- RLS empêche l'accès cross-agency
- Un dashboard monitoring basique est consultable

**Critères de démo :** Créer un job → le voir progresser → consulter la trace LLM.

**Dette acceptée :** Monitoring basique (pas de Grafana), registries en fichiers de config (pas d'admin UI).

**Dépendances :** Aucune.

---

#### V3.2 — Import bilan (M1)

**Objectif :** Le dirigeant peut importer et valider un bilan comptable.

**Tables :** balance_sheets, balance_sheet_items, balance_sheet_checks

**Services :** balance-sheet-service, parse-bilan (fonction isolée avec pipeline extraction → normalisation → mapping)

**Écrans :** /analyse/import (parcours 4 étapes)

**Hooks :** useBalanceSheets, useBalanceSheet, useCreateBalanceSheet, useValidateBalanceSheet, useValidateItem, useRejectBalanceSheet

**Flux :** Upload → job-orchestrator → parse-bilan → items + checks → validation dirigeant → bilan validé.

**Inclus dès cette phase :**
- RLS sur les 3 nouvelles tables
- Template Excel NXT Finance téléchargeable
- Tests de flux critiques : import PDF, import template, validation, rejet

**Definition of Done :**
- Import PDF et Excel fonctionnel avec scores de confiance
- Template standardisé disponible et fonctionnel
- Contrôles de cohérence actif/passif exécutés automatiquement
- Gate de confiance bloquante si incohérences majeures
- Validation/correction par le dirigeant fonctionnelle

**Critères de démo :** Importer un bilan PDF → voir le parsing → corriger un poste → valider.

**Critères de non-régression :** Modules V1-V2 inchangés.

**Dette acceptée :** Parsing PDF basique (amélioration continue), pas de multi-langue.

**Dépendances :** V3.1 (job-orchestrator, storage).

---

#### V3.3 — Analyse financière (M2)

**Objectif :** Produire une analyse financière exploitable avec ratios, benchmarks et synthèse.

**Tables :** financial_analyses, financial_ratios, financial_insights

**Services :** ratio-engine (4 sous-modules), analysis-engine

**Écrans :** /analyse (page principale avec bandeau fraîcheur), /analyse/[id] (détail avec tabs dont traçabilité)

**Hooks :** useAnalyses, useAnalysis, useAnalysisFreshness, useRatios, useInsights, useCreateAnalysis, useRefreshAnalysis, useArchiveAnalysis

**Activation dashboard dès cette phase :**
- Score de santé financière sur le dashboard
- Indicateurs synthétiques
- Fraîcheur de l'analyse

**Definition of Done :**
- Analyse basic (NXT seul) fonctionnelle sans bilan importé
- Analyse enriched/complete fonctionnelle avec bilan
- Ratios calculés avec traçabilité (input_hash, formula_key)
- Insights LLM générés en async, analyse utilisable sans attendre
- Benchmarks secteur immobilier appliqués
- Dashboard enrichi avec score santé

**Critères de démo :** Lancer une analyse NXT → voir les ratios + benchmarks → recevoir les insights → consulter sur le dashboard.

**Critères de non-régression :** Import bilan (V3.2) toujours fonctionnel.

**Dette acceptée :** Benchmarks immobilier initiaux (à affiner avec des données marché réelles).

**Dépendances :** V3.1 (llm-gateway, registries), V3.2 (optionnel pour enrichissement).

---

#### V3.4 — Pilotage rentabilité (M4)

**Objectif :** Vue de rentabilité par collaborateur, activité et agence. Premier jalon MVP démontrable.

**Tables :** profitability_snapshots, agency_groups, agency_group_members

**Services :** profitability-engine, getDirectorSummary (100% déterministe)

**Écrans :** /pilotage (dashboard avec tabs + bandeau synthèse), /pilotage/collaborateur/[id] (fiche rentabilité)

**Hooks :** useProfitabilitySnapshots, useCollaboratorProfitability, useActivityProfitability, useDirectorSummary, useRefreshProfitability

**Definition of Done :**
- Rentabilité par collaborateur calculée avec prise en compte du type (salarié/VRP/indépendant)
- Rentabilité par activité et par agence fonctionnelles
- Classement avec indicateurs couleur
- Bandeau synthèse dirigeant fonctionnel
- Évolution 12 mois sur fiche collaborateur

**Critères de démo :** Voir le classement collaborateurs → identifier le moins rentable → consulter sa fiche → voir l'évolution.

**Critères de non-régression :** Modules V1-V2 et V3.2-V3.3 fonctionnels.

**Dette acceptée :** Groupes multi-agences créés en DB mais vue consolidée reportée à V3.8.

**Dépendances :** Données NXT existantes (recettes, dépenses, collaborateurs, commissions). Pas de dépendance M1/M2.

**Jalon : MVP démontrable.**

---

#### V3.5 — Alertes intelligentes V3 (M5)

**Objectif :** Étendre le moteur d'alertes et ajouter les recommandations LLM.

**Pré-requis — Jalon stabilisation LLM :**
Avant la montée en charge LLM de cette phase :
- Prompts versionnés et testés dans prompt-registry
- Cas de test de qualité des sorties LLM (format, ton, pertinence)
- Garde-fous rédactionnels (longueur max, interdiction de chiffres inventés, vérification cohérence)
- Validation qualité sur un échantillon représentatif

**Modifications table :** Extension alerts (+7 champs)

**Services :** alert-engine-v3 (nouvelles règles + sélection/déduplication + recommandations async)

**Écrans :** Centre de notifications (topbar), enrichissement dashboard (top 3 alertes, raccourcis cockpit)

**Hooks :** useAlertsV3, useAlertsByDomain, useMarkAlertTreated, useSnoozeAlert, useDismissAlert

**Definition of Done :**
- 8 nouvelles règles fonctionnelles
- Déduplication fiable
- Recommandations LLM générées en async avec traçabilité
- Centre de notifications avec filtres et actions (traitée, snooze, lien direct)
- Dashboard enrichi avec alertes V3

**Critères de démo :** Voir une alerte "collaborateur non rentable" → lire la recommandation → marquer traitée.

**Critères de non-régression :** Alertes V1-V2 existantes toujours fonctionnelles.

**Dette acceptée :** Seuils d'alertes par défaut (personnalisation avancée reportée).

**Dépendances :** V3.1 (llm-gateway), V3.3 (ratios), V3.4 (snapshots rentabilité).

---

#### V3.6 — Business plan N+1 (M3)

**Objectif :** Générer un business plan avec projections 3 scénarios. Jalon MVP commercial crédible.

**Tables :** business_plans, bp_hypotheses, bp_projections, bp_narratives

**Services :** bp-engine (projections déterministes séparées des narratives LLM async)

**Écrans :** /business-plan (liste), /business-plan/[id] (éditeur avec hypothèses, graphique, historique vs projection, synthèse LLM)

**Hooks :** useBusinessPlans, useBusinessPlan, useProjections, useHypotheses, useCreateBusinessPlan, useUpdateHypothesis, useRefreshProjections, useArchiveBusinessPlan

**Definition of Done :**
- Auto-hypothèses générées depuis l'historique NXT
- 3 scénarios calculés avec ventilation mensuelle
- Hypothèses modifiables (macro + détail) avec recalcul instantané
- Vue historique vs projection fonctionnelle
- Narratives LLM en async, BP exploitable sans attendre
- Versioning fonctionnel

**Critères de démo :** Générer un BP → modifier une hypothèse → voir le graphique se recalculer → comparer avec N → lire la synthèse.

**Critères de non-régression :** Analyse (V3.3) et alertes (V3.5) fonctionnels, écarts BP alimentent les alertes.

**Dette acceptée :** Coefficients scénarios simples (×0.8/1.0/1.2), affinables plus tard.

**Dépendances :** V3.3 (analyse pour hypothèses enrichies), V3.1 (llm-gateway).

**Jalon : MVP commercial crédible.**

---

#### V3.7a — Dossier bancaire éditeur (M6 — partie 1)

**Objectif :** Générer et personnaliser un deck bancaire dans l'application.

**Tables :** bank_dossiers, bank_dossier_slides

**Services :** dossier-orchestrator (création, édition slides, réordonnement, visibilité, duplication, score complétude)

**Écrans :** /dossier-bancaire (liste), /dossier-bancaire/[id] (éditeur : panneau slides, preview, éditeur, bandeau global)

**Hooks :** useBankDossiers, useBankDossier, useDossierSlides, useCreateDossier, useUpdateSlide, useReorderSlides, useToggleSlideVisibility, useDuplicateDossier, useArchiveDossier

**Definition of Done :**
- Création de dossier avec slides auto-générées (données + narratifs LLM)
- Édition titre/texte/layout par slide
- Réordonnement et masquage de slides
- Score de complétude fonctionnel
- Preview visuelle du deck dans le navigateur
- Duplication et archivage

**Critères de démo :** Créer un dossier "Prêt développement" → voir les slides → modifier un texte → masquer une slide → consulter le score.

**Dépendances :** V3.3 (analyse), V3.6 (business plan, optionnel).

---

#### V3.7b — Export premium (M6 — partie 2)

**Objectif :** Exporter le deck en PDF et PPTX haute qualité.

**Tables :** bank_dossier_exports

**Services :** export-generator (fonction isolée : génération technique PDF/PPTX depuis payload structuré)

**Hooks :** useExportDossier

**Definition of Done :**
- Export PDF fonctionnel avec rendu visuel premium
- Export PPTX fonctionnel et éditable dans PowerPoint
- User overrides appliqués dans l'export
- Historique des exports consultable
- Durée de génération tracée

**Critères de démo :** Exporter un dossier en PPTX → l'ouvrir dans PowerPoint → vérifier le rendu → exporter en PDF.

**Dépendances :** V3.7a (dossier éditeur), V3.1 (export-generator, storage).

**Jalon : version premium en cours (complète avec V3.8).**

---

#### V3.8 — Multi-agences & consolidation

**Objectif :** Vue consolidée pour dirigeants multi-agences.

**Tables :** consolidated_snapshots

**Services :** consolidation-service, extension profitability-engine (computeConsolidation)

**Écrans modifiés :**
- /pilotage → tab "Vue consolidée" avec comparaison inter-agences
- /parametres → section "Groupes d'agences"
- Topbar → sélecteur agence avec option "Vue groupe"

**Hooks :** useAgencyGroups, useConsolidation, useCreateGroup, useUpdateGroupMembers, useRefreshConsolidation

**Definition of Done :**
- Création/gestion de groupes d'agences
- Snapshots consolidés calculés
- Comparaison inter-agences fonctionnelle (graphiques)
- Sélecteur vue groupe dans la topbar

**Critères de démo :** Créer un groupe de 2 agences → consulter la vue consolidée → comparer les marges.

**Dépendances :** V3.4 (profitability_snapshots).

**Jalon : version premium complète.**

---

#### V3.9 — Optimisation, responsive, E2E

**Objectif :** Stabiliser et polir l'ensemble V3 pour la production.

**Actions :**
- Responsive mobile pour tous les écrans V3
- Tests E2E étendus des flux critiques (import → analyse → BP → dossier)
- Performance : index DB, optimisation requêtes consolidation, cache React Query tuning
- Rate limiting LLM : vérification limites réelles par agence
- Audit sécurité RLS complet sur les 19 tables
- Documentation utilisateur : onboarding V3 in-app
- Monitoring avancé si nécessaire

**Definition of Done :**
- Tous les écrans V3 fonctionnels sur mobile
- Tests E2E passent sur les flux critiques
- Performances acceptables sur données réalistes
- RLS vérifié sur toutes les tables V3

**Dépendances :** Toutes les phases précédentes.

---

### 7.4 Matrice de dépendances et parallélisation

```
V3.1 ──┬──────────────────────────────────────────┐
       │                                           │
       ├── V3.2 (M1)                               │
       │     │                                     │
       │     ├── V3.3 (M2) ──┬── V3.6 (M3)        │
       │     │                │     │               │
       │     │                │     ├── V3.7a (M6)  │
       │     │                │     │     │         │
       │     │                │     │     └── V3.7b │
       │     │                │                     │
       ├── V3.4 (M4) ────────┤                     │
       │                      │                     │
       │                      └── V3.5 (M5)         │
       │                                           │
       │                      V3.8 (dépend V3.4)   │
       │                                           │
       └───────────────────── V3.9 (après tout) ───┘
```

**Parallélisations possibles :**
- V3.2 et V3.4 en parallèle après V3.1
- V3.5 et V3.6 en parallèle après V3.3 + V3.4

### 7.5 Résumé

| Phase | Module | Tables | Services | Écrans | Jalon |
|-------|--------|--------|----------|--------|-------|
| V3.1 | Infra | 2 | 3 + registries | 0 | — |
| V3.2 | M1 | 3 | 2 | 1 | — |
| V3.3 | M2 | 3 | 2 | 2 + dashboard | — |
| V3.4 | M4 | 3 | 2 | 2 | MVP démontrable |
| V3.5 | M5 | +ext | 1 | 1 + enrichissements | — |
| V3.6 | M3 | 4 | 1 | 2 | MVP commercial |
| V3.7a | M6 part1 | 2 | 1 | 2 | — |
| V3.7b | M6 part2 | 1 | 1 | 0 | — |
| V3.8 | Multi | 1 | 2 | modifications | Premium complète |
| V3.9 | Polish | 0 | 0 | responsive + tests | Production |
| **Total** | | **19 + 1 ext** | **15 + registries** | **10 + enrichissements** | |

### 7.6 Méthodologie par phase

Chaque phase doit inclure :
- **Definition of Done** : critères objectifs de complétion
- **Critères de démo** : scénario démontrable
- **Critères de non-régression** : vérification que les phases précédentes fonctionnent
- **Dépendances bloquantes** : phases requises
- **Dette acceptée** : simplifications conscientes, documentées pour amélioration future
