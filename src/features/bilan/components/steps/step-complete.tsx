'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBalanceSheet } from '../../hooks/use-balance-sheets';
import { useCreateAnalysis } from '@/features/analyse/hooks/use-analyses';
import { BALANCE_SHEET_SOURCE_TYPE_LABELS } from '@/types/enums';

interface StepCompleteProps {
  balanceSheetId: string;
  onReset: () => void;
}

export function StepComplete({ balanceSheetId, onReset }: StepCompleteProps) {
  const router = useRouter();
  const { data: balanceSheet } = useBalanceSheet(balanceSheetId);
  const createAnalysis = useCreateAnalysis();

  const itemCount = balanceSheet?.items?.length ?? 0;

  function handleLaunchAnalysis() {
    if (!balanceSheet) return;
    createAnalysis.mutate(
      {
        fiscalYear: balanceSheet.fiscal_year,
        balanceSheetId: balanceSheet.id,
      },
      {
        onSuccess: (data) => {
          router.push(`/analyse/${data.analysisId}`);
        },
      }
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
      </div>

      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">Bilan validé avec succès</h2>
        <p className="text-sm text-muted-foreground">
          Le bilan comptable a été importé et validé.
        </p>
      </div>

      {/* Summary */}
      {balanceSheet && (
        <div className="w-full max-w-sm rounded-lg border bg-card p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Exercice fiscal</span>
            <span className="font-medium">{balanceSheet.fiscal_year}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Source</span>
            <span className="font-medium">
              {BALANCE_SHEET_SOURCE_TYPE_LABELS[balanceSheet.source_type]}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nombre de postes</span>
            <span className="font-medium">{itemCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Confiance globale</span>
            <span className="font-medium">{balanceSheet.overall_confidence}%</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button
          onClick={handleLaunchAnalysis}
          disabled={createAnalysis.isPending || !balanceSheet}
          className="min-w-[200px]"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          {createAnalysis.isPending ? 'Lancement...' : 'Lancer l\'analyse financière'}
        </Button>
        <Button variant="outline" onClick={onReset}>
          Importer un autre bilan
        </Button>
      </div>
    </div>
  );
}
