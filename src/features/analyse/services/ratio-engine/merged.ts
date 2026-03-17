// ============================================
// NXT Finance V3.3 — Ratio Engine: Merged
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

  // M1: Couverture charges réelles
  const chargesNxt = nxtRatios.get('charges_total_ttc') ?? 0;
  const ratioChargesBilan = bilanRatios.get('ratio_charges_ca');
  if (chargesNxt > 0 && ratioChargesBilan !== undefined) {
    ratios.push({
      key: 'couverture_charges',
      value: round2(chargesNxt > 0 ? 100 : 0), // placeholder — will be enriched in analysis-engine
      formulaKey: 'charges_nxt vs charges_bilan coherence',
      source: 'computed',
    });
  }

  return ratios;
}
