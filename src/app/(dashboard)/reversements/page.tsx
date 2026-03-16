import { Suspense } from 'react';
import { PayoutsPage } from '@/features/collaborators/components/payouts-page';
import { LoadingState } from '@/components/shared/loading-state';

export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="Chargement..." />}>
      <PayoutsPage />
    </Suspense>
  );
}
