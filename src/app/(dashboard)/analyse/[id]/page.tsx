import { AnalysisDetailPage } from '@/features/analyse/components/analysis-detail-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnalysisDetailPage id={id} />;
}
