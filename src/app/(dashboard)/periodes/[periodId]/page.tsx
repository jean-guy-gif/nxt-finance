import { PeriodDetailPage } from '@/features/vat/components/period-detail-page';

export default async function Page({ params }: { params: Promise<{ periodId: string }> }) {
  const { periodId } = await params;
  return <PeriodDetailPage periodId={periodId} />;
}
