import { Suspense } from 'react';
import { LoadingState } from '@/components/shared/loading-state';
import { BusinessPlanListPage } from '@/features/business-plan/components/bp-list-page';

export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="Chargement..." />}>
      <BusinessPlanListPage />
    </Suspense>
  );
}
