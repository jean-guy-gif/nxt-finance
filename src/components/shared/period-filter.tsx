'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  REVENUE_STATUSES,
  REVENUE_STATUS_LABELS,
  EXPENSE_STATUSES,
  EXPENSE_STATUS_LABELS,
  type ExpenseCategory,
  type RevenueStatus,
  type ExpenseStatus,
} from '@/types/enums';

// --- Generic select filter ---

interface SelectFilterProps<T extends string> {
  value: T | 'all';
  onChange: (value: T | 'all') => void;
  options: readonly T[];
  labels: Record<T, string>;
  placeholder: string;
  allLabel?: string;
}

export function SelectFilter<T extends string>({
  value,
  onChange,
  options,
  labels,
  placeholder,
  allLabel = 'Tous',
}: SelectFilterProps<T>) {
  return (
    <Select value={value as string} onValueChange={(v) => { if (v) onChange(v as T | 'all'); }}>
      <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {labels[opt]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// --- Pre-built filter variants ---

export function CategoryFilter({
  value,
  onChange,
}: {
  value: ExpenseCategory | 'all';
  onChange: (value: ExpenseCategory | 'all') => void;
}) {
  return (
    <SelectFilter
      value={value}
      onChange={onChange}
      options={EXPENSE_CATEGORIES}
      labels={EXPENSE_CATEGORY_LABELS}
      placeholder="Catégorie"
      allLabel="Toutes catégories"
    />
  );
}

export function RevenueStatusFilter({
  value,
  onChange,
}: {
  value: RevenueStatus | 'all';
  onChange: (value: RevenueStatus | 'all') => void;
}) {
  return (
    <SelectFilter
      value={value}
      onChange={onChange}
      options={REVENUE_STATUSES}
      labels={REVENUE_STATUS_LABELS}
      placeholder="Statut"
      allLabel="Tous statuts"
    />
  );
}

export function ExpenseStatusFilter({
  value,
  onChange,
}: {
  value: ExpenseStatus | 'all';
  onChange: (value: ExpenseStatus | 'all') => void;
}) {
  return (
    <SelectFilter
      value={value}
      onChange={onChange}
      options={EXPENSE_STATUSES}
      labels={EXPENSE_STATUS_LABELS}
      placeholder="Statut"
      allLabel="Tous statuts"
    />
  );
}
