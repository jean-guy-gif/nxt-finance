import { Suspense } from 'react';
import { LoadingState } from '@/components/shared/loading-state';
import { ImportWizard } from '@/features/bilan/components/import-wizard';

export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="Chargement..." />}>
      <ImportWizard />
    </Suspense>
  );
}
