// ============================================
// NXT Finance V3 — Benchmarks ratios secteur immobilier
// ============================================
// Source : moyennes observées sur agences immobilières françaises
// Version : 1.0
// ============================================

export interface RatioBenchmark {
  key: string;
  label: string;
  unit: '%' | 'jours' | 'ratio';
  healthy_min: number;
  healthy_max: number;
  warning_min: number;
  warning_max: number;
  description: string;
}

export const RATIO_BENCHMARKS: RatioBenchmark[] = [
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
    description: 'Masse salariale totale / CA HT',
  },
  {
    key: 'ca_par_collaborateur',
    label: 'CA par collaborateur',
    unit: 'ratio',
    healthy_min: 30000,
    healthy_max: 999999,
    warning_min: 15000,
    warning_max: 30000,
    description: 'CA HT / Nombre de collaborateurs actifs',
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
