import { Suspense } from 'react';
import { RevenueListPage } from '@/features/revenue/components/revenue-list-page';
import { LoadingState } from '@/components/shared/loading-state';

export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="Chargement..." />}>
      <RevenueListPage />
    </Suspense>
  );
}
