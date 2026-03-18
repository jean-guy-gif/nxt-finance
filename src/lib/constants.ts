// ============================================
// NXT Finance — Constantes applicatives
// ============================================

/** Nom du produit */
export const APP_NAME = 'NXT Finance';

/** Description courte */
export const APP_DESCRIPTION =
  'Pilotage financier et pré-comptabilité collaborative pour agences immobilières';

/** Taux de TVA standard France */
export const DEFAULT_VAT_RATE = 20;

/** Seuil de trésorerie critique par défaut (€) */
export const DEFAULT_TREASURY_THRESHOLD = 5000;

/** Délai par défaut de préparation période (jours avant fin de mois) */
export const DEFAULT_PREPARATION_DEADLINE_DAYS = 5;

/** Tolérance pièces manquantes par défaut */
export const DEFAULT_MISSING_DOCUMENTS_TOLERANCE = 3;

/** Nombre d'éléments par page dans les tables */
export const DEFAULT_PAGE_SIZE = 20;

/** Seuil de confiance OCR considéré fiable */
export const OCR_CONFIDENCE_THRESHOLD = 0.75;

/** Credentials démo */
export const DEMO_EMAIL = 'demo@nxt-finance.fr';
export const DEMO_PASSWORD = 'demo2024';

/** Routes principales */
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  RECETTES: '/recettes',
  RECETTE_DETAIL: (id: string) => `/recettes/${id}`,
  DEPENSES: '/depenses',
  DEPENSE_DETAIL: (id: string) => `/depenses/${id}`,
  PERIODES: '/periodes',
  PERIODE_DETAIL: (periodId: string) => `/periodes/${periodId}`,
  COMPTABLE: '/comptable',
  PARAMETRES: '/parametres',
} as const;

/** Labels de navigation */
export const NAV_ITEMS = [
  { label: 'Tableau de bord', href: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { label: 'Recettes', href: ROUTES.RECETTES, icon: 'TrendingUp' },
  { label: 'Dépenses', href: ROUTES.DEPENSES, icon: 'Receipt' },
  { label: 'Périodes', href: ROUTES.PERIODES, icon: 'Calendar' },
  { label: 'Comptable', href: ROUTES.COMPTABLE, icon: 'Users' },
  { label: 'Paramètres', href: ROUTES.PARAMETRES, icon: 'Settings' },
] as const;

// ============================================
// V3 — Cockpit dirigeant
// ============================================

/** Seuil de confiance minimum pour validation automatique d'un bilan */
export const BILAN_AUTO_VALIDATION_CONFIDENCE = 95;

/** Seuil de confiance minimum pour autoriser l'analyse */
export const BILAN_ANALYSIS_CONFIDENCE_GATE = 70;

/** Modèle LLM par défaut (format OpenRouter — nom complet) */
export const DEFAULT_LLM_MODEL = 'anthropic/claude-sonnet-4-20250514';

/** Provider LLM par défaut */
export const DEFAULT_LLM_PROVIDER = 'openrouter';

/** Nombre max de retries pour un job */
export const JOB_MAX_RETRIES = 3;

/** Délai de polling status job (ms) */
export const JOB_POLL_INTERVAL = 3000;

/** Coefficients scénarios business plan */
export const BP_SCENARIO_COEFFICIENTS = {
  pessimistic: 0.8,
  realistic: 1.0,
  optimistic: 1.2,
} as const;

/** Routes V3 */
export const ROUTES_V3 = {
  ANALYSE: '/analyse',
  ANALYSE_IMPORT: '/analyse/import',
  ANALYSE_DETAIL: (id: string) => `/analyse/${id}`,
  BUSINESS_PLAN: '/business-plan',
  BUSINESS_PLAN_DETAIL: (id: string) => `/business-plan/${id}`,
  PILOTAGE: '/pilotage',
  PILOTAGE_COLLABORATEUR: (id: string) => `/pilotage/collaborateur/${id}`,
  DOSSIER_BANCAIRE: '/dossier-bancaire',
  DOSSIER_BANCAIRE_DETAIL: (id: string) => `/dossier-bancaire/${id}`,
} as const;
