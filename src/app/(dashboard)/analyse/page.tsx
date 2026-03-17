import { Suspense } from 'react';
import { LoadingState } from '@/components/shared/loading-state';
import { AnalyseMainPage } from '@/features/bilan/components/analyse-main-page';

export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="Chargement..." />}>
      <AnalyseMainPage />
    </Suspense>
  );
}
