// ============================================
// NXT Finance V3.5 — M7 Performance Engine
// Unit Economics + ROI par canal
// 100% déterministe — pas de LLM
// ============================================

import type { SupabaseClient } from '@supabase/supabase-js';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Marketing expense categories
const MARKETING_CATEGORIES = ['publicite_marketing'];

// ============================================
// Types
// ============================================

export interface UnitEconomics {
  period: { startDate: string; endDate: string; label: string };

  // Inputs
  depenses_marketing: number;
  charges_totales: number;
  ca_total: number;
  nb_contacts: number;
  nb_estimations: number;
  nb_mandats: number;
  nb_compromis: number;
  nb_actes: number;

  // Bloc 1 — Coûts d'acquisition marketing
  cout_par_contact: number | null;
  cout_par_estimation: number | null;
  cout_par_mandat: number | null;
  cout_par_compromis: number | null;
  cout_par_acte: number | null;

  // Bloc 2 — Coûts complets par étape
  cout_complet_par_mandat: number | null;
  cout_complet_par_compromis: number | null;
  cout_complet_par_acte: number | null;

  // Bloc 3 — Rentabilité et ROI
  ca_moyen_par_compromis: number | null;
  ca_moyen_par_acte: number | null;
  ca_moyen_par_mandat: number | null;
  marge_par_vente: number | null;
  roi_marketing_global: number | null;

  // Bloc 4 — Taux de conversion valorisés
  contacts_par_estimation: number | null;
  estimations_par_mandat: number | null;
  mandats_par_compromis: number | null;
  compromis_par_acte: number | null;
  contacts_par_vente: number | null;
  cout_acquisition_par_euro_ca: number | null;

  // Bloc 5 — Par canal
  channels: ChannelUnitEconomics[];
  has_channel_data: boolean;
}

export interface ChannelUnitEconomics {
  channel: string;
  depenses: number;
  contacts: number;
  estimations: number;
  mandats: number;
  compromis: number;
  actes: number;
  ca: number;
  cout_par_contact: number | null;
  cout_par_compromis: number | null;
  roi: number | null;
}

// ============================================
// Main computation
// ============================================

