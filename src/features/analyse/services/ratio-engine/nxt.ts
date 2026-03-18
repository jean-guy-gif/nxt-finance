// ============================================
// NXT Finance V3.5 — Ratio Engine: NXT
// Ratios calculés depuis les données NXT (recettes, dépenses, collaborateurs)
// Inclut les indicateurs opérationnels immobilier (N6-N14)
// ============================================

import type { SupabaseClient } from '@supabase/supabase-js';

interface RatioResult {
  key: string;
  value: number;
  formulaKey: string;
  source: 'nxt';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Revenue type → bucket mapping for ventilation
const TYPE_BUCKETS: Record<string, string> = {
  honoraires_transaction: 'transaction',
  commission: 'transaction',
  honoraires_gestion: 'gestion',
  honoraires_location: 'location',
  frais_dossier: 'autre',
  autre_recette: 'autre',
};

export async function computeNxtRatios(
  supabase: SupabaseClient,
  agencyId: string,
  fiscalYear: number
): Promise<RatioResult[]> {
  const ratios: RatioResult[] = [];
  const startDate = `${fiscalYear}-01-01`;
  const endDate = `${fiscalYear}-12-31`;

  // Fetch revenues for the fiscal year (with date + status for encaissement calc)
  const { data: revenues } = await supabase
    .from('revenues')
    .select('id, amount, amount_ht, type, status, date, updated_at')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['validated', 'collected', 'transmitted']);

  // Fetch expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount_ttc, amount_ht, category')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lte('date', endDate);

  // Fetch active collaborators
  const { data: collaborators } = await supabase
    .from('collaborators')
    .select(
      'id, type, status, salary_gross_monthly, employer_total_cost_monthly'
    )
    .eq('agency_id', agencyId)
    .eq('status', 'active');

  // Fetch commission splits for the fiscal year (for concentration_ca_top3)
  const { data: splits } = await supabase
    .from('commission_splits')
    .select('collaborator_id, gross_amount, revenue:revenues!inner(date, agency_id)')
    .eq('revenue.agency_id', agencyId)
    .gte('revenue.date', startDate)
    .lte('revenue.date', endDate);

  const revenueRows = revenues ?? [];
  const expenseRows = expenses ?? [];
  const collabRows = collaborators ?? [];
  const splitRows = splits ?? [];

  // ================================================================
  // N1: CA total HT
  // ================================================================
  const caHt = revenueRows.reduce(
    (sum, r) => sum + Number(r.amount_ht ?? r.amount ?? 0),
    0
  );
  ratios.push({
    key: 'ca_total_ht',
    value: round2(caHt),
    formulaKey:
      'sum(revenues.amount_ht) status in validated/collected/transmitted',
    source: 'nxt',
  });

  // ================================================================
  // N2: Charges totales TTC
  // ================================================================
  const chargesTotales = expenseRows.reduce(
    (sum, e) => sum + Number(e.amount_ttc ?? 0),
    0
  );
  ratios.push({
    key: 'charges_total_ttc',
    value: round2(chargesTotales),
    formulaKey: 'sum(expenses.amount_ttc)',
    source: 'nxt',
  });

  // ================================================================
  // N3: Ratio masse salariale
  // ================================================================
  const masseSalariale = collabRows
    .filter((c) => c.type === 'salarie')
    .reduce(
      (sum, c) => sum + Number(c.employer_total_cost_monthly ?? 0) * 12,
      0
    );
  if (caHt > 0) {
    ratios.push({
      key: 'ratio_masse_salariale',
      value: round2((masseSalariale / caHt) * 100),
      formulaKey:
        'sum(employer_total_cost * 12 for salariés) / ca_total_ht * 100',
      source: 'nxt',
    });
  }

  // ================================================================
  // N4: CA par collaborateur
  // ================================================================
  const nbCollabs = collabRows.length;
  if (nbCollabs > 0) {
    ratios.push({
      key: 'ca_par_collaborateur',
      value: round2(caHt / nbCollabs),
      formulaKey: 'ca_total_ht / nb_collaborateurs_actifs',
      source: 'nxt',
    });
  }

