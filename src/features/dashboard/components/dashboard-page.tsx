'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  AlertTriangle,
  FileText,
  Plus,
  ArrowRight,
  Upload,
  Calculator,
  Users,
  Building2,
  BarChart3,
  Landmark,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KpiCard } from '@/components/shared/kpi-card';
import { AlertBanner } from '@/components/shared/alert-banner';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { formatCurrency, formatDateLong } from '@/lib/formatters';
import { useUiStore } from '@/stores/ui-store';
import { PERIOD_VIEW_LABELS, PERIOD_STATUS_LABELS, type PeriodStatus } from '@/types/enums';
import {
  useDashboardKpis,
  useDashboardAdminStats,
  useDashboardVat,
  useTreasury,
} from '../hooks/use-dashboard';
import { useAlertEngine, useAlerts, useDismissAlert } from '@/features/alerts/hooks/use-alerts';
import { usePayoutSummary } from '@/features/collaborators/hooks/use-collaborators';
import { DashboardHealthCard } from '@/features/analyse/components/dashboard-health-card';

const QUICK_ACTIONS = [
  { label: 'Ajouter une recette', href: '/recettes?action=new', icon: TrendingUp },
  { label: 'Ajouter une dépense', href: '/depenses?action=new', icon: Receipt },
  { label: 'Ajouter un justificatif', href: '/depenses?action=upload', icon: Upload },
  { label: 'Ouvrir la période', href: '/periodes', icon: ArrowRight },
];

