import { Suspense } from 'react';
import { LoadingState } from '@/components/shared/loading-state';
import { PilotagePage } from '@/features/pilotage/components/pilotage-page';

export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="Chargement..." />}>
      <PilotagePage />
    </Suspense>
  );
}
