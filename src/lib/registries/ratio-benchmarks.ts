// ============================================
// NXT Finance V3.5 — Benchmarks ratios secteur immobilier
// ============================================
// Source : moyennes observées sur agences immobilières françaises
// Version : 2.0 — ajout indicateurs opérationnels + graduation continue
// ============================================

export interface RatioBenchmark {
  key: string;
  label: string;
  unit: '%' | 'jours' | 'ratio' | 'mois' | 'euros';
  healthy_min: number;
  healthy_max: number;
  warning_min: number;
  warning_max: number;
  /** If true, lower values are better (e.g. debt ratio, charges) */
  lower_is_better?: boolean;
  description: string;
}

export const RATIO_BENCHMARKS: RatioBenchmark[] = [
  // --- Bilan ratios ---
  {
    key: 'marge_nette',
    label: 'Marge nette',
    unit: '%',
    healthy_min: 8,
    healthy_max: 100,
    warning_min: 3,
    warning_max: 8,
    description: 'Résultat net / CA HT',
  },
  {
    key: 'marge_brute',
    label: 'Marge brute',
    unit: '%',
    healthy_min: 40,
    healthy_max: 100,
    warning_min: 25,
    warning_max: 40,
    description: 'Marge brute / CA HT',
  },
  {
    key: 'taux_endettement',
    label: 'Taux d\'endettement',
    unit: '%',
    healthy_min: 0,
    healthy_max: 60,
    warning_min: 60,
    warning_max: 80,
    lower_is_better: true,
    description: 'Dettes totales / Capitaux propres',
  },
  {
    key: 'ratio_liquidite',
    label: 'Ratio de liquidité',
    unit: 'ratio',
    healthy_min: 1.2,
    healthy_max: 100,
    warning_min: 0.8,
    warning_max: 1.2,
    description: 'Actif circulant / Dettes court terme',
  },
  {
    key: 'bfr_jours',
    label: 'BFR en jours de CA',
    unit: 'jours',
    healthy_min: 0,
    healthy_max: 60,
    warning_min: 60,
    warning_max: 90,
    lower_is_better: true,
    description: 'Besoin en fonds de roulement / (CA / 365)',
  },
  {
    key: 'ratio_charges_ca',
    label: 'Ratio charges / CA',
    unit: '%',
    healthy_min: 0,
    healthy_max: 75,
    warning_min: 75,
    warning_max: 90,
    lower_is_better: true,
    description: 'Charges totales / CA HT',
  },
  {
    key: 'ratio_masse_salariale',
    label: 'Ratio masse salariale / CA',
    unit: '%',
    healthy_min: 0,
    healthy_max: 45,
    warning_min: 45,
    warning_max: 60,
    lower_is_better: true,
    description: 'Masse salariale totale / CA HT',
  },
  {
    key: 'ca_par_collaborateur',
    label: 'CA par collaborateur',
    unit: 'euros',
    healthy_min: 30000,
    healthy_max: 999999,
    warning_min: 15000,
    warning_max: 30000,
    description: 'CA HT / Nombre de collaborateurs actifs',
  },

  // --- NXT operational ratios ---
  {
    key: 'taux_recurrence',
    label: 'Taux de récurrence',
    unit: '%',
    healthy_min: 35,
    healthy_max: 100,
    warning_min: 15,
    warning_max: 35,
    description: '(CA gestion + location) / CA total',
  },
  {
    key: 'concentration_ca_top3',
    label: 'Concentration CA top 3',
    unit: '%',
    healthy_min: 0,
    healthy_max: 50,
    warning_min: 50,
    warning_max: 70,
    lower_is_better: true,
    description: 'Part du CA concentrée sur les 3 premiers collaborateurs',
  },
  {
    key: 'delai_encaissement_moyen',
    label: 'Délai d\'encaissement moyen',
    unit: 'jours',
    healthy_min: 0,
    healthy_max: 25,
    warning_min: 25,
    warning_max: 45,
    lower_is_better: true,
    description: 'Moyenne (date encaissement - date facture)',
  },
  {
    key: 'ratio_charges_fixes_ca',
    label: 'Ratio charges fixes / CA',
    unit: '%',
    healthy_min: 0,
    healthy_max: 35,
    warning_min: 35,
    warning_max: 50,
    lower_is_better: true,
    description: 'Charges fixes / CA total HT',
  },
  {
    key: 'runway_tresorerie',
    label: 'Runway trésorerie',
    unit: 'mois',
    healthy_min: 4,
    healthy_max: 999,
    warning_min: 2,
    warning_max: 4,
    description: 'Trésorerie disponible / charges mensuelles moyennes',
  },

  // --- Merged ratios ---
  {
    key: 'coherence_ca',
    label: 'Cohérence CA bilan/NXT',
    unit: '%',
    healthy_min: 0,
    healthy_max: 5,
    warning_min: 5,
    warning_max: 15,
    lower_is_better: true,
    description: 'Écart entre CA bilan et CA NXT',
  },
  {
    key: 'couverture_charges_reelles',
    label: 'Couverture charges réelles',
    unit: '%',
    healthy_min: 90,
    healthy_max: 110,
    warning_min: 80,
    warning_max: 120,
    description: 'Charges NXT / Charges bilan',
  },
];

