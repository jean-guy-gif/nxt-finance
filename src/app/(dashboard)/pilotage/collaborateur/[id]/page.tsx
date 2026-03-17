import { CollaboratorProfitabilityPage } from '@/features/pilotage/components/collaborator-profitability-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CollaboratorProfitabilityPage id={id} />;
}
