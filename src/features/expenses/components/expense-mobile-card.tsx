'use client';

import type { Expense } from '@/types/models';
import { StatusBadge } from '@/components/shared/status-badge';
import { CardHeaderRow, CardRow } from '@/components/shared/mobile-card-list';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { EXPENSE_STATUS_LABELS, EXPENSE_CATEGORY_LABELS } from '@/types/enums';

export function ExpenseMobileCard({ expense }: { expense: Expense }) {
  return (
    <>
      <CardHeaderRow
        title={expense.supplier}
        subtitle={EXPENSE_CATEGORY_LABELS[expense.category]}
        badge={
          <StatusBadge
            status={expense.status}
            label={EXPENSE_STATUS_LABELS[expense.status]}
          />
        }
      />
      <CardRow label="Date">{formatDate(expense.date)}</CardRow>
      <CardRow label="Montant TTC">
        <span className="font-semibold">{formatCurrency(expense.amount_ttc)}</span>
      </CardRow>
      {expense.vat_amount != null && (
        <CardRow label="TVA">{formatCurrency(expense.vat_amount)}</CardRow>
      )}
    </>
  );
}
