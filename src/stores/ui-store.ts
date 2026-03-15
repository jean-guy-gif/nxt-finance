import { create } from 'zustand';
import type { PeriodView } from '@/types/enums';

interface UiState {
  /** Sidebar collapsed on desktop */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** Mobile nav open */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  /** Active period view */
  periodView: PeriodView;
  setPeriodView: (view: PeriodView) => void;
  /** Selected month/year for period filtering */
  selectedMonth: number;
  selectedYear: number;
  setSelectedPeriod: (month: number, year: number) => void;
}

const now = new Date();

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  periodView: 'monthly',
  setPeriodView: (view) => set({ periodView: view }),
  selectedMonth: now.getMonth() + 1,
  selectedYear: now.getFullYear(),
  setSelectedPeriod: (month, year) =>
    set({ selectedMonth: month, selectedYear: year }),
}));