export function DashboardPage() {
  const periodView = useUiStore((s) => s.periodView);

  const kpis = useDashboardKpis();
  const admin = useDashboardAdminStats();
  const vat = useDashboardVat();
  const treasury = useTreasury();
  const payout = usePayoutSummary();

  // Run alert engine (computes + syncs to DB), then fetch for display
  useAlertEngine();
  const alerts = useAlerts(5);
  const dismissMutation = useDismissAlert();

  const router = useRouter();
  const [showTreasury, setShowTreasury] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  // Global loading: show full loading only if ALL critical queries are loading
  const isCriticalLoading = kpis.isLoading && treasury.isLoading;
  const hasError = kpis.isError && treasury.isError;

  if (isCriticalLoading) {
    return <LoadingState message="Chargement du tableau de bord..." fullPage />;
  }

  if (hasError) {
    return (
      <ErrorState
        message="Impossible de charger les données du tableau de bord."
        onRetry={() => {
          kpis.refetch();
          admin.refetch();
          vat.refetch();
          treasury.refetch();
          alerts.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Tableau de bord"
        description={`Vue ${PERIOD_VIEW_LABELS[periodView].toLowerCase()} de votre activité`}
      />

      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Chiffre d'affaires"
          value={kpis.data ? formatCurrency(kpis.data.revenue) : '—'}
          subtitle="Recettes validées + encaissées"
          icon={TrendingUp}
          variant="default"
          href="/recettes?status=validated"
        />
        <KpiCard
          title="Encaissements"
          value={kpis.data ? formatCurrency(kpis.data.collections) : '—'}
          subtitle="Recettes encaissées"
          icon={Wallet}
          variant="success"
          href="/recettes?status=collected"
        />
        <KpiCard
          title="Dépenses"
          value={kpis.data ? formatCurrency(kpis.data.expenses) : '—'}
          subtitle="Total TTC de la période"
          icon={TrendingDown}
          variant="warning"
          href="/depenses"
        />
        <div onClick={() => setShowTreasury(true)} className="cursor-pointer">
          <KpiCard
            title="Trésorerie visible"
            value={treasury.data !== undefined ? formatCurrency(treasury.data) : '—'}
            subtitle="Cliquez pour voir le détail du calcul"
            icon={Wallet}
            variant={
              treasury.data !== undefined && treasury.data < 0 ? 'danger' : 'default'
            }
          />
        </div>
      </div>

      {/* Commission KPIs — only shown when there's data */}
      {payout.data && (payout.data.pendingReversement > 0 || payout.data.monthlyPayroll > 0) && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {payout.data.pendingReversement > 0 && (
            <KpiCard
              title="À reverser aux collaborateurs"
              value={formatCurrency(payout.data.pendingReversement)}
              subtitle="Parts indépendants / agents en attente de reversement"
              icon={Users}
              variant="warning"
              href="/recettes"
            />
          )}
          {payout.data.monthlyPayroll > 0 && (
            <KpiCard
              title="Masse salariale mensuelle"
              value={formatCurrency(payout.data.monthlyPayroll)}
              subtitle={`${payout.data.salarieCount} salarié${payout.data.salarieCount > 1 ? 's' : ''} — indicateur de pilotage`}
              icon={Building2}
              variant="default"
              href="/parametres"
            />
          )}
        </div>
      )}

      {/* V3 — Financial health score */}
      <DashboardHealthCard />

      {/* V3 — Cockpit quick access */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="justify-start gap-2 h-auto py-3"
          onClick={() => router.push('/analyse')}
        >
          <BarChart3 className="h-4 w-4" />
          <div className="text-left">
            <div className="text-sm font-medium">Analyse financi&egrave;re</div>
            <div className="text-xs text-muted-foreground">Bilans et ratios</div>
          </div>
        </Button>
        {/* Business Plan — V3.6 placeholder */}
        <Button variant="outline" className="justify-start gap-2 h-auto py-3" disabled>
          <TrendingUp className="h-4 w-4" />
          <div className="text-left">
            <div className="text-sm font-medium">Business Plan</div>
            <div className="text-xs text-muted-foreground">Bient&ocirc;t disponible</div>
          </div>
        </Button>
        {/* Dossier bancaire — V3.7 placeholder */}
        <Button variant="outline" className="justify-start gap-2 h-auto py-3" disabled>
          <Landmark className="h-4 w-4" />
          <div className="text-left">
            <div className="text-sm font-medium">Dossier bancaire</div>
            <div className="text-xs text-muted-foreground">Bient&ocirc;t disponible</div>
          </div>
        </Button>
      </div>

      {/* Alerts */}
      <AlertsSection
        alerts={alerts.data}
        isLoading={alerts.isLoading}
        onDismiss={(id) => dismissMutation.mutate(id)}
        onTreasuryClick={() => setShowBalance(true)}
      />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Administrative status + VAT */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Suivi administratif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <StatCard
                label="Pièces manquantes"
                value={admin.isLoading ? '...' : admin.data?.expensesWithoutReceipt ?? 0}
                icon={AlertTriangle}
                iconClassName="bg-amber-500/10 text-amber-600"
                href="/depenses?missing_receipt=1"
              />
              <StatCard
                label="À vérifier"
                value={admin.isLoading ? '...' : admin.data?.receiptsToVerify ?? 0}
                icon={FileText}
                iconClassName="bg-blue-500/10 text-blue-600"
                href="/depenses?status=to_verify"
              />
              <StatCard
                label="Demandes cabinet"
                value={admin.isLoading ? '...' : admin.data?.pendingAccountantRequests ?? 0}
                icon={Receipt}
                iconClassName="bg-violet-500/10 text-violet-600"
                href="/comptable?tab=requests"
              />
            </div>

            {/* VAT estimate */}
            <VatSnapshotBlock
              vat={vat.data}
              isLoading={vat.isLoading}
            />
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href}>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-10"
                >
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                  {action.label}
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Treasury detail dialog */}
      <Dialog open={showTreasury} onOpenChange={setShowTreasury}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Détail de la trésorerie visible
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              La trésorerie visible est une estimation opérationnelle, pas un solde bancaire certifié.
            </p>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total encaissements cumulés</span>
                <span className="font-medium text-emerald-600">
                  {kpis.data ? formatCurrency(kpis.data.collections) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">− Dépenses validées cumulées</span>
                <span className="font-medium text-amber-600">
                  {kpis.data ? formatCurrency(kpis.data.expenses) : '—'}
                </span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between text-sm">
                <span className="font-medium">= Trésorerie visible</span>
                <span className="text-lg font-bold text-primary">
                  {treasury.data !== undefined ? formatCurrency(treasury.data) : '—'}
                </span>
              </div>

              {/* Collaborator impact */}
              {payout.data && payout.data.pendingReversement > 0 && (
                <div className="border-t pt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      dont parts collaborateurs à reverser
                    </span>
                    <span className="font-medium text-amber-600">
                      {formatCurrency(payout.data.pendingReversement)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">
                    Montant dû aux indépendants et agents commerciaux, non encore reversé.
                  </p>
                </div>
              )}

              {payout.data && payout.data.monthlyPayroll > 0 && (
                <div className="border-t pt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" />
                      Masse salariale mensuelle
                    </span>
                    <span className="font-medium text-muted-foreground">
                      {formatCurrency(payout.data.monthlyPayroll)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">
                    Coût employeur total des {payout.data.salarieCount} salarié{payout.data.salarieCount > 1 ? 's' : ''} actif{payout.data.salarieCount > 1 ? 's' : ''} — indicateur de pilotage.
                  </p>
                </div>
              )}
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800">
                Ce montant est calculé à partir des encaissements enregistrés et des dépenses validées dans NXT Finance.
                Il ne tient pas compte des mouvements bancaires non saisis, des prélèvements automatiques non enregistrés,
                ni des virements en attente. Il ne remplace pas un relevé bancaire.
              </p>
            </div>
            <div className="flex gap-2">
              <a href="/recettes?status=collected" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Voir les encaissements
                </Button>
              </a>
              <a href="/depenses" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Voir les dépenses
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Balance comparison dialog — triggered from treasury alerts */}
      <Dialog open={showBalance} onOpenChange={setShowBalance}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Balance encaissements / dépenses</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comparaison sur la période en cours.
            </p>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Encaissements</span>
                <span className="font-semibold text-emerald-600">
                  {kpis.data ? formatCurrency(kpis.data.collections) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dépenses TTC</span>
                <span className="font-semibold text-amber-600">
                  {kpis.data ? formatCurrency(kpis.data.expenses) : '—'}
                </span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between text-sm">
                <span className="font-medium">Écart</span>
                <span className={`text-lg font-bold ${
                  kpis.data && kpis.data.collections >= kpis.data.expenses
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}>
                  {kpis.data
                    ? formatCurrency(kpis.data.collections - kpis.data.expenses)
                    : '—'}
                </span>
              </div>
            </div>
            {kpis.data && kpis.data.expenses > kpis.data.collections && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-800">
                  Les dépenses dépassent les encaissements de{' '}
                  <strong>{formatCurrency(kpis.data.expenses - kpis.data.collections)}</strong>{' '}
                  sur cette période. Vérifiez les recettes en attente d'encaissement et les dépenses à valider.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <a href="/recettes?status=collected" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Voir les encaissements
                </Button>
              </a>
              <a href="/depenses" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Voir les dépenses
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub-components ---

function AlertsSection({
  alerts,
  isLoading,
  onDismiss,
  onTreasuryClick,
}: {
  alerts: Awaited<ReturnType<typeof import('@/features/alerts/services/alerts-service').fetchPriorityAlerts>> | undefined;
  isLoading: boolean;
  onDismiss: (alertId: string) => void;
  onTreasuryClick: () => void;
}) {
  if (isLoading) return null;
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        Alertes prioritaires
      </h2>
      {alerts.map((alert) => {
        // Treasury alerts open a comparison dialog instead of navigating
        const isTreasury = alert.category === 'treasury';
        const alertHref = isTreasury ? undefined :
          alert.category === 'vat' ? '/periodes' :
          alert.category === 'pre_accounting' ? '/depenses?missing_receipt=1' :
          alert.category === 'accountant' ? '/comptable?tab=requests' :
          undefined;
        return (
          <AlertBanner
            key={alert.id}
            level={alert.level}
            message={alert.message}
            href={alertHref}
            action={isTreasury ? { label: 'Voir le détail', onClick: onTreasuryClick } : undefined}
            onDismiss={() => onDismiss(alert.id)}
          />
        );
      })}
    </div>
  );
}

function VatSnapshotBlock({
  vat,
  isLoading,
}: {
  vat: Awaited<ReturnType<typeof import('../services/dashboard-service').fetchDashboardVat>> | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="p-3 rounded-lg border bg-card">
        <div className="h-12 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  // No period exists yet
  if (!vat || vat.periodId === null) {
    return (
      <div className="p-3 rounded-lg border bg-card">
        <p className="text-sm text-muted-foreground">
          Aucune période comptable pour ce mois.
        </p>
      </div>
    );
  }

  // Period exists but no VAT snapshot yet
  if (vat.vatBalance === null) {
    return (
      <div className="p-3 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">TVA estimée</p>
            <p className="text-sm text-muted-foreground italic">
              Aucune estimation disponible pour cette période
            </p>
          </div>
          {vat.periodStatus && (
            <StatusBadge
              status={vat.periodStatus as PeriodStatus}
              label={PERIOD_STATUS_LABELS[vat.periodStatus as PeriodStatus] ?? vat.periodStatus}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">TVA estimée de la période</p>
        <StatusBadge status="to_verify" label="Estimation" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Collectée</p>
          <p className="text-sm font-semibold">
            {formatCurrency(vat.vatCollected ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Déductible</p>
          <p className="text-sm font-semibold">
            {formatCurrency(vat.vatDeductible ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Solde estimé</p>
          <p className="text-sm font-semibold">
            {formatCurrency(vat.vatBalance ?? 0)}
          </p>
        </div>
      </div>
      {vat.snapshotAt && (
        <p className="text-[10px] text-muted-foreground/70 mt-2">
          Snapshot du {formatDateLong(vat.snapshotAt)}
        </p>
      )}
    </div>
  );
}