  // ================================================================
  // N5: Marge opérationnelle NXT
  // ================================================================
  if (caHt > 0) {
    const margeOp = round2(((caHt - chargesTotales) / caHt) * 100);
    ratios.push({
      key: 'marge_operationnelle_nxt',
      value: margeOp,
      formulaKey: '(ca_total_ht - charges_total_ttc) / ca_total_ht * 100',
      source: 'nxt',
    });
  }

  // ================================================================
  // N6: Nombre de transactions (total + par type)
  // ================================================================
  const bucketCounts: Record<string, number> = { transaction: 0, gestion: 0, location: 0, autre: 0 };
  const bucketCa: Record<string, number> = { transaction: 0, gestion: 0, location: 0, autre: 0 };

  for (const r of revenueRows) {
    const bucket = TYPE_BUCKETS[r.type] ?? 'autre';
    bucketCounts[bucket]++;
    bucketCa[bucket] += Number(r.amount_ht ?? r.amount ?? 0);
  }

  const nbTotal = revenueRows.length;
  ratios.push({
    key: 'nb_transactions_total',
    value: nbTotal,
    formulaKey: 'count(revenues) status in validated/collected/transmitted',
    source: 'nxt',
  });
  for (const bucket of ['transaction', 'gestion', 'location'] as const) {
    ratios.push({
      key: `nb_transactions_${bucket}`,
      value: bucketCounts[bucket],
      formulaKey: `count(revenues) type bucket=${bucket}`,
      source: 'nxt',
    });
  }

  // ================================================================
  // N7: Panier moyen (global + par type)
  // ================================================================
  if (nbTotal > 0) {
    ratios.push({
      key: 'panier_moyen_global',
      value: round2(caHt / nbTotal),
      formulaKey: 'ca_total_ht / nb_transactions_total',
      source: 'nxt',
    });
  }
  for (const bucket of ['transaction', 'gestion', 'location'] as const) {
    if (bucketCounts[bucket] > 0) {
      ratios.push({
        key: `panier_moyen_${bucket}`,
        value: round2(bucketCa[bucket] / bucketCounts[bucket]),
        formulaKey: `ca_${bucket} / nb_transactions_${bucket}`,
        source: 'nxt',
      });
    }
  }

  // ================================================================
  // N8: Taux de récurrence
  // ================================================================
  if (caHt > 0) {
    const caRecurrent = bucketCa.gestion + bucketCa.location;
    ratios.push({
      key: 'taux_recurrence',
      value: round2((caRecurrent / caHt) * 100),
      formulaKey: '(ca_gestion + ca_location) / ca_total * 100',
      source: 'nxt',
    });
  }

  // ================================================================
  // N9: Concentration CA top 3
  // ================================================================
  if (caHt > 0) {
    // Aggregate gross_amount per collaborator from commission splits
    const caByCollab = new Map<string, number>();
    for (const s of splitRows) {
      const id = s.collaborator_id;
      caByCollab.set(id, (caByCollab.get(id) ?? 0) + Number(s.gross_amount ?? 0));
    }

    // If no splits, fall back: fewer than 3 collabs = 100%
    if (caByCollab.size > 0) {
      const sorted = [...caByCollab.values()].sort((a, b) => b - a);
      const top3Sum = sorted.slice(0, 3).reduce((s, v) => s + v, 0);
      ratios.push({
        key: 'concentration_ca_top3',
        value: round2((top3Sum / caHt) * 100),
        formulaKey: 'sum(top3_collaborators_ca) / ca_total * 100',
        source: 'nxt',
      });
    } else if (nbCollabs > 0 && nbCollabs < 3) {
      ratios.push({
        key: 'concentration_ca_top3',
        value: 100,
        formulaKey: 'less_than_3_collaborators → 100%',
        source: 'nxt',
      });
    }
  }

