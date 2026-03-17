// ============================================
// NXT Finance V3.3 — Ratio Engine: Scoring
// Score de santé financière pondéré par catégorie
// ============================================

import type { RatioStatus } from '@/types/enums';
import { evaluateRatioStatus } from '@/lib/registries/ratio-benchmarks';

interface ScoredRatio {
  key: string;
  value: number;
  status: RatioStatus;
}

interface ScoreCategory {
  name: string;
  weight: number;
  ratioKeys: string[];
}

const SCORE_CATEGORIES: ScoreCategory[] = [
  {
    name: 'rentabilite',
    weight: 0.3,
    ratioKeys: ['marge_nette', 'marge_brute', 'marge_operationnelle_nxt'],
  },
  {
    name: 'structure',
    weight: 0.25,
    ratioKeys: ['taux_endettement', 'capacite_autofinancement'],
  },
  {
    name: 'liquidite',
    weight: 0.2,
    ratioKeys: ['ratio_liquidite', 'bfr_jours'],
  },
  {
    name: 'productivite',
    weight: 0.15,
    ratioKeys: ['ca_par_collaborateur', 'ratio_masse_salariale'],
  },
  {
    name: 'charges',
    weight: 0.1,
    ratioKeys: ['ratio_charges_ca'],
  },
];

const STATUS_POINTS: Record<RatioStatus, number> = {
  healthy: 100,
  warning: 50,
  critical: 0,
};

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
  }));

  const ratioMap = new Map(scoredRatios.map((r) => [r.key, r]));

  // Compute category scores
  const categoryScores = SCORE_CATEGORIES.map((cat) => {
    const catRatios = cat.ratioKeys
      .map((k) => ratioMap.get(k))
      .filter((r): r is ScoredRatio => r !== undefined);

    if (catRatios.length === 0)
      return { name: cat.name, score: 50, weight: cat.weight }; // neutral if no data

    const avgPoints =
      catRatios.reduce((sum, r) => sum + STATUS_POINTS[r.status], 0) /
      catRatios.length;
    return { name: cat.name, score: Math.round(avgPoints), weight: cat.weight };
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
