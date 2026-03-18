import { KpisPage } from '@/features/performance/components/kpis-page';
import { PerformanceTabs } from '@/features/performance/components/performance-layout';

export default function PerformancePage() {
  return (
    <>
      <PerformanceTabs />
      <KpisPage />
    </>
  );
}
