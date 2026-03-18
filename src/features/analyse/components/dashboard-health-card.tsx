'use client';

import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, BarChart3, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalyses } from '../hooks/use-analyses';
import { getHealthLabel } from '../services/ratio-engine/scoring';
import { formatCurrency } from '@/lib/formatters';

export function DashboardHealthCard() {
  const router = useRouter();
  const { data: analyses, isLoading } = useAnalyses();

  // Find the latest ready analysis
  const latestAnalysis = analyses?.find((a) => a.status === 'ready' && a.is_current);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Chargement santé financière...</span>
      </div>
    );
  }

  if (!latestAnalysis || latestAnalysis.health_score == null) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Santé financière</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Importez un bilan et lancez une analyse pour obtenir votre score de santé financière.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push('/analyse')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Analyse financière
        </Button>
      </div>
    );
  }

  const score = latestAnalysis.health_score;
  const { label, color } = getHealthLabel(score);
  const temporal = latestAnalysis.temporal_data;
  const caTrend = temporal?.trends?.ca;
  const projection = temporal?.projection;

  const colorClasses = {
    green: 'text-green-600 bg-green-50 border-green-200',
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
    red: 'text-red-600 bg-red-50 border-red-200',
  };

  const TrendIcon = caTrend?.direction === 'up' ? TrendingUp
    : caTrend?.direction === 'down' ? TrendingDown
    : Minus;

  const trendColor = caTrend?.direction === 'up' ? 'text-emerald-600'
    : caTrend?.direction === 'down' ? 'text-red-600'
    : 'text-muted-foreground';

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h3 className="font-semibold">Santé financière</h3>
        </div>
        <span className="text-3xl font-bold">{score}/100</span>
      </div>
      <p className="text-sm mb-3">{label}</p>

      {/* Temporal enrichments */}
      {(caTrend || projection) && (
        <div className="flex flex-wrap items-center gap-4 text-xs mb-3 pt-2 border-t border-current/10">
          {caTrend && (
            <span className={`inline-flex items-center gap-1 font-medium ${trendColor}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              CA 3 mois : {caTrend.variation_pct > 0 ? '+' : ''}{caTrend.variation_pct.toFixed(1)}%
            </span>
          )}
          {projection && (
            <span className="inline-flex items-center gap-1 font-medium">
              Projection : {formatCurrency(projection.ca_projected)}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs opacity-75">
          Exercice {latestAnalysis.fiscal_year}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => router.push(`/analyse/${latestAnalysis.id}`)}
        >
          Voir le détail
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
