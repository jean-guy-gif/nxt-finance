'use client';

import type { Revenue } from '@/types/models';
import { StatusBadge } from '@/components/shared/status-badge';
import { CardHeaderRow, CardRow } from '@/components/shared/mobile-card-list';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { REVENUE_STATUS_LABELS, REVENUE_TYPE_LABELS } from '@/types/enums';

export function RevenueMobileCard({ revenue }: { revenue: Revenue }) {
  return (
    <>
      <CardHeaderRow
        title={revenue.label}
        subtitle={REVENUE_TYPE_LABELS[revenue.type]}
        badge={
          <StatusBadge
            status={revenue.status}
            label={REVENUE_STATUS_LABELS[revenue.status]}
          />
        }
      />
      <CardRow label="Date">{formatDate(revenue.date)}</CardRow>
      <CardRow label="Montant">
        <span className="font-semibold">{formatCurrency(revenue.amount)}</span>
      </CardRow>
      {revenue.source && <CardRow label="Source">{revenue.source}</CardRow>}
    </>
  );
}
