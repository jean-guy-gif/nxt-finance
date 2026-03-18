import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommercialKpi, AcquisitionChannel } from '@/types/models';

// ============================================
// Commercial KPIs CRUD service
// ============================================

export async function fetchKpisByPeriod(
  supabase: SupabaseClient,
  agencyId: string,
  year: number
): Promise<CommercialKpi[]> {
  const { data, error } = await supabase
    .from('commercial_kpis')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('period_year', year)
    .is('source_channel', null) // Total row only
    .order('period_month');

  if (error) throw error;
  return (data ?? []) as CommercialKpi[];
}

export async function fetchKpisByChannel(
  supabase: SupabaseClient,
  agencyId: string,
  year: number
): Promise<CommercialKpi[]> {
  const { data, error } = await supabase
    .from('commercial_kpis')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('period_year', year)
    .not('source_channel', 'is', null) // Channel rows only
    .order('period_month')
    .order('source_channel');

  if (error) throw error;
  return (data ?? []) as CommercialKpi[];
}

export interface UpsertKpiInput {
  agency_id: string;
  period_month: number;
  period_year: number;
  source_channel: string | null;
  nb_contacts: number;
  nb_estimations: number;
  nb_mandats: number;
  nb_compromis: number;
  nb_actes: number;
  ca_generated?: number | null;
  source_system?: string;
  notes?: string | null;
}

export async function upsertKpis(
  supabase: SupabaseClient,
  agencyId: string,
  data: UpsertKpiInput[]
): Promise<void> {
  const rows = data.map((d) => ({
    ...d,
    agency_id: agencyId,
    source_system: d.source_system ?? 'manual',
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('commercial_kpis')
    .upsert(rows, {
      onConflict: 'agency_id,period_month,period_year,source_channel',
    });

  if (error) throw error;
}

export async function deleteKpi(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('commercial_kpis')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================
// Acquisition Channels
// ============================================

export async function fetchAcquisitionChannels(
  supabase: SupabaseClient,
  agencyId: string
): Promise<AcquisitionChannel[]> {
  const { data, error } = await supabase
    .from('acquisition_channels')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return (data ?? []) as AcquisitionChannel[];
}
