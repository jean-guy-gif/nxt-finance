'use client';

import { useRouter } from 'next/navigation';
import { Plus, BarChart3, FileText, ArrowRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useBalanceSheets } from '../hooks/use-balance-sheets';
import { useAnalyses, useCreateAnalysis, useInsights } from '@/features/analyse/hooks/use-analyses';
import { useToast } from '@/components/shared/toast';
import { getHealthLabel } from '@/features/analyse/services/ratio-engine/scoring';
import {
  BALANCE_SHEET_STATUS_LABELS,
  BALANCE_SHEET_SOURCE_TYPE_LABELS,
} from '@/features/bilan/types';
import {
  ANALYSIS_LEVEL_LABELS,
  ANALYSIS_STATUS_LABELS,
} from '@/features/analyse/types';
import type { BalanceSheetStatus } from '@/features/bilan/types';
import type { AnalysisStatus } from '@/features/analyse/types';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// StatusBadge variant mapping helpers
// ---------------------------------------------------------------------------

type StatusVariant = Parameters<typeof StatusBadge>[0]['status'];

const BALANCE_SHEET_STATUS_VARIANT: Record<string, StatusVariant> = {
  uploaded: 'pending',
  parsing: 'processing',
  parsed: 'completed',
  validating: 'to_verify',
  validated: 'validated',
  rejected: 'failed',
};

const ANALYSIS_STATUS_VARIANT: Record<string, StatusVariant> = {
  computing: 'processing',
  ready: 'completed',
  archived: 'draft',
};

// ---------------------------------------------------------------------------
// Health score color helpers
// ---------------------------------------------------------------------------

const HEALTH_COLOR_CLASSES: Record<string, string> = {
  green: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  orange: 'text-orange-600 bg-orange-50 border-orange-200',
  red: 'text-red-600 bg-red-50 border-red-200',
};

