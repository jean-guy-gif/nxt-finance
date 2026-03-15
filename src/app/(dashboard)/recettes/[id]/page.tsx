import { RevenueDetailPage } from '@/features/revenue/components/revenue-detail-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RevenueDetailPage id={id} />;
}
