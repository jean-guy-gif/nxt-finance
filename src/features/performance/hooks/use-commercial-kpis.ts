'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useUiStore } from '@/stores/ui-store';
import {
  fetchKpisByPeriod,
  fetchKpisByChannel,
  fetchAcquisitionChannels,
  upsertKpis,
  type UpsertKpiInput,
} from '../services/commercial-kpis-service';

export function useCommercialKpis(year?: number) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const selectedYear = useUiStore((s) => s.selectedYear);
  const targetYear = year ?? selectedYear;

  return useQuery({
    queryKey: ['commercial-kpis', agencyId, targetYear],
    queryFn: () => {
      const supabase = createClient();
      return fetchKpisByPeriod(supabase, agencyId!, targetYear);
    },
    enabled: !!agencyId,
  });
}

export function useCommercialKpisByChannel(year?: number) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const selectedYear = useUiStore((s) => s.selectedYear);
  const targetYear = year ?? selectedYear;

  return useQuery({
    queryKey: ['commercial-kpis-channels', agencyId, targetYear],
    queryFn: () => {
      const supabase = createClient();
      return fetchKpisByChannel(supabase, agencyId!, targetYear);
    },
    enabled: !!agencyId,
  });
}

export function useAcquisitionChannels() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['acquisition-channels', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchAcquisitionChannels(supabase, agencyId!);
    },
    enabled: !!agencyId,
  });
}

export function useUpsertCommercialKpis() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);

  return useMutation({
    mutationFn: (data: Omit<UpsertKpiInput, 'agency_id'>[]) => {
      const supabase = createClient();
      return upsertKpis(
        supabase,
        agencyId!,
        data.map((d) => ({ ...d, agency_id: agencyId! }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['commercial-kpis-channels'] });
    },
  });
}
