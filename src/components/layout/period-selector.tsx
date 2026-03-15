'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUiStore } from '@/stores/ui-store';
import { formatPeriod } from '@/lib/formatters';
import { PERIOD_VIEWS, type PeriodView } from '@/types/enums';

const QUARTER_LABELS: Record<number, string> = {
  1: 'T1',
  2: 'T2',
  3: 'T3',
  4: 'T4',
};

function getQuarter(month: number): number {
  return Math.ceil(month / 3);
}

export function PeriodSelector() {
  const periodView = useUiStore((s) => s.periodView);
  const setPeriodView = useUiStore((s) => s.setPeriodView);
  const selectedMonth = useUiStore((s) => s.selectedMonth);
  const selectedYear = useUiStore((s) => s.selectedYear);
  const setSelectedPeriod = useUiStore((s) => s.setSelectedPeriod);

  function navigatePrev() {
    if (periodView === 'monthly') {
      if (selectedMonth === 1) {
        setSelectedPeriod(12, selectedYear - 1);
      } else {
        setSelectedPeriod(selectedMonth - 1, selectedYear);
      }
    } else if (periodView === 'quarterly') {
      const q = getQuarter(selectedMonth);
      if (q === 1) {
        setSelectedPeriod(10, selectedYear - 1);
      } else {
        setSelectedPeriod((q - 2) * 3 + 1, selectedYear);
      }
    } else {
      setSelectedPeriod(selectedMonth, selectedYear - 1);
    }
  }

  function navigateNext() {
    if (periodView === 'monthly') {
      if (selectedMonth === 12) {
        setSelectedPeriod(1, selectedYear + 1);
      } else {
        setSelectedPeriod(selectedMonth + 1, selectedYear);
      }
    } else if (periodView === 'quarterly') {
      const q = getQuarter(selectedMonth);
      if (q === 4) {
        setSelectedPeriod(1, selectedYear + 1);
      } else {
        setSelectedPeriod(q * 3 + 1, selectedYear);
      }
    } else {
      setSelectedPeriod(selectedMonth, selectedYear + 1);
    }
  }

  /** Cycle through period views on mobile tap */
  function cyclePeriodView() {
    const idx = PERIOD_VIEWS.indexOf(periodView);
    const next = PERIOD_VIEWS[(idx + 1) % PERIOD_VIEWS.length];
    setPeriodView(next);
  }

  function getPeriodLabel(): string {
    if (periodView === 'yearly') {
      return `${selectedYear}`;
    }
    if (periodView === 'quarterly') {
      const q = getQuarter(selectedMonth);
      return `${QUARTER_LABELS[q]} ${selectedYear}`;
    }
    return formatPeriod(selectedMonth, selectedYear);
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* View toggle — desktop/tablet */}
      <Tabs
        value={periodView}
        onValueChange={(v) => setPeriodView(v as PeriodView)}
        className="hidden sm:block"
      >
        <TabsList className="h-8">
          <TabsTrigger value="monthly" className="text-xs px-2.5">
            Mois
          </TabsTrigger>
          <TabsTrigger value="quarterly" className="text-xs px-2.5">
            Trimestre
          </TabsTrigger>
          <TabsTrigger value="yearly" className="text-xs px-2.5">
            Année
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Period navigation */}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={navigatePrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={cyclePeriodView}
          className="text-sm font-medium min-w-[100px] sm:min-w-[120px] text-center capitalize sm:cursor-default sm:pointer-events-none"
          title="Changer la vue période"
        >
          {getPeriodLabel()}
        </button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={navigateNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
