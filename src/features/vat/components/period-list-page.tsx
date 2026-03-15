'use client';

import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { formatCurrency, formatPeriod } from '@/lib/formatters';
import { PERIOD_STATUS_LABELS } from '@/types/enums';
import { usePeriods } from '../hooks/use-periods';
import type { AccountingPeriod } from '@/types/models';

export function PeriodListPage() {
  const router = useRouter();
  const { data: periods, isLoading, isError, refetch } = usePeriods();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Périodes comptables"
          description="Préparez vos périodes et suivez votre TVA estimée"
        />
        <LoadingState message="Chargement des périodes..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Périodes comptables"
          description="Préparez vos périodes et suivez votre TVA estimée"
        />
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  const data = periods ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Périodes comptables"
        description="Préparez vos périodes et suivez votre TVA estimée"
      />

      {data.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Aucune période"
          description="Les périodes comptables seront créées automatiquement à partir de vos recettes et dépenses."
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((period) => (
            <PeriodCard
              key={period.id}
              period={period}
              onClick={() => router.push(`/periodes/${period.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PeriodCard({
  period,
  onClick,
}: {
  period: AccountingPeriod;
  onClick: () => void;
}) {
  const hasVat = period.vat_balance != null;

  return (
    <Card
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold capitalize">
            {formatPeriod(period.month, period.year)}
          </h3>
          <StatusBadge
            status={period.status}
            label={PERIOD_STATUS_LABELS[period.status]}
          />
        </div>

        {hasVat ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground">Collectée</p>
              <p className="text-xs font-medium">
                {formatCurrency(period.vat_collected ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Déductible</p>
              <p className="text-xs font-medium">
                {formatCurrency(period.vat_deductible ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Solde estimé</p>
              <p className="text-xs font-semibold">
                {formatCurrency(period.vat_balance ?? 0)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Aucune estimation TVA disponible
          </p>
        )}

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {period.shared_with_accountant && (
            <span className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded">
              Partagée
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
