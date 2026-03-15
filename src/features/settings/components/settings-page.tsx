'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useState } from 'react';
import { AgencySection } from './agency-section';
import { MembersSection } from './members-section';
import { ThresholdsSection } from './thresholds-section';
import { CollaboratorsSection } from '@/features/collaborators/components/collaborators-section';
import { NetworkSection } from '@/features/collaborators/components/network-section';

type SettingsTab = 'agency' | 'members' | 'collaborators' | 'thresholds';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('agency');
  const { canManageSettings } = usePermissions();

  if (!canManageSettings) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Paramètres"
          description="Vous n'avez pas les droits pour accéder aux paramètres."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Configurez votre agence et vos préférences"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)}>
        <TabsList>
          <TabsTrigger value="agency" className="text-xs">Agence</TabsTrigger>
          <TabsTrigger value="members" className="text-xs">Utilisateurs</TabsTrigger>
          <TabsTrigger value="collaborators" className="text-xs">Collaborateurs</TabsTrigger>
          <TabsTrigger value="thresholds" className="text-xs">Seuils et alertes</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'agency' && <AgencySection />}
      {activeTab === 'members' && <MembersSection />}
      {activeTab === 'collaborators' && (
        <div className="space-y-6">
          <NetworkSection />
          <CollaboratorsSection />
        </div>
      )}
      {activeTab === 'thresholds' && <ThresholdsSection />}
    </div>
  );
}
