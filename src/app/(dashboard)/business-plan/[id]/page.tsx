import { BusinessPlanEditorPage } from '@/features/business-plan/components/bp-editor-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BusinessPlanEditorPage id={id} />;
}