const HEALTH_TEXT_CLASSES: Record<string, string> = {
  green: 'text-emerald-600',
  yellow: 'text-yellow-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnalyseMainPage() {
  const router = useRouter();

  const {
    data: sheets,
    isLoading: sheetsLoading,
    error: sheetsError,
    refetch: refetchSheets,
  } = useBalanceSheets();

  const {
    data: analyses,
    isLoading: analysesLoading,
    error: analysesError,
    refetch: refetchAnalyses,
  } = useAnalyses();

  const createAnalysis = useCreateAnalysis();
  const { toast } = useToast();

  const isLoading = sheetsLoading || analysesLoading;
  const hasError = sheetsError || analysesError;
  const hasBilans = !!sheets && sheets.length > 0;
  const hasAnalyses = !!analyses && analyses.length > 0;
  const canCreateAnalysis = hasBilans;

  // Latest ready analysis for freshness banner / health score
  const latestAnalysis = analyses
    ?.filter((a) => a.is_current)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

  const handleCreateAnalysis = () => {
    const callbacks = {
      onSuccess: (data: { analysisId: string }) => {
        toast('Analyse lancée avec succès', 'success');
        router.push(`/analyse/${data.analysisId}`);
      },
      onError: () => {
        toast('Impossible de lancer l\'analyse. Vérifiez votre connexion.', 'error');
      },
    };

    if (hasBilans && sheets) {
      const latestSheet = [...sheets].sort(
        (a, b) => b.fiscal_year - a.fiscal_year
      )[0];
      createAnalysis.mutate(
        { fiscalYear: latestSheet.fiscal_year, balanceSheetId: latestSheet.id },
        callbacks
      );
    } else {
      const currentYear = new Date().getFullYear();
      createAnalysis.mutate(
        { fiscalYear: currentYear },
        callbacks
      );
    }
  };

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analyse financiere"
          description="Import et analyse de votre bilan comptable"
        />
        <LoadingState message="Chargement des bilans et analyses..." />
      </div>
    );
  }

  // ---- Error ----
  if (hasError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analyse financiere"
          description="Import et analyse de votre bilan comptable"
        />
        <ErrorState
          onRetry={() => {
            refetchSheets();
            refetchAnalyses();
          }}
        />
      </div>
    );
  }

  // ---- Full empty state: no bilans AND no analyses ----
  if (!hasBilans && !hasAnalyses) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analyse financière"
          description="Analysez la santé financière de votre agence"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push('/analyse/import')}>
                <Plus className="mr-2 h-4 w-4" />
                Importer un bilan
              </Button>
              <Button
                onClick={handleCreateAnalysis}
                disabled={createAnalysis.isPending}
              >
                <Activity className="mr-2 h-4 w-4" />
                {createAnalysis.isPending ? 'Lancement...' : 'Analyser mes données NXT'}
              </Button>
            </div>
          }
        />
        <EmptyState
          icon={BarChart3}
          title="Lancez votre première analyse"
          description="Analysez vos recettes, dépenses et collaborateurs pour obtenir votre score de santé financière. Vous pouvez aussi importer un bilan comptable pour une analyse complète."
          action={{
            label: 'Analyser mes données NXT',
            onClick: handleCreateAnalysis,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <PageHeader
        title="Analyse financiere"
        description="Import et analyse de votre bilan comptable"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/analyse/import')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Importer un bilan
            </Button>
            <Button
              onClick={handleCreateAnalysis}
              disabled={createAnalysis.isPending}
            >
              <Activity className="mr-2 h-4 w-4" />
              {createAnalysis.isPending
                ? 'Lancement...'
                : 'Lancer une analyse'}
            </Button>
          </div>
        }
      />

      {/* ---- Freshness banner ---- */}
      {latestAnalysis && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="text-sm text-muted-foreground">
              Derniere analyse :{' '}
              <span className="font-medium text-foreground">
                {new Date(latestAnalysis.created_at).toLocaleDateString(
                  'fr-FR',
                  { day: 'numeric', month: 'long', year: 'numeric' }
                )}
              </span>
            </div>
            <StatusBadge
              status={
                ANALYSIS_STATUS_VARIANT[latestAnalysis.status] ?? 'draft'
              }
              label={
                ANALYSIS_STATUS_LABELS[
                  latestAnalysis.status as AnalysisStatus
                ] ?? latestAnalysis.status
              }
            />
            <StatusBadge
              status="info"
              label={
                ANALYSIS_LEVEL_LABELS[latestAnalysis.analysis_level] ??
                latestAnalysis.analysis_level
              }
            />
            {latestAnalysis.health_score !== null && (() => {
              const health = getHealthLabel(latestAnalysis.health_score);
              return (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 border',
                    HEALTH_COLOR_CLASSES[health.color]
                  )}
                >
                  {latestAnalysis.health_score}/100
                </span>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* ---- Health score card ---- */}
      {latestAnalysis?.status === 'ready' &&
        latestAnalysis.health_score !== null && (() => {
          const health = getHealthLabel(latestAnalysis.health_score);
          return (
            <Card className="border-2">
              <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Score de sante
                </p>
                <p
                  className={cn(
                    'text-5xl font-bold',
                    HEALTH_TEXT_CLASSES[health.color]
                  )}
                >
                  {latestAnalysis.health_score}
                </p>
                <p className="text-sm text-muted-foreground">
                  {health.label}
                </p>
                <Button
                  variant="link"
                  className="mt-1"
                  onClick={() =>
                    router.push(`/analyse/${latestAnalysis.id}`)
                  }
                >
                  Voir le détail
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })()}

      {/* ---- Director summary ---- */}
      {latestAnalysis?.status === 'ready' && (
        <DirectorSummaryBlock analysisId={latestAnalysis.id} />
      )}

      {/* ---- Bilans section ---- */}
      <SectionCard
        title="Bilans importes"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/analyse/import')}
          >
            <Plus className="mr-1 h-4 w-4" />
            Importer
          </Button>
        }
      >
        {hasBilans ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sheets.map((sheet) => (
              <Card
                key={sheet.id}
                className="cursor-default hover:shadow-sm transition-shadow"
              >
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {sheet.fiscal_year}
                      </span>
                    </div>
                    <StatusBadge
                      status={
                        BALANCE_SHEET_STATUS_VARIANT[sheet.status] ?? 'draft'
                      }
                      label={
                        BALANCE_SHEET_STATUS_LABELS[
                          sheet.status as BalanceSheetStatus
                        ] ?? sheet.status
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {BALANCE_SHEET_SOURCE_TYPE_LABELS[sheet.source_type] ??
                      sheet.source_type}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Confiance : {Math.round(sheet.overall_confidence)}%
                    </span>
                    <span>
                      {new Date(sheet.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            Aucun bilan importe.
          </p>
        )}
      </SectionCard>

      {/* ---- Analyses section ---- */}
      <SectionCard title="Analyses">
        {hasAnalyses ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyses.map((analysis) => {
              const health =
                analysis.health_score !== null
                  ? getHealthLabel(analysis.health_score)
                  : null;
              return (
                <Card
                  key={analysis.id}
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => router.push(`/analyse/${analysis.id}`)}
                >
                  <CardContent className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {analysis.fiscal_year}
                        </span>
                      </div>
                      <StatusBadge
                        status={
                          ANALYSIS_STATUS_VARIANT[analysis.status] ?? 'draft'
                        }
                        label={
                          ANALYSIS_STATUS_LABELS[
                            analysis.status as AnalysisStatus
                          ] ?? analysis.status
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ANALYSIS_LEVEL_LABELS[analysis.analysis_level] ??
                        analysis.analysis_level}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {health && analysis.health_score !== null ? (
                        <span
                          className={cn(
                            'font-medium',
                            HEALTH_TEXT_CLASSES[health.color]
                          )}
                        >
                          Score : {analysis.health_score}/100
                        </span>
                      ) : (
                        <span>--</span>
                      )}
                      <span>
                        {new Date(analysis.created_at).toLocaleDateString(
                          'fr-FR'
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Activity}
            title="Lancez votre premiere analyse"
            description="Vos bilans sont prets. Lancez une analyse pour obtenir vos ratios financiers et votre score de sante."
            action={
              canCreateAnalysis
                ? {
                    label: 'Lancer une analyse',
                    onClick: handleCreateAnalysis,
                  }
                : undefined
            }
          />
        )}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Director Summary sub-component
// ---------------------------------------------------------------------------

function DirectorSummaryBlock({ analysisId }: { analysisId: string }) {
  const { data: insights, isFetching } = useInsights(analysisId);
  const directorSummary = insights?.find((i) => i.category === 'director_summary');

  if (!directorSummary) {
    // Still loading or LLM unavailable
    const message = isFetching
      ? 'Synthèse dirigeant en cours de rédaction...'
      : 'Synthèse dirigeant non disponible — consultez les ratios pour le détail.';
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 text-sm text-muted-foreground italic">
          {message}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="py-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Synthèse dirigeant
        </p>
        <p className="text-sm leading-relaxed whitespace-pre-line">
          {directorSummary.content}
        </p>
      </CardContent>
    </Card>
  );
}
