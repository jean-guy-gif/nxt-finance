'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Expense } from '@/types/models';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { EXPENSE_STATUS_LABELS, EXPENSE_CATEGORY_LABELS } from '@/types/enums';

export const expenseColumns: ColumnDef<Expense, unknown>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {formatDate(row.original.date)}
      </span>
    ),
  },
  {
    accessorKey: 'supplier',
    header: 'Fournisseur',
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium truncate max-w-[200px]">{row.original.supplier}</p>
        <p className="text-xs text-muted-foreground">
          {EXPENSE_CATEGORY_LABELS[row.original.category]}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'amount_ttc',
    header: 'Montant TTC',
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">
        {formatCurrency(row.original.amount_ttc)}
      </span>
    ),
  },
  {
    accessorKey: 'vat_amount',
    header: 'TVA',
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {row.original.vat_amount != null
          ? formatCurrency(row.original.vat_amount)
          : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.status}
        label={EXPENSE_STATUS_LABELS[row.original.status]}
      />
    ),
  },
];
