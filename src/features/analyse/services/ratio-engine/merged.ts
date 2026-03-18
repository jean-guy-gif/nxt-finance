// ============================================
// NXT Finance V3.5 — Ratio Engine: Merged
// Ratios croisés bilan + NXT
// ============================================

interface RatioResult {
  key: string;
  value: number;
  formulaKey: string;
  source: 'computed';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Takes both bilan and nxt ratios as Maps, produces merged ratios
export function computeMergedRatios(
  bilanRatios: Map<string, number>,
  nxtRatios: Map<string, number>
): RatioResult[] {
  const ratios: RatioResult[] = [];

  // Use the directly persisted bilan values
  const produitsExplBilan = bilanRatios.get('produits_exploitation_bilan');
  const caNxt = nxtRatios.get('ca_total_ht');

  // M1: Cohérence CA (bilan vs NXT)
  if (produitsExplBilan != null && produitsExplBilan > 0 && caNxt != null && caNxt > 0) {
    const ecart = Math.abs(produitsExplBilan - caNxt) / Math.max(produitsExplBilan, caNxt) * 100;
    ratios.push({
      key: 'coherence_ca',
      value: round2(ecart),
      formulaKey: 'abs(produits_exploitation_bilan - ca_nxt) / max(produits_exploitation_bilan, ca_nxt) * 100',
      source: 'computed',
    });
  }

  // M2: Couverture charges réelles (NXT vs bilan)
  const chargesNxt = nxtRatios.get('charges_total_ttc');
  const chargesBilan = bilanRatios.get('total_charges_bilan');

  if (chargesNxt != null && chargesNxt > 0 && chargesBilan != null && chargesBilan > 0) {
    ratios.push({
      key: 'couverture_charges_reelles',
      value: round2((chargesNxt / chargesBilan) * 100),
      formulaKey: 'charges_nxt / total_charges_bilan * 100',
      source: 'computed',
    });
  }

  return ratios;
}
