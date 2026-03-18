'use client';

import { useState } from 'react';
import { BarChart3, Upload, TrendingUp, Users, FileText, Target, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { KpiCard } from '@/components/shared/kpi-card';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { formatCurrency } from '@/lib/formatters';
import { useUiStore } from '@/stores/ui-store';
import { useCommercialKpis, useCommercialKpisByChannel } from '../hooks/use-commercial-kpis';

const MONTH_LABELS = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function computeConversionRate(a: number, b: number): string {
  if (a === 0) return '—';
  return ((b / a) * 100).toFixed(1) + '%';
}

export function KpisPage() {
  const selectedYear = useUiStore((s) => s.selectedYear);
  const [viewYear, setViewYear] = useState(selectedYear);

  const { data: kpis, isLoading } = useCommercialKpis(viewYear);
  const { data: channelKpis } = useCommercialKpisByChannel(viewYear);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Performance commerciale" description="Suivi de l'entonnoir de conversion" />
        <LoadingState message="Chargement des KPIs..." />
      </div>
    );
  }

  // Aggregate totals
  const totals = (kpis ?? []).reduce(
    (acc, k) => ({
      contacts: acc.contacts + k.nb_contacts,
      estimations: acc.estimations + k.nb_estimations,
      mandats: acc.mandats + k.nb_mandats,
      compromis: acc.compromis + k.nb_compromis,
      actes: acc.actes + k.nb_actes,
      ca: acc.ca + Number(k.ca_generated ?? 0),
    }),
    { contacts: 0, estimations: 0, mandats: 0, compromis: 0, actes: 0, ca: 0 }
  );

  // Channel aggregates
  const channelTotals = new Map<string, typeof totals>();
  for (const k of channelKpis ?? []) {
    const ch = k.source_channel ?? 'Total';
    const prev = channelTotals.get(ch) ?? { contacts: 0, estimations: 0, mandats: 0, compromis: 0, actes: 0, ca: 0 };
    channelTotals.set(ch, {
      contacts: prev.contacts + k.nb_contacts,
      estimations: prev.estimations + k.nb_estimations,
      mandats: prev.mandats + k.nb_mandats,
      compromis: prev.compromis + k.nb_compromis,
      actes: prev.actes + k.nb_actes,
      ca: prev.ca + Number(k.ca_generated ?? 0),
    });
  }

  const hasData = totals.contacts > 0 || totals.actes > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance commerciale"
        description={`Entonnoir de conversion — ${viewYear}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={viewYear === selectedYear - 1 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewYear(selectedYear - 1)}
            >
              {selectedYear - 1}
            </Button>
            <Button
              variant={viewYear === selectedYear ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewYear(selectedYear)}
            >
              {selectedYear}
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Upload className="mr-2 h-3.5 w-3.5" />
              Importer CSV
            </Button>
          </div>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Aucune donnée commerciale"
          description="Les KPIs commerciaux apparaîtront ici quand les données seront saisies ou importées."
        />
      ) : (
        <>
          {/* KPI cards — funnel overview */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard title="Contacts" value={String(totals.contacts)} icon={Users} variant="default" />
            <KpiCard title="Estimations" value={String(totals.estimations)} icon={FileText} subtitle={computeConversionRate(totals.contacts, totals.estimations)} />
            <KpiCard title="Mandats" value={String(totals.mandats)} icon={Target} subtitle={computeConversionRate(totals.estimations, totals.mandats)} />
            <KpiCard title="Compromis" value={String(totals.compromis)} icon={CheckCircle2} subtitle={computeConversionRate(totals.mandats, totals.compromis)} />
            <KpiCard title="Actes" value={String(totals.actes)} icon={TrendingUp} variant="success" subtitle={computeConversionRate(totals.compromis, totals.actes)} />
            <KpiCard title="CA généré" value={formatCurrency(totals.ca)} icon={BarChart3} variant="default" />
          </div>

          {/* Monthly breakdown table */}
          <SectionCard title="Détail mensuel">
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium">Mois</th>
                    <th className="text-right px-4 py-2.5 font-medium">Contacts</th>
                    <th className="text-right px-4 py-2.5 font-medium">Estimations</th>
                    <th className="text-right px-4 py-2.5 font-medium">Mandats</th>
                    <th className="text-right px-4 py-2.5 font-medium">Compromis</th>
                    <th className="text-right px-4 py-2.5 font-medium">Actes</th>
                    <th className="text-right px-4 py-2.5 font-medium">CA</th>
                    <th className="text-right px-4 py-2.5 font-medium">Taux global</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(kpis ?? []).map((k) => (
                    <tr key={k.period_month} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{MONTH_LABELS[k.period_month]}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{k.nb_contacts}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{k.nb_estimations}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{k.nb_mandats}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{k.nb_compromis}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{k.nb_actes}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{k.ca_generated ? formatCurrency(Number(k.ca_generated)) : '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {computeConversionRate(k.nb_contacts, k.nb_actes)}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-muted/50 font-medium">
                    <td className="px-4 py-2.5">Total</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{totals.contacts}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{totals.estimations}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{totals.mandats}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{totals.compromis}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{totals.actes}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totals.ca)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{computeConversionRate(totals.contacts, totals.actes)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Channel breakdown */}
          {channelTotals.size > 0 && (
            <SectionCard title="Performance par canal">
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2.5 font-medium">Canal</th>
                      <th className="text-right px-4 py-2.5 font-medium">Contacts</th>
                      <th className="text-right px-4 py-2.5 font-medium">Mandats</th>
                      <th className="text-right px-4 py-2.5 font-medium">Actes</th>
                      <th className="text-right px-4 py-2.5 font-medium">CA</th>
                      <th className="text-right px-4 py-2.5 font-medium">Taux conversion</th>
                      <th className="text-right px-4 py-2.5 font-medium">Part CA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...channelTotals.entries()].map(([channel, ct]) => (
                      <tr key={channel} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{channel}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{ct.contacts}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{ct.mandats}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{ct.actes}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(ct.ca)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{computeConversionRate(ct.contacts, ct.actes)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {totals.ca > 0 ? ((ct.ca / totals.ca) * 100).toFixed(1) + '%' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* NXT Perf placeholder */}
          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Connexion NXT Perf — import automatique des données commerciales. Disponible prochainement.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
