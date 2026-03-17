// ============================================
// NXT Finance V3 — Seuils d'alertes par défaut
// ============================================
// Surchargeables par agence via agency.settings
// Version : 1.0
// ============================================

export interface AlertThreshold {
  rule_key: string;
  label: string;
  domain: string;
  default_value: number;
  unit: '%' | 'mois' | 'ratio' | '€';
  description: string;
}

export const ALERT_THRESHOLDS: AlertThreshold[] = [
  // Rentabilité agence
  {
    rule_key: 'margin_decline_pct',
    label: 'Baisse de marge déclenchant alerte',
    domain: 'profitability_agency',
    default_value: 10,
    unit: '%',
    description: 'Alerte si marge baisse de plus de X% vs N-1',
  },
  {
    rule_key: 'charges_ca_ratio_max',
    label: 'Ratio charges/CA maximum',
    domain: 'profitability_agency',
    default_value: 85,
    unit: '%',
    description: 'Alerte si ratio charges/CA dépasse X%',
  },
  // Rentabilité collaborateur
  {
    rule_key: 'collaborator_unprofitable_months',
    label: 'Mois consécutifs non rentable',
    domain: 'profitability_collaborator',
    default_value: 2,
    unit: 'mois',
    description: 'Alerte si collaborateur non rentable pendant X mois',
  },
  {
    rule_key: 'collaborator_min_ca_monthly',
    label: 'CA minimum mensuel par collaborateur',
    domain: 'profitability_collaborator',
    default_value: 5000,
    unit: '€',
    description: 'Alerte si CA mensuel collaborateur sous X€',
  },
  // Tendances business
  {
    rule_key: 'ca_decline_consecutive_months',
    label: 'Mois consécutifs de baisse CA',
    domain: 'business_trend',
    default_value: 3,
    unit: 'mois',
    description: 'Alerte si CA en baisse pendant X mois consécutifs',
  },
  {
    rule_key: 'seasonal_anomaly_factor',
    label: 'Facteur anomalie saisonnière',
    domain: 'business_trend',
    default_value: 0.7,
    unit: 'ratio',
    description: 'Alerte si CA mois < même mois N-1 × X',
  },
  // Suivi business plan
  {
    rule_key: 'bp_revenue_gap_pct',
    label: 'Écart CA vs projection',
    domain: 'business_plan_tracking',
    default_value: 10,
    unit: '%',
    description: 'Alerte si CA réel < projection - X%',
  },
  {
    rule_key: 'bp_charges_drift_pct',
    label: 'Dérive charges vs projection',
    domain: 'business_plan_tracking',
    default_value: 10,
    unit: '%',
    description: 'Alerte si charges réelles > projection + X%',
  },
];

export function getThreshold(ruleKey: string): number {
  const threshold = ALERT_THRESHOLDS.find((t) => t.rule_key === ruleKey);
  return threshold?.default_value ?? 0;
}

/**
 * Resolve threshold: agency override > default
 */
export function resolveThreshold(
  ruleKey: string,
  agencySettings?: Record<string, unknown>
): number {
  const overrideKey = `alert_threshold_${ruleKey}`;
  const override = agencySettings?.[overrideKey];
  if (typeof override === 'number') return override;
  return getThreshold(ruleKey);
}
