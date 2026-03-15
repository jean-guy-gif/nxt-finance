import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Format a number as EUR currency.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as a compact EUR value (e.g. 12,5 k€).
 */
export function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace('.', ',')} M€`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(1).replace('.', ',')} k€`;
  }
  return formatCurrency(amount);
}

/**
 * Format a date string (ISO) to a readable French date.
 */
export function formatDate(dateStr: string, pattern = 'dd/MM/yyyy'): string {
  return format(parseISO(dateStr), pattern, { locale: fr });
}

/**
 * Format a date string to a long French format (e.g. "15 mars 2026").
 */
export function formatDateLong(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMMM yyyy', { locale: fr });
}

/**
 * Format a month/year as "Mars 2026".
 */
export function formatPeriod(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMMM yyyy', { locale: fr });
}

/**
 * Format a percentage (0-100).
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)} %`;
}

/**
 * Format a VAT rate (e.g. 20 -> "20 %").
 */
export function formatVatRate(rate: number): string {
  return `${rate} %`;
}