  // ================================================================
  // N10: Délai d'encaissement moyen
  // TODO: updated_at est utilisé comme proxy de date d'encaissement.
  // En l'absence d'un champ collected_at dédié, cette approximation
  // donne le délai entre la date de facture et le dernier update du statut.
  // ================================================================
  const MAX_DELAI_JOURS = 90; // Cap pour données démo (updated_at peut être décalé)
  const collectedRevenues = revenueRows.filter((r) => r.status === 'collected' && r.updated_at);
  if (collectedRevenues.length > 0) {
    let totalDays = 0;
    let validCount = 0;
    for (const r of collectedRevenues) {
      const dateFacture = new Date(r.date).getTime();
      const dateEncaissement = new Date(r.updated_at).getTime();
      const days = Math.min(MAX_DELAI_JOURS, Math.max(0, (dateEncaissement - dateFacture) / (1000 * 60 * 60 * 24)));
      totalDays += days;
      validCount++;
    }
    if (validCount > 0) {
      ratios.push({
        key: 'delai_encaissement_moyen',
        value: round2(totalDays / validCount),
        formulaKey: 'avg(min(90, updated_at - date)) for collected revenues, in days',
        source: 'nxt',
      });
    }
  }

  // ================================================================
  // N11: Ventilation CA par type (part en %)
  // ================================================================
  if (caHt > 0) {
    for (const bucket of ['transaction', 'gestion', 'location'] as const) {
      ratios.push({
        key: `part_ca_${bucket}`,
        value: round2((bucketCa[bucket] / caHt) * 100),
        formulaKey: `ca_${bucket} / ca_total * 100`,
        source: 'nxt',
      });
    }
  }

  // ================================================================
  // N12: Ratio charges fixes / CA
  // ================================================================
  const FIXED_CHARGE_CATEGORIES = new Set([
    'loyer_charges',
    'assurances',
    'logiciels_abonnements',
    'telephonie_internet',
  ]);

  const chargesFixes = expenseRows
    .filter((e) => FIXED_CHARGE_CATEGORIES.has(e.category))
    .reduce((sum, e) => sum + Number(e.amount_ttc ?? 0), 0);

  if (caHt > 0) {
    ratios.push({
      key: 'ratio_charges_fixes_ca',
      value: round2((chargesFixes / caHt) * 100),
      formulaKey: 'charges_fixes / ca_total_ht * 100',
      source: 'nxt',
    });
  }

  // ================================================================
  // N13: Point mort mensuel
  // ================================================================
  const margeOpRatio = caHt > 0 ? (caHt - chargesTotales) / caHt : 0;
  if (margeOpRatio > 0) {
    const chargesFixesMensuelles = chargesFixes / 12;
    ratios.push({
      key: 'point_mort_mensuel',
      value: round2(chargesFixesMensuelles / margeOpRatio),
      formulaKey: '(charges_fixes / 12) / (marge_operationnelle_nxt / 100)',
      source: 'nxt',
    });
  }

  // ================================================================
  // N14: Runway trésorerie
  // ================================================================
  // Trésorerie = CA encaissé - charges payées (simplifié)
  const caEncaisse = revenueRows
    .filter((r) => r.status === 'collected')
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const chargesMensuelles = chargesTotales > 0 ? chargesTotales / 12 : 0;

  if (chargesMensuelles > 0) {
    // Fetch all-time collected revenues and validated expenses for true treasury
    const { data: allCollected } = await supabase
      .from('revenues')
      .select('amount')
      .eq('agency_id', agencyId)
      .eq('status', 'collected');

    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('amount_ttc')
      .eq('agency_id', agencyId)
      .in('status', ['validated', 'transmitted']);

    const totalIn = (allCollected ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const totalOut = (allExpenses ?? []).reduce((s, e) => s + Number(e.amount_ttc ?? 0), 0);
    const treasury = totalIn - totalOut;

    if (treasury > 0) {
      ratios.push({
        key: 'runway_tresorerie',
        value: round2(treasury / chargesMensuelles),
        formulaKey: 'tresorerie_disponible / charges_mensuelles_moyennes',
        source: 'nxt',
      });
    } else {
      ratios.push({
        key: 'runway_tresorerie',
        value: round2(treasury / chargesMensuelles),
        formulaKey: 'tresorerie_disponible / charges_mensuelles_moyennes',
        source: 'nxt',
      });
    }
  }

  return ratios;
}
