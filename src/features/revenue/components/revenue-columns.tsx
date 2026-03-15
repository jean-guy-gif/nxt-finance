'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Revenue } from '@/types/models';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { REVENUE_STATUS_LABELS, REVENUE_TYPE_LABELS } from '@/types/enums';

export const revenueColumns: ColumnDef<Revenue, unknown>[] = [
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
    accessorKey: 'label',
    header: 'Libellé',
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium truncate max-w-[240px]">{row.original.label}</p>
        <p className="text-xs text-muted-foreground">
          {REVENUE_TYPE_LABELS[row.original.type]}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Montant',
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">
        {formatCurrency(row.original.amount)}
      </span>
    ),
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.source || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.status}
        label={REVENUE_STATUS_LABELS[row.original.status]}
      />
    ),
  },
];
