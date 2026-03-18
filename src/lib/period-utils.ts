import type { PeriodView } from '@/types/enums';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD (exclusive)
}

/**
 * Convert (periodView, month, year) into a date range.
 * - monthly: single month
 * - quarterly: 3 months (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec)
 * - yearly: full year
 */
export function getDateRange(periodView: PeriodView, month: number, year: number): DateRange {
  switch (periodView) {
    case 'monthly': {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
      return { startDate, endDate };
    }
    case 'quarterly': {
      // Quarter based on selected month: Q1=1-3, Q2=4-6, Q3=7-9, Q4=10-12
      const quarterStart = Math.floor((month - 1) / 3) * 3 + 1;
      const quarterEnd = quarterStart + 3;
      const startDate = `${year}-${String(quarterStart).padStart(2, '0')}-01`;
      const endYear = quarterEnd > 12 ? year + 1 : year;
      const endMonth = quarterEnd > 12 ? 1 : quarterEnd;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
      return { startDate, endDate };
    }
    case 'yearly': {
      return {
        startDate: `${year}-01-01`,
        endDate: `${year + 1}-01-01`,
      };
    }
    default:
      return getDateRange('monthly', month, year);
  }
}

/**
 * Get all (month, year) pairs covered by a date range.
 * Useful for querying month-keyed tables like profitability_snapshots.
 */
export function getMonthsInRange(startDate: string, endDate: string): Array<{ month: number; year: number }> {
  const months: Array<{ month: number; year: number }> = [];
  const [startYear, startMonth] = startDate.split('-').map(Number);
  const [endYear, endMonth] = endDate.split('-').map(Number);

  let y = startYear;
  let m = startMonth;

  while (y < endYear || (y === endYear && m < endMonth)) {
    months.push({ month: m, year: y });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return months;
}
