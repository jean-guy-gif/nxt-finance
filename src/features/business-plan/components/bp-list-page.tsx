'use client';

import { Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { useBusinessPlans } from '../hooks/use-business-plans';

export function BusinessPlanListPage() {
  const { data: plans, isLoading } = useBusinessPlans();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Business Plans" />
        <LoadingState message="Chargement..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Plans"
        description="Projections financières N+1"
        actions={
          <Button onClick={() => {}}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau plan
          </Button>
        }
      />
      {(!plans || plans.length === 0) ? (
        <EmptyState
          icon={TrendingUp}
          title="Aucun business plan"
          description="Créez votre premier business plan pour projeter votre activité."
          action={{ label: 'Créer un business plan', onClick: () => {} }}
        />
      ) : (
        <div className="text-sm text-muted-foreground">{plans.length} plan(s)</div>
      )}
    </div>
  );
}
