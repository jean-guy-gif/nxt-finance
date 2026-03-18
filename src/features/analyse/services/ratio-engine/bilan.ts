// ============================================
// NXT Finance V3.3 — Ratio Engine: Bilan
// Ratios déterministes calculés depuis les postes du bilan
// ============================================

import type { BalanceSheetItem } from '@/types/models';

interface RatioResult {
  key: string;
  value: number;
  formulaKey: string;
  source: 'bilan';
}

// Helper: sum amounts for a given section
function sumSection(items: BalanceSheetItem[], section: string): number {
  return items
    .filter((i) => i.section === section)
    .reduce((sum, i) => sum + Number(i.amount), 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeBilanRatios(items: BalanceSheetItem[]): RatioResult[] {
  const ratios: RatioResult[] = [];

  const prodExpl = sumSection(items, 'produits_exploitation');
  const chargesExpl = sumSection(items, 'charges_exploitation');
  const prodFin = sumSection(items, 'produits_financiers');
  const chargesFin = sumSection(items, 'charges_financieres');
  const prodExcep = sumSection(items, 'produits_exceptionnels');
  const chargesExcep = sumSection(items, 'charges_exceptionnelles');

  const totalProduits = prodExpl + prodFin + prodExcep;
  const totalCharges = chargesExpl + chargesFin + chargesExcep;
  const resultatNet = totalProduits - totalCharges;

  const actifCirculant = sumSection(items, 'actif_circulant');
  const capitauxPropres = sumSection(items, 'capitaux_propres');
  const dettes = sumSection(items, 'dettes');

  // B1: Marge nette
  if (prodExpl > 0) {
    ratios.push({
      key: 'marge_nette',
      value: round2((resultatNet / prodExpl) * 100),
      formulaKey: 'resultat_net / produits_exploitation * 100',
      source: 'bilan',
    });
  }

  // B2: Marge brute
  if (prodExpl > 0) {
    const margeBrute = prodExpl - chargesExpl + prodFin - chargesFin;
    ratios.push({
      key: 'marge_brute',
      value: round2((margeBrute / prodExpl) * 100),
      formulaKey:
        '(produits_exploitation - charges_exploitation + produits_financiers - charges_financieres) / produits_exploitation * 100',
      source: 'bilan',
    });
  }

  // B3: Taux d'endettement
  if (capitauxPropres > 0) {
    ratios.push({
      key: 'taux_endettement',
      value: round2((dettes / capitauxPropres) * 100),
      formulaKey: 'dettes / capitaux_propres * 100',
      source: 'bilan',
    });
  }

  // B4: Ratio de liquidité
  if (dettes > 0) {
    ratios.push({
      key: 'ratio_liquidite',
      value: round2(actifCirculant / dettes),
      formulaKey: 'actif_circulant / dettes',
      source: 'bilan',
    });
  }

  // B5: BFR en jours
  if (prodExpl > 0) {
    const bfr = actifCirculant - dettes;
    ratios.push({
      key: 'bfr_jours',
      value: round2(bfr / (prodExpl / 365)),
      formulaKey: '(actif_circulant - dettes) / (produits_exploitation / 365)',
      source: 'bilan',
    });
  }

  // B6: Capacité d'autofinancement (simplified: résultat net)
  ratios.push({
    key: 'capacite_autofinancement',
    value: round2(resultatNet),
    formulaKey: 'resultat_net (simplifié)',
    source: 'bilan',
  });

  // B7: Ratio charges/CA
  if (prodExpl > 0) {
    ratios.push({
      key: 'ratio_charges_ca',
      value: round2((totalCharges / prodExpl) * 100),
      formulaKey: 'total_charges / produits_exploitation * 100',
      source: 'bilan',
    });
  }

  // B8: Résultat net (absolute)
  ratios.push({
    key: 'resultat_net',
    value: round2(resultatNet),
    formulaKey: 'total_produits - total_charges',
    source: 'bilan',
  });

  // B9: Produits d'exploitation (for merged ratios cross-check)
  ratios.push({
    key: 'produits_exploitation_bilan',
    value: round2(prodExpl),
    formulaKey: 'sum(items.amount) section=produits_exploitation',
    source: 'bilan',
  });

  // B10: Total charges bilan (for merged ratios cross-check)
  ratios.push({
    key: 'total_charges_bilan',
    value: round2(totalCharges),
    formulaKey: 'sum(charges_exploitation + charges_financieres + charges_exceptionnelles)',
    source: 'bilan',
  });

  return ratios;
}

// Compute N-1 ratios if items have amount_n_minus_1
export function computeBilanRatiosNMinus1(
  items: BalanceSheetItem[]
): Map<string, number> {
  // Create virtual items with amount_n_minus_1 as amount
  const nMinus1Items = items
    .filter((i) => i.amount_n_minus_1 != null)
    .map((i) => ({ ...i, amount: i.amount_n_minus_1! }));

  if (nMinus1Items.length === 0) return new Map();

  const ratios = computeBilanRatios(nMinus1Items as BalanceSheetItem[]);
  return new Map(ratios.map((r) => [r.key, r.value]));
}
