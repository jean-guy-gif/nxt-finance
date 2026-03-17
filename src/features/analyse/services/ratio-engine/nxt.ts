// ============================================
// NXT Finance V3.3 — Ratio Engine: NXT
// Ratios calculés depuis les données NXT (recettes, dépenses, collaborateurs)
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

export async function computeNxtRatios(
  supabase: SupabaseClient,
  agencyId: string,
  fiscalYear: number
): Promise<RatioResult[]> {
  const ratios: RatioResult[] = [];
  const startDate = `${fiscalYear}-01-01`;
  const endDate = `${fiscalYear}-12-31`;

  // Fetch revenues for the fiscal year
  const { data: revenues } = await supabase
    .from('revenues')
    .select('amount, amount_ht, type, status')
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

  const revenueRows = revenues ?? [];
  const expenseRows = expenses ?? [];
  const collabRows = collaborators ?? [];

  // N1: CA total HT
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

  // N2: Charges totales TTC
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

  // N3: Ratio masse salariale
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

  // N4: CA par collaborateur
  const nbCollabs = collabRows.length;
  if (nbCollabs > 0) {
    ratios.push({
      key: 'ca_par_collaborateur',
      value: round2(caHt / nbCollabs),
      formulaKey: 'ca_total_ht / nb_collaborateurs_actifs',
      source: 'nxt',
    });
  }

  // N5: Marge opérationnelle NXT
  if (caHt > 0) {
    ratios.push({
      key: 'marge_operationnelle_nxt',
      value: round2(((caHt - chargesTotales) / caHt) * 100),
      formulaKey: '(ca_total_ht - charges_total_ttc) / ca_total_ht * 100',
      source: 'nxt',
    });
  }

  return ratios;
}
