'use client';

import { useState } from 'react';
import { RefreshCw, Send, Share2, AlertTriangle, CheckCircle2, FileText, Receipt as ReceiptIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/shared/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionCard } from '@/components/shared/section-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/shared/stat-card';
import { AlertBanner } from '@/components/shared/alert-banner';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { formatCurrency, formatPeriod, formatDate, formatDateLong, formatPercent } from '@/lib/formatters';
import { PERIOD_STATUS_LABELS, REVENUE_STATUS_LABELS, EXPENSE_STATUS_LABELS, EXPENSE_CATEGORY_LABELS } from '@/types/enums';
import { useAgencyStore } from '@/stores/agency-store';
import { useUiStore } from '@/stores/ui-store';
import {
  usePeriod,
  usePeriodComputed,
  useUpdatePeriodStatus,
  useRefreshVatSnapshot,
  useTogglePeriodSharing,
} from '../hooks/use-periods';
import { useRevenues } from '@/features/revenue/hooks/use-revenues';
import { useExpenses } from '@/features/expenses/hooks/use-expenses';
import type { PeriodComputed } from '../services/period-service';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  periodId: string;
}

export function PeriodDetailPage({ periodId }: Props) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const { data: period, isLoading, isError, refetch } = usePeriod(periodId);
  const computed = usePeriodComputed(
    periodId,
    agencyId,
    period?.month ?? 1,
    period?.year ?? 2026
  );
  const updateStatus = useUpdatePeriodStatus();
  const refreshVat = useRefreshVatSnapshot();
  const toggleSharing = useTogglePeriodSharing();

  const [confirmAction, setConfirmAction] = useState<'ready' | 'transmit' | null>(null);
  const [showRevenues, setShowRevenues] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);

  // Fetch actual revenues and expenses for this period
  const revenues = useRevenues();
  const expenses = useExpenses();

  if (isLoading) return <LoadingState message="Chargement de la période..." fullPage />;
  if (isError || !period) {
    return <ErrorState message="Impossible de charger cette période." onRetry={refetch} />;
  }

  const stats = computed.data;
  const hasBlockers = stats ? stats.blockers.length > 0 : false;
  const canMarkReady = period.status !== 'ready_to_transmit' && period.status !== 'transmitted' && !hasBlockers;
  const canTransmit = period.status === 'ready_to_transmit';
  const isTransmitted = period.status === 'transmitted';

  async function handleStatusChange(newStatus: 'ready_to_transmit' | 'transmitted') {
    await updateStatus.mutateAsync({
      periodId,
      status: newStatus,
      computed: stats ?? undefined,
    });
    setConfirmAction(null);
  }

  async function handleRefreshVat() {
    await refreshVat.mutateAsync({
      periodId,
      month: period!.month,
      year: period!.year,
    });
  }

  async function handleToggleSharing() {
    await toggleSharing.mutateAsync({
      periodId,
      shared: !period!.shared_with_accountant,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton fallback="/periodes" label="Périodes" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight capitalize">
                {formatPeriod(period.month, period.year)}
              </h1>
              <StatusBadge
                status={period.status}
                label={PERIOD_STATUS_LABELS[period.status]}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Du {formatDateLong(period.start_date)} au {formatDateLong(period.end_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-11 sm:ml-0 flex-wrap">
          {!isTransmitted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSharing}
              disabled={toggleSharing.isPending}
            >
              <Share2 className="mr-2 h-3.5 w-3.5" />
              {period.shared_with_accountant ? 'Retirer partage' : 'Partager au cabinet'}
            </Button>
          )}
          {canMarkReady && (
            <Button
              size="sm"
              onClick={() => setConfirmAction('ready')}
            >
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
              Prête à transmettre
            </Button>
          )}
          {canTransmit && (
            <Button
              size="sm"
              onClick={() => setConfirmAction('transmit')}
            >
              <Send className="mr-2 h-3.5 w-3.5" />
              Marquer transmise
            </Button>
          )}
        </div>
      </div>

      {/* Blockers — each one is clickable and leads to the right filtered view */}
      {stats && stats.blockers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Points bloquants pour la transmission
          </h2>
          {stats.blockers.map((b, i) => {
            const blockerHref =
              b.type === 'missing_receipts' ? '/depenses?missing_receipt=1' :
              b.type === 'unreadable_receipts' ? '/depenses?receipt_status=unreadable' :
              b.type === 'receipts_to_verify' ? '/depenses?receipt_status=to_verify' :
              b.type === 'expenses_to_verify' ? '/depenses?status=draft' :
              undefined;

            // TVA not prepared → scroll to the VAT section and trigger recalculation
            const isVatBlocker = b.type === 'no_vat_snapshot';

            function handleVatAction() {
              const el = document.getElementById('vat-section');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              // Auto-trigger recalculation
              handleRefreshVat();
            }

            return (
              <AlertBanner
                key={i}
                level="vigilance"
                message={b.message}
                href={isVatBlocker ? undefined : blockerHref}
                action={{
                  label: isVatBlocker ? 'Calculer maintenant' : 'Résoudre',
                  onClick: isVatBlocker
                    ? handleVatAction
                    : () => { if (blockerHref) window.location.href = blockerHref; },
                }}
              />
            );
          })}
        </div>
      )}

      <div id="vat-section" className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* TVA snapshot */}
        <SectionCard
          title="TVA estimée"
          className="lg:col-span-2"
          action={
            !isTransmitted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshVat}
                disabled={refreshVat.isPending}
              >
                {refreshVat.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                )}
                Recalculer
              </Button>
            ) : undefined
          }
        >
          {period.vat_balance != null ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">TVA collectée</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(period.vat_collected ?? 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">TVA déductible</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(period.vat_deductible ?? 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                  <p className="text-xs text-muted-foreground">Solde estimé</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(period.vat_balance ?? 0)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <StatusBadge status="to_verify" label="Estimation préparatoire" />
                </span>
                {period.vat_snapshot_at && (
                  <span>Calculée le {formatDateLong(period.vat_snapshot_at)}</span>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground/70 border-t pt-2">
                Ces montants sont des estimations basées sur les recettes et dépenses validées.
                Ils ne constituent pas une déclaration fiscale. Consultez votre expert-comptable.
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                Aucune estimation TVA pour cette période
              </p>
              <Button variant="outline" size="sm" onClick={handleRefreshVat} disabled={refreshVat.isPending}>
                {refreshVat.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                )}
                Calculer l'estimation
              </Button>
            </div>
          )}
        </SectionCard>

        {/* Completeness */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Complétude</CardTitle>
          </CardHeader>
          <CardContent>
            {computed.isLoading ? (
              <LoadingState message="Calcul..." />
            ) : stats ? (
              <div className="space-y-4">
                {/* Progress ring */}
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {formatPercent(stats.completenessRate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    des dépenses justifiées
                  </p>
                </div>

                {/* Stats grid */}
                <div className="space-y-2">
                  <MiniStat label="Recettes" value={stats.revenueCount} detail={formatCurrency(stats.totalRevenues)} href="/recettes" />
                  <MiniStat label="Dépenses" value={stats.expenseCount} detail={formatCurrency(stats.totalExpenses)} href="/depenses" />
                  <MiniStat label="Justificatifs exploitables" value={stats.usableReceipts} href="/depenses" />
                  <MiniStat label="À vérifier" value={stats.receiptsToVerify} warn={stats.receiptsToVerify > 0} href="/depenses?receipt_status=to_verify" />
                  <MiniStat label="Illisibles" value={stats.unreadableReceipts} warn={stats.unreadableReceipts > 0} href="/depenses?receipt_status=unreadable" />
                  <MiniStat label="Sans justificatif" value={stats.expensesWithoutReceipt} warn={stats.expensesWithoutReceipt > 0} href="/depenses?missing_receipt=1" />
                  <MiniStat label="Anomalies" value={stats.anomalyCount} warn={stats.anomalyCount > 0} href="/depenses" />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Données indisponibles</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity summary */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <StatCard
            label="Recettes"
            value={stats.revenueCount}
            sublabel={formatCurrency(stats.totalRevenues)}
            icon={ReceiptIcon}
            iconClassName="bg-emerald-500/10 text-emerald-600"
            href="/recettes"
          />
          <StatCard
            label="Dépenses"
            value={stats.expenseCount}
            sublabel={formatCurrency(stats.totalExpenses)}
            icon={ReceiptIcon}
            iconClassName="bg-amber-500/10 text-amber-600"
            href="/depenses"
          />
          <StatCard
            label="Pièces exploitables"
            value={stats.usableReceipts}
            icon={FileText}
            iconClassName="bg-blue-500/10 text-blue-600"
            href="/depenses"
          />
          <StatCard
            label="Anomalies"
            value={stats.anomalyCount}
            icon={AlertTriangle}
            iconClassName={
              stats.anomalyCount > 0
                ? 'bg-red-500/10 text-red-600'
                : 'bg-emerald-500/10 text-emerald-600'
            }
            href="/depenses"
          />
        </div>
      )}

      {/* Inline detail lists — collapsible */}
      <Card>
        <CardHeader
          className="flex flex-row items-center justify-between pb-3 cursor-pointer select-none"
          onClick={() => setShowRevenues(!showRevenues)}
        >
          <CardTitle className="text-base">
            Recettes de la période ({revenues.data?.length ?? 0})
          </CardTitle>
          <Button variant="ghost" size="sm" tabIndex={-1}>
            {showRevenues ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {showRevenues && (
          <CardContent>
            {revenues.data && revenues.data.length > 0 ? (
              <div className="divide-y">
                {revenues.data.map((r) => (
                  <a key={r.id} href={`/recettes/${r.id}`} className="flex items-center justify-between py-2 px-1 hover:bg-muted/30 rounded transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.date)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-sm font-medium">{formatCurrency(r.amount)}</span>
                      <StatusBadge status={r.status} label={REVENUE_STATUS_LABELS[r.status]} />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune recette sur cette période</p>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader
          className="flex flex-row items-center justify-between pb-3 cursor-pointer select-none"
          onClick={() => setShowExpenses(!showExpenses)}
        >
          <CardTitle className="text-base">
            Dépenses de la période ({expenses.data?.length ?? 0})
          </CardTitle>
          <Button variant="ghost" size="sm" tabIndex={-1}>
            {showExpenses ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {showExpenses && (
          <CardContent>
            {expenses.data && expenses.data.length > 0 ? (
              <div className="divide-y">
                {expenses.data.map((e) => (
                  <a key={e.id} href={`/depenses/${e.id}`} className="flex items-center justify-between py-2 px-1 hover:bg-muted/30 rounded transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{e.supplier}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(e.date)} — {EXPENSE_CATEGORY_LABELS[e.category]}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-sm font-medium">{formatCurrency(e.amount_ttc)}</span>
                      <StatusBadge status={e.status} label={EXPENSE_STATUS_LABELS[e.status]} />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune dépense sur cette période</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmAction === 'ready'}
        onOpenChange={() => setConfirmAction(null)}
        title="Marquer la période comme prête"
        description="La période sera marquée comme prête à transmettre au cabinet. Vérifiez que toutes les pièces sont complètes."
        confirmLabel="Confirmer"
        isLoading={updateStatus.isPending}
        onConfirm={() => handleStatusChange('ready_to_transmit')}
      />
      <ConfirmDialog
        open={confirmAction === 'transmit'}
        onOpenChange={() => setConfirmAction(null)}
        title="Marquer la période comme transmise"
        description="La période sera marquée comme transmise au cabinet comptable. Cette action est définitive."
        confirmLabel="Marquer transmise"
        isLoading={updateStatus.isPending}
        onConfirm={() => handleStatusChange('transmitted')}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  detail,
  warn,
  href,
}: {
  label: string;
  value: number;
  detail?: string;
  warn?: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
        <span className={warn ? 'font-medium text-amber-600' : 'font-medium'}>
          {value}
        </span>
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} className="flex items-center justify-between text-sm hover:bg-muted/50 rounded px-1 -mx-1 py-0.5 transition-colors">
        {inner}
      </a>
    );
  }

  return (
    <div className="flex items-center justify-between text-sm">
      {inner}
    </div>
  );
}
