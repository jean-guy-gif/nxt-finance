'use client';

import { useRouter } from 'next/navigation';
import { Plus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useBalanceSheets } from '../hooks/use-balance-sheets';
import { LoadingState } from '@/components/shared/loading-state';

export function AnalyseMainPage() {
  const router = useRouter();
  const { data: sheets, isLoading } = useBalanceSheets();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analyse financière" description="Import et analyse de votre bilan comptable" />
        <LoadingState message="Chargement des bilans..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyse financière"
        description="Import et analyse de votre bilan comptable"
        actions={
          <Button onClick={() => router.push('/analyse/import')}>
            <Plus className="mr-2 h-4 w-4" />
            Importer un bilan
          </Button>
        }
      />

      {(!sheets || sheets.length === 0) ? (
        <EmptyState
          icon={BarChart3}
          title="Aucun bilan importé"
          description="Importez votre premier bilan comptable pour obtenir une analyse financière complète de votre agence."
          action={{
            label: 'Importer un bilan',
            onClick: () => router.push('/analyse/import'),
          }}
        />
      ) : (
        <div className="text-sm text-muted-foreground">
          {/* Placeholder: bilan list will be built in T6 */}
          {sheets.length} bilan(s) importé(s)
        </div>
      )}
    </div>
  );
}
