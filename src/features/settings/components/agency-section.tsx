'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionCard } from '@/components/shared/section-card';
import { useAgencyStore } from '@/stores/agency-store';
import { useUpdateAgencyInfo } from '../hooks/use-settings';
import { Loader2, Check } from 'lucide-react';

export function AgencySection() {
  const agency = useAgencyStore((s) => s.activeAgency);
  const isDemo = useAgencyStore((s) => s.isDemo);
  const mutation = useUpdateAgencyInfo();

  const [name, setName] = useState(agency?.name ?? '');
  const [siret, setSiret] = useState(agency?.siret ?? '');
  const [address, setAddress] = useState(agency?.address ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (agency) {
      setName(agency.name);
      setSiret(agency.siret ?? '');
      setAddress(agency.address ?? '');
    }
  }, [agency]);

  async function handleSave() {
    await mutation.mutateAsync({ name, siret: siret || undefined, address: address || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const hasChanges =
    name !== (agency?.name ?? '') ||
    siret !== (agency?.siret ?? '') ||
    address !== (agency?.address ?? '');

  return (
    <SectionCard title="Informations de l'agence">
      {isDemo && (
        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md mb-4">
          Mode démonstration — les modifications seront réinitialisées.
        </p>
      )}

      <div className="space-y-4 max-w-lg">
        <div className="space-y-1.5">
          <Label htmlFor="agency-name">Nom de l'agence</Label>
          <Input
            id="agency-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agency-siret">SIRET</Label>
          <Input
            id="agency-siret"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            placeholder="12345678901234"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agency-address">Adresse</Label>
          <Input
            id="agency-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="42 avenue des Champs-Élysées, 75008 Paris"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || mutation.isPending || !name}
        >
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="mr-2 h-4 w-4" />
          ) : null}
          {saved ? 'Enregistré' : 'Enregistrer'}
        </Button>
      </div>
    </SectionCard>
  );
}