export function getBenchmarkForRatio(key: string): RatioBenchmark | undefined {
  return RATIO_BENCHMARKS.find((b) => b.key === key);
}

export function evaluateRatioStatus(
  key: string,
  value: number
): 'healthy' | 'warning' | 'critical' {
  const benchmark = getBenchmarkForRatio(key);
  if (!benchmark) return 'healthy';

  if (value >= benchmark.healthy_min && value <= benchmark.healthy_max) return 'healthy';
  if (value >= benchmark.warning_min && value <= benchmark.warning_max) return 'warning';
  return 'critical';
}

/**
 * Compute a continuous score (0-100) for a ratio based on benchmark thresholds.
 * Replaces the binary healthy=100/warning=50/critical=0 approach.
 */
export function computeContinuousScore(
  key: string,
  value: number
): number {
  const benchmark = getBenchmarkForRatio(key);
  if (!benchmark) return 50; // Informational, no benchmark → neutral

  const lowerIsBetter = benchmark.lower_is_better ?? false;

  // For "lower is better" ratios (debt, charges, etc.)
  if (lowerIsBetter) {
    // Below healthy_max → healthy zone (70-100)
    if (value <= benchmark.healthy_max) {
      // Perfect if at 0 (or healthy_min), decreasing toward healthy_max
      const range = benchmark.healthy_max - benchmark.healthy_min;
      if (range <= 0) return 100;
      const position = Math.max(0, Math.min(1, (value - benchmark.healthy_min) / range));
      return Math.round(100 - position * 30); // 100 → 70
    }
    // Between healthy_max and warning_max → warning zone (30-70)
    if (value <= benchmark.warning_max) {
      const range = benchmark.warning_max - benchmark.healthy_max;
      if (range <= 0) return 50;
      const position = (value - benchmark.healthy_max) / range;
      return Math.round(70 - position * 40); // 70 → 30
    }
    // Above warning_max → critical zone (0-30)
    const criticalRange = benchmark.warning_max * 0.5; // Extend 50% beyond warning_max
    if (criticalRange <= 0) return 0;
    const position = Math.min(1, (value - benchmark.warning_max) / criticalRange);
    return Math.round(30 - position * 30); // 30 → 0
  }

  // For "higher is better" ratios (margin, CA, runway, etc.)
  // Above healthy_min → healthy zone (70-100)
  if (value >= benchmark.healthy_min) {
    const range = benchmark.healthy_max - benchmark.healthy_min;
    if (range <= 0) return 100;
    const position = Math.min(1, (value - benchmark.healthy_min) / range);
    return Math.round(70 + position * 30); // 70 → 100
  }
  // Between warning_min and healthy_min → warning zone (30-70)
  if (value >= benchmark.warning_min) {
    const range = benchmark.healthy_min - benchmark.warning_min;
    if (range <= 0) return 50;
    const position = (value - benchmark.warning_min) / range;
    return Math.round(30 + position * 40); // 30 → 70
  }
  // Below warning_min → critical zone (0-30)
  const criticalRange = benchmark.warning_min * 0.5;
  if (criticalRange <= 0 || benchmark.warning_min <= 0) return 0;
  const position = Math.max(0, Math.min(1, value / benchmark.warning_min));
  return Math.round(position * 30); // 0 → 30
}

/**
 * Special handling for couverture_charges_reelles which has a symmetric benchmark
 * (best at 100%, bad if too high OR too low)
 */
export function computeSymmetricScore(
  value: number,
  optimalCenter: number,
  healthyRange: number,
  warningRange: number
): number {
  const distance = Math.abs(value - optimalCenter);
  if (distance <= healthyRange) {
    return Math.round(100 - (distance / healthyRange) * 30); // 100 → 70
  }
  if (distance <= warningRange) {
    const position = (distance - healthyRange) / (warningRange - healthyRange);
    return Math.round(70 - position * 40); // 70 → 30
  }
  const criticalExtra = warningRange * 0.5;
  if (criticalExtra <= 0) return 0;
  const position = Math.min(1, (distance - warningRange) / criticalExtra);
  return Math.round(30 - position * 30); // 30 → 0
}
