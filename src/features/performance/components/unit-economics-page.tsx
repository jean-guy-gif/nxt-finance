'use client';

import { useState } from 'react';
import {
  Target, Users, FileText, CheckCircle2, TrendingUp,
  DollarSign, BarChart3, Percent, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { KpiCard } from '@/components/shared/kpi-card';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';
import { useUnitEconomicsYearly } from '../hooks/use-unit-economics';

function Metric({ label, value, subtitle, warn }: { label: string; value: string; subtitle?: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums', warn && 'text-amber-600')}>
        {value}
      </p>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function FunnelStep({
  label, count, rate, icon: Icon,
}: {
  label: string;
  count: number;
  rate: string | null;
  icon: typeof Users;
}) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-lg font-bold tabular-nums">{count}</span>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
      {rate && (
        <span className="text-[10px] font-medium text-primary">{rate}</span>
      )}
    </div>
  );
}

export function UnitEconomicsPage() {
  const selectedYear = useUiStore((s) => s.selectedYear);
  const [viewYear, setViewYear] = useState(selectedYear);
  const { data: ue, isLoading } = useUnitEconomicsYearly(viewYear);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pilotage performance" description="Unit Economics et ROI" />
        <LoadingState message="Calcul des indicateurs..." />
      </div>
    );
  }

  if (!ue || (ue.nb_contacts === 0 && ue.ca_total === 0)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pilotage performance" description="Unit Economics et ROI" />
        <EmptyState
          icon={BarChart3}
          title="Données insuffisantes"
          description="Saisissez vos KPIs commerciaux dans l'onglet Performance et enregistrez vos dépenses pour obtenir vos Unit Economics."
        />
      </div>
    );
  }

  const fmtOr = (v: number | null, suffix = ' €') => v != null ? formatCurrency(v) : '—';
  const fmtPct = (v: number | null) => v != null ? `${v.toFixed(1)}%` : '—';
  const fmtRatio = (v: number | null, suffix = '') => v != null ? `${v.toFixed(1)}${suffix}` : '—';
  const fmtX = (v: number | null) => v != null ? `×${v.toFixed(1)}` : '—';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilotage performance"
        description={`Unit Economics — ${viewYear}`}
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
          </div>
        }
      />

      {/* Visual funnel */}
      <SectionCard title="Entonnoir de conversion">
        <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
          <FunnelStep label="Contacts" count={ue.nb_contacts} rate={null} icon={Users} />
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <FunnelStep label="Estimations" count={ue.nb_estimations} rate={ue.contacts_par_estimation ? `1/${ue.contacts_par_estimation.toFixed(1)}` : null} icon={FileText} />
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <FunnelStep label="Mandats" count={ue.nb_mandats} rate={ue.estimations_par_mandat ? `1/${ue.estimations_par_mandat.toFixed(1)}` : null} icon={Target} />
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <FunnelStep label="Compromis" count={ue.nb_compromis} rate={ue.mandats_par_compromis ? `1/${ue.mandats_par_compromis.toFixed(1)}` : null} icon={CheckCircle2} />
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <FunnelStep label="Actes" count={ue.nb_actes} rate={ue.compromis_par_acte ? `1/${ue.compromis_par_acte.toFixed(1)}` : null} icon={TrendingUp} />
        </div>
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Taux de conversion global (contact → acte)</span>
          <span className="font-bold text-primary">
            {ue.contacts_par_vente ? `1 vente pour ${ue.contacts_par_vente.toFixed(0)} contacts` : '—'}
          </span>
        </div>
      </SectionCard>

      {/* KPI headline cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Coût marketing / vente"
          value={fmtOr(ue.cout_par_acte)}
          subtitle="Budget marketing par acte signé"
          icon={DollarSign}
          variant={ue.cout_par_acte != null && ue.cout_par_acte > 2000 ? 'warning' : 'default'}
        />
        <KpiCard
          title="Coût complet / vente"
          value={fmtOr(ue.cout_complet_par_acte)}
          subtitle="Toutes charges incluses"
          icon={Target}
          variant="warning"
        />
        <KpiCard
          title="CA moyen / vente"
          value={fmtOr(ue.ca_moyen_par_acte)}
          subtitle="Honoraires moyens par acte"
          icon={TrendingUp}
          variant="success"
        />
        <KpiCard
          title="Marge nette / vente"
          value={fmtOr(ue.marge_par_vente)}
          subtitle="CA moyen - coût complet"
          icon={BarChart3}
          variant={ue.marge_par_vente != null && ue.marge_par_vente < 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Bloc 1 — Coûts marketing par étape */}
      {ue.depenses_marketing > 0 && (
        <SectionCard title="Coût marketing par étape du funnel">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Metric label="/ Contact" value={fmtOr(ue.cout_par_contact)} />
            <Metric label="/ Estimation" value={fmtOr(ue.cout_par_estimation)} />
            <Metric label="/ Mandat" value={fmtOr(ue.cout_par_mandat)} />
            <Metric label="/ Compromis" value={fmtOr(ue.cout_par_compromis)} />
            <Metric label="/ Acte" value={fmtOr(ue.cout_par_acte)} />
          </div>
          <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
            Budget marketing total : {formatCurrency(ue.depenses_marketing)} — ROI : {fmtX(ue.roi_marketing_global)} (1€ investi → {fmtX(ue.roi_marketing_global)} de CA)
          </div>
        </SectionCard>
      )}

      {/* Bloc 2 — Coûts complets */}
      <SectionCard title="Coût complet par étape (toutes charges incluses)">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Metric label="/ Mandat" value={fmtOr(ue.cout_complet_par_mandat)} subtitle="Charges totales ÷ mandats" />
          <Metric label="/ Compromis" value={fmtOr(ue.cout_complet_par_compromis)} subtitle="Charges totales ÷ compromis" />
          <Metric label="/ Acte" value={fmtOr(ue.cout_complet_par_acte)} subtitle="Charges totales ÷ actes" warn={ue.cout_complet_par_acte != null && ue.ca_moyen_par_acte != null && ue.cout_complet_par_acte > ue.ca_moyen_par_acte} />
        </div>
        <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
          Charges totales : {formatCurrency(ue.charges_totales)} — Coût d&apos;acquisition marketing : {fmtPct(ue.cout_acquisition_par_euro_ca)} du CA
        </div>
      </SectionCard>

      {/* Bloc 3 — Rentabilité */}
      <SectionCard title="Rentabilité par transaction">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Metric label="CA moyen / mandat" value={fmtOr(ue.ca_moyen_par_mandat)} />
          <Metric label="CA moyen / compromis" value={fmtOr(ue.ca_moyen_par_compromis)} />
          <Metric label="CA moyen / acte" value={fmtOr(ue.ca_moyen_par_acte)} />
          <Metric
            label="Marge nette / vente"
            value={fmtOr(ue.marge_par_vente)}
            warn={ue.marge_par_vente != null && ue.marge_par_vente < 0}
            subtitle={ue.marge_par_vente != null && ue.marge_par_vente < 0 ? 'Chaque vente coûte plus qu\'elle ne rapporte' : undefined}
          />
        </div>
      </SectionCard>

      {/* Bloc 5 — Par canal */}
      {ue.has_channel_data ? (
        <SectionCard title="ROI par canal d'acquisition">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium">Canal</th>
                  <th className="text-right px-4 py-2.5 font-medium">Dépenses</th>
                  <th className="text-right px-4 py-2.5 font-medium">Contacts</th>
                  <th className="text-right px-4 py-2.5 font-medium">Coût/contact</th>
                  <th className="text-right px-4 py-2.5 font-medium">Compromis</th>
                  <th className="text-right px-4 py-2.5 font-medium">Coût/compromis</th>
                  <th className="text-right px-4 py-2.5 font-medium">CA</th>
                  <th className="text-right px-4 py-2.5 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ue.channels.map((ch) => (
                  <tr key={ch.channel} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{ch.channel}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(ch.depenses)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{ch.contacts}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{ch.cout_par_contact != null ? formatCurrency(ch.cout_par_contact) : '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{ch.compromis}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{ch.cout_par_compromis != null ? formatCurrency(ch.cout_par_compromis) : '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(ch.ca)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {ch.roi != null ? (
                        <StatusBadge
                          status={ch.roi >= 5 ? 'validated' : ch.roi >= 2 ? 'vigilance' : 'critical'}
                          label={`×${ch.roi.toFixed(1)}`}
                        />
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="ROI par canal d'acquisition">
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>Renseignez le canal d&apos;acquisition sur vos dépenses marketing pour voir le ROI par canal.</p>
            <p className="mt-1 text-xs">Dépenses → catégorie Publicité/Marketing → champ &quot;Canal d&apos;acquisition&quot;</p>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
