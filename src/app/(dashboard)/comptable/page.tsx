import { Suspense } from 'react';
import { AccountantPage } from '@/features/accountant/components/accountant-page';
import { LoadingState } from '@/components/shared/loading-state';

export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="Chargement..." />}>
      <AccountantPage />
    </Suspense>
  );
}
