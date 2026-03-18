// ============================================
// NXT Finance V3.5 — Ratio Engine: Scoring
// Score de santé financière pondéré par catégorie
// avec graduation continue (0-100 par ratio)
// ============================================

import type { RatioStatus } from '@/types/enums';
import {
  evaluateRatioStatus,
  computeContinuousScore,
  computeSymmetricScore,
} from '@/lib/registries/ratio-benchmarks';

interface ScoredRatio {
  key: string;
  value: number;
  status: RatioStatus;
  continuousScore: number;
}

interface ScoreCategory {
  name: string;
  weight: number;
  ratioKeys: string[];
}

const SCORE_CATEGORIES: ScoreCategory[] = [
  {
    name: 'rentabilite',
    weight: 0.25,
    ratioKeys: ['marge_nette', 'marge_brute', 'marge_operationnelle_nxt'],
  },
  {
    name: 'structure',
    weight: 0.15,
    ratioKeys: ['taux_endettement', 'capacite_autofinancement'],
  },
  {
    name: 'liquidite',
    weight: 0.15,
    ratioKeys: ['ratio_liquidite', 'bfr_jours'],
  },
  {
    name: 'productivite',
    weight: 0.10,
    ratioKeys: ['ca_par_collaborateur', 'ratio_masse_salariale'],
  },
  {
    name: 'charges',
    weight: 0.10,
    ratioKeys: ['ratio_charges_ca', 'ratio_charges_fixes_ca'],
  },
  {
    name: 'dynamique_commerciale',
    weight: 0.15,
    ratioKeys: ['nb_transactions_total', 'panier_moyen_global', 'taux_recurrence'],
  },
  {
    name: 'risques',
    weight: 0.10,
    ratioKeys: ['concentration_ca_top3', 'runway_tresorerie'],
  },
];

// Informational ratios that don't participate in scoring
const INFORMATIONAL_RATIOS = new Set([
  'nb_transactions_total',
  'nb_transactions_transaction',
  'nb_transactions_gestion',
  'nb_transactions_location',
  'panier_moyen_global',
  'panier_moyen_transaction',
  'panier_moyen_gestion',
  'panier_moyen_location',
  'part_ca_transaction',
  'part_ca_gestion',
  'part_ca_location',
  'point_mort_mensuel',
  'coherence_ca',
  'couverture_charges_reelles',
]);

function getContinuousScoreForRatio(key: string, value: number): number {
  // Special symmetric scoring for couverture_charges_reelles
  if (key === 'couverture_charges_reelles') {
    return computeSymmetricScore(value, 100, 10, 20);
  }
  return computeContinuousScore(key, value);
}

// Evaluate all ratios against benchmarks and compute health score
export function computeHealthScore(
  ratios: { key: string; value: number }[]
): {
  score: number;
  scoredRatios: ScoredRatio[];
  categoryScores: { name: string; score: number; weight: number }[];
} {
  // Evaluate each ratio
  const scoredRatios: ScoredRatio[] = ratios.map((r) => ({
    key: r.key,
    value: r.value,
    status: evaluateRatioStatus(r.key, r.value),
    continuousScore: getContinuousScoreForRatio(r.key, r.value),
  }));

  const ratioMap = new Map(scoredRatios.map((r) => [r.key, r]));

  // Compute category scores using continuous scoring
  const categoryScores = SCORE_CATEGORIES.map((cat) => {
    const catRatios = cat.ratioKeys
      .map((k) => ratioMap.get(k))
      .filter((r): r is ScoredRatio => r !== undefined)
      .filter((r) => !INFORMATIONAL_RATIOS.has(r.key)); // Skip informational

    if (catRatios.length === 0)
      return { name: cat.name, score: 50, weight: cat.weight }; // neutral if no data

    const avgScore =
      catRatios.reduce((sum, r) => sum + r.continuousScore, 0) /
      catRatios.length;
    return { name: cat.name, score: Math.round(avgScore), weight: cat.weight };
  });

  // Weighted average
  const totalWeight = categoryScores.reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round(
    categoryScores.reduce((sum, c) => sum + c.score * c.weight, 0) /
      totalWeight
  );

  return { score, scoredRatios, categoryScores };
}

// Get health label from score
export function getHealthLabel(
  score: number
): { label: string; color: 'green' | 'yellow' | 'orange' | 'red' } {
  if (score >= 80)
    return { label: 'Excellente santé financière', color: 'green' };
  if (score >= 60)
    return { label: 'Bonne santé, points de vigilance', color: 'yellow' };
  if (score >= 40)
    return { label: 'Santé fragile, actions nécessaires', color: 'orange' };
  return { label: 'Situation critique', color: 'red' };
}
