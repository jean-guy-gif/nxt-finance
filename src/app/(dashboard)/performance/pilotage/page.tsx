import { UnitEconomicsPage } from '@/features/performance/components/unit-economics-page';
import { PerformanceTabs } from '@/features/performance/components/performance-layout';

export default function PerformancePilotagePage() {
  return (
    <>
      <PerformanceTabs />
      <UnitEconomicsPage />
    </>
  );
}