export async function computeUnitEconomics(
  supabase: SupabaseClient,
  agencyId: string,
  startDate: string,
  endDate: string,
  periodLabel: string
): Promise<UnitEconomics> {
  // 1. Fetch marketing expenses
  const { data: marketingExpenses } = await supabase
    .from('expenses')
    .select('amount_ttc, acquisition_channel')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate)
    .in('category', MARKETING_CATEGORIES);

  // 2. Fetch all expenses (charges totales)
  const { data: allExpenses } = await supabase
    .from('expenses')
    .select('amount_ttc')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate);

  // 3. Fetch revenues (CA)
  const { data: revenues } = await supabase
    .from('revenues')
    .select('amount_ht, amount')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lt('date', endDate)
    .in('status', ['validated', 'collected', 'transmitted']);

  // 4. Fetch commercial KPIs — aggregate from monthly data
  // Parse start/end to get month/year range
  const startYear = parseInt(startDate.slice(0, 4));
  const startMonth = parseInt(startDate.slice(5, 7));
  const endYear = parseInt(endDate.slice(0, 4));
  const endMonth = parseInt(endDate.slice(5, 7));

  let kpiQuery = supabase
    .from('commercial_kpis')
    .select('*')
    .eq('agency_id', agencyId)
    .is('source_channel', null); // Total rows

  // Filter by period
  if (startYear === endYear) {
    kpiQuery = kpiQuery
      .eq('period_year', startYear)
      .gte('period_month', startMonth)
      .lt('period_month', endMonth || 13);
  } else {
    // Cross-year: fetch all and filter in JS
    kpiQuery = kpiQuery
      .gte('period_year', startYear)
      .lte('period_year', endYear);
  }

  const { data: kpis } = await kpiQuery;

  // 5. Fetch channel KPIs
  let channelKpiQuery = supabase
    .from('commercial_kpis')
    .select('*')
    .eq('agency_id', agencyId)
    .not('source_channel', 'is', null);

  if (startYear === endYear) {
    channelKpiQuery = channelKpiQuery
      .eq('period_year', startYear)
      .gte('period_month', startMonth)
      .lt('period_month', endMonth || 13);
  } else {
    channelKpiQuery = channelKpiQuery
      .gte('period_year', startYear)
      .lte('period_year', endYear);
  }

  const { data: channelKpis } = await channelKpiQuery;

  // ============================================
  // Aggregate inputs
  // ============================================

  const depenses_marketing = (marketingExpenses ?? []).reduce(
    (s, e) => s + Number(e.amount_ttc ?? 0), 0
  );

  const charges_totales = (allExpenses ?? []).reduce(
    (s, e) => s + Number(e.amount_ttc ?? 0), 0
  );

  const ca_total = (revenues ?? []).reduce(
    (s, r) => s + Number(r.amount_ht ?? r.amount ?? 0), 0
  );

  // Filter KPIs by actual month range (for cross-year)
  const filteredKpis = (kpis ?? []).filter((k) => {
    if (k.period_year === startYear && k.period_month < startMonth) return false;
    if (k.period_year === endYear && endMonth > 0 && k.period_month >= endMonth) return false;
    return true;
  });

  const nb_contacts = filteredKpis.reduce((s, k) => s + k.nb_contacts, 0);
  const nb_estimations = filteredKpis.reduce((s, k) => s + k.nb_estimations, 0);
  const nb_mandats = filteredKpis.reduce((s, k) => s + k.nb_mandats, 0);
  const nb_compromis = filteredKpis.reduce((s, k) => s + k.nb_compromis, 0);
  const nb_actes = filteredKpis.reduce((s, k) => s + k.nb_actes, 0);

  // ============================================
  // Bloc 1 — Coûts d'acquisition marketing
  // ============================================
  const cout_par_contact = nb_contacts > 0 ? round2(depenses_marketing / nb_contacts) : null;
  const cout_par_estimation = nb_estimations > 0 ? round2(depenses_marketing / nb_estimations) : null;
  const cout_par_mandat = nb_mandats > 0 ? round2(depenses_marketing / nb_mandats) : null;
  const cout_par_compromis = nb_compromis > 0 ? round2(depenses_marketing / nb_compromis) : null;
  const cout_par_acte_mkt = nb_actes > 0 ? round2(depenses_marketing / nb_actes) : null;

  // ============================================
  // Bloc 2 — Coûts complets
  // ============================================
  const cout_complet_par_mandat = nb_mandats > 0 ? round2(charges_totales / nb_mandats) : null;
  const cout_complet_par_compromis = nb_compromis > 0 ? round2(charges_totales / nb_compromis) : null;
  const cout_complet_par_acte = nb_actes > 0 ? round2(charges_totales / nb_actes) : null;

  // ============================================
  // Bloc 3 — Rentabilité et ROI
  // ============================================
  const ca_moyen_par_compromis = nb_compromis > 0 ? round2(ca_total / nb_compromis) : null;
  const ca_moyen_par_acte = nb_actes > 0 ? round2(ca_total / nb_actes) : null;
  const ca_moyen_par_mandat = nb_mandats > 0 ? round2(ca_total / nb_mandats) : null;
  const marge_par_vente = ca_moyen_par_acte != null && cout_complet_par_acte != null
    ? round2(ca_moyen_par_acte - cout_complet_par_acte)
    : null;
  const roi_marketing_global = depenses_marketing > 0 ? round2(ca_total / depenses_marketing) : null;

  // ============================================
  // Bloc 4 — Taux de conversion
  // ============================================
  const contacts_par_estimation = nb_estimations > 0 ? round2(nb_contacts / nb_estimations) : null;
  const estimations_par_mandat = nb_mandats > 0 ? round2(nb_estimations / nb_mandats) : null;
  const mandats_par_compromis = nb_compromis > 0 ? round2(nb_mandats / nb_compromis) : null;
  const compromis_par_acte = nb_actes > 0 ? round2(nb_compromis / nb_actes) : null;
  const contacts_par_vente = nb_actes > 0 ? round2(nb_contacts / nb_actes) : null;
  const cout_acquisition_par_euro_ca = ca_total > 0
    ? round2((depenses_marketing / ca_total) * 100)
    : null;

  // ============================================
  // Bloc 5 — Par canal
  // ============================================
  const marketingRows = marketingExpenses ?? [];
  const channelExpenses = new Map<string, number>();
  for (const e of marketingRows) {
    const ch = e.acquisition_channel;
    if (ch) {
      channelExpenses.set(ch, (channelExpenses.get(ch) ?? 0) + Number(e.amount_ttc ?? 0));
    }
  }

  // Aggregate channel KPIs
  const filteredChannelKpis = (channelKpis ?? []).filter((k) => {
    if (k.period_year === startYear && k.period_month < startMonth) return false;
    if (k.period_year === endYear && endMonth > 0 && k.period_month >= endMonth) return false;
    return true;
  });

  const channelKpiAgg = new Map<string, { contacts: number; estimations: number; mandats: number; compromis: number; actes: number; ca: number }>();
  for (const k of filteredChannelKpis) {
    const ch = k.source_channel ?? '';
    const prev = channelKpiAgg.get(ch) ?? { contacts: 0, estimations: 0, mandats: 0, compromis: 0, actes: 0, ca: 0 };
    channelKpiAgg.set(ch, {
      contacts: prev.contacts + k.nb_contacts,
      estimations: prev.estimations + k.nb_estimations,
      mandats: prev.mandats + k.nb_mandats,
      compromis: prev.compromis + k.nb_compromis,
      actes: prev.actes + k.nb_actes,
      ca: prev.ca + Number(k.ca_generated ?? 0),
    });
  }

  // Build channel unit economics
  const allChannels = new Set([...channelExpenses.keys(), ...channelKpiAgg.keys()]);
  const channels: ChannelUnitEconomics[] = [];

  for (const ch of allChannels) {
    const dep = channelExpenses.get(ch) ?? 0;
    const kpiData = channelKpiAgg.get(ch) ?? { contacts: 0, estimations: 0, mandats: 0, compromis: 0, actes: 0, ca: 0 };

    channels.push({
      channel: ch,
      depenses: round2(dep),
      contacts: kpiData.contacts,
      estimations: kpiData.estimations,
      mandats: kpiData.mandats,
      compromis: kpiData.compromis,
      actes: kpiData.actes,
      ca: round2(kpiData.ca),
      cout_par_contact: dep > 0 && kpiData.contacts > 0 ? round2(dep / kpiData.contacts) : null,
      cout_par_compromis: dep > 0 && kpiData.compromis > 0 ? round2(dep / kpiData.compromis) : null,
      roi: dep > 0 && kpiData.ca > 0 ? round2(kpiData.ca / dep) : null,
    });
  }

  // Sort by CA desc
  channels.sort((a, b) => b.ca - a.ca);

  return {
    period: { startDate, endDate, label: periodLabel },
    depenses_marketing: round2(depenses_marketing),
    charges_totales: round2(charges_totales),
    ca_total: round2(ca_total),
    nb_contacts,
    nb_estimations,
    nb_mandats,
    nb_compromis,
    nb_actes,
    cout_par_contact,
    cout_par_estimation,
    cout_par_mandat,
    cout_par_compromis,
    cout_par_acte: cout_par_acte_mkt,
    cout_complet_par_mandat,
    cout_complet_par_compromis,
    cout_complet_par_acte,
    ca_moyen_par_compromis,
    ca_moyen_par_acte,
    ca_moyen_par_mandat,
    marge_par_vente,
    roi_marketing_global,
    contacts_par_estimation,
    estimations_par_mandat,
    mandats_par_compromis,
    compromis_par_acte,
    contacts_par_vente,
    cout_acquisition_par_euro_ca,
    channels,
    has_channel_data: channelExpenses.size > 0,
  };
}
