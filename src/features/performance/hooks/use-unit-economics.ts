'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useUiStore } from '@/stores/ui-store';
import { getDateRange } from '@/lib/period-utils';
import { computeUnitEconomics } from '../services/performance-engine';

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Mois en cours',
  quarterly: 'Trimestre en cours',
  yearly: 'Année en cours',
};

export function useUnitEconomics() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const month = useUiStore((s) => s.selectedMonth);
  const year = useUiStore((s) => s.selectedYear);
  const periodView = useUiStore((s) => s.periodView);
  const { startDate, endDate } = getDateRange(periodView, month, year);

  return useQuery({
    queryKey: ['unit-economics', agencyId, periodView, month, year],
    queryFn: () => {
      const supabase = createClient();
      return computeUnitEconomics(
        supabase,
        agencyId!,
        startDate,
        endDate,
        PERIOD_LABELS[periodView] ?? 'Période'
      );
    },
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUnitEconomicsYearly(year?: number) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const selectedYear = useUiStore((s) => s.selectedYear);
  const targetYear = year ?? selectedYear;

  return useQuery({
    queryKey: ['unit-economics-yearly', agencyId, targetYear],
    queryFn: () => {
      const supabase = createClient();
      return computeUnitEconomics(
        supabase,
        agencyId!,
        `${targetYear}-01-01`,
        `${targetYear + 1}-01-01`,
        `Année ${targetYear}`
      );
    },
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
  });
}
