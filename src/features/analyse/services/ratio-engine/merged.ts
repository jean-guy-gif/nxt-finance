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

  const caBilan = bilanRatios.get('ca_total_ht') // bilan may store this differently
    ?? bilanRatios.get('resultat_net') // fallback: we need produits_exploitation
    ?? null;
  const caNxt = nxtRatios.get('ca_total_ht') ?? null;

  // For bilan CA, we need the produits_exploitation which is computed as
  // sum of produits items. The bilan ratio engine doesn't export it directly,
  // so we reconstruct from resultat_net + charges if available.
  // Better approach: use the raw total from the bilan computation.
  // We look for a specific key that the bilan engine stores.

  // M1: Cohérence CA (bilan vs NXT)
  // We use the bilan's marge_brute denominator (CA) if available
  // Since bilan.ts computes resultat_net and marge_nette = resultat_net / produitsExpl * 100,
  // we can derive produitsExpl = resultat_net / (marge_nette / 100)
  const margeNette = bilanRatios.get('marge_nette');
  const resultatNet = bilanRatios.get('resultat_net');

  let produitsExplBilan: number | null = null;
  if (margeNette !== undefined && margeNette !== 0 && resultatNet !== undefined) {
    produitsExplBilan = round2(resultatNet / (margeNette / 100));
  }

  if (produitsExplBilan !== null && produitsExplBilan > 0 && caNxt !== null && caNxt > 0) {
    const ecart = Math.abs(produitsExplBilan - caNxt) / Math.max(produitsExplBilan, caNxt) * 100;
    ratios.push({
      key: 'coherence_ca',
      value: round2(ecart),
      formulaKey: 'abs(ca_bilan - ca_nxt) / max(ca_bilan, ca_nxt) * 100',
      source: 'computed',
    });
  }

  // M2: Couverture charges réelles (NXT vs bilan)
  const chargesNxt = nxtRatios.get('charges_total_ttc');
  const ratioChargesCa = bilanRatios.get('ratio_charges_ca');

  // Reconstruct total charges from bilan: ratio_charges_ca = total_charges / produitsExpl * 100
  let chargesBilan: number | null = null;
  if (ratioChargesCa !== undefined && produitsExplBilan !== null && produitsExplBilan > 0) {
    chargesBilan = round2((ratioChargesCa / 100) * produitsExplBilan);
  }

  if (chargesNxt !== undefined && chargesNxt > 0 && chargesBilan !== null && chargesBilan > 0) {
    ratios.push({
      key: 'couverture_charges_reelles',
      value: round2((chargesNxt / chargesBilan) * 100),
      formulaKey: 'charges_nxt / charges_bilan * 100',
      source: 'computed',
    });
  }

  return ratios;
}
