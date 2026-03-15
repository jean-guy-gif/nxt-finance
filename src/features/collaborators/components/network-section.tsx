'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionCard } from '@/components/shared/section-card';
import { useAgencyStore } from '@/stores/agency-store';
import { useUpdateAgencySettings } from '@/features/settings/hooks/use-settings';
import type { AgencySettings } from '@/types/models';
import { Loader2, Check } from 'lucide-react';

interface NetworkSettings {
  has_network: boolean;
  network_name: string;
  default_network_rate: number;
}

export function NetworkSection() {
  const agency = useAgencyStore((s) => s.activeAgency);
  const settings = (agency?.settings ?? {}) as AgencySettings & Partial<NetworkSettings>;
  const mutation = useUpdateAgencySettings();

  const [hasNetwork, setHasNetwork] = useState(settings.has_network ?? false);
  const [networkName, setNetworkName] = useState(settings.network_name ?? '');
  const [networkRate, setNetworkRate] = useState(String(settings.default_network_rate ?? 0));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (agency) {
      const s = (agency.settings ?? {}) as AgencySettings & Partial<NetworkSettings>;
      setHasNetwork(s.has_network ?? false);
      setNetworkName(s.network_name ?? '');
      setNetworkRate(String(s.default_network_rate ?? 0));
    }
  }, [agency]);

  async function handleSave() {
    await mutation.mutateAsync({
      has_network: hasNetwork,
      network_name: hasNetwork ? networkName : '',
      default_network_rate: hasNetwork ? (parseFloat(networkRate) || 0) : 0,
    } as Partial<AgencySettings>);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SectionCard title="Réseau / Franchise">
      <div className="space-y-4 max-w-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setHasNetwork(!hasNetwork)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              hasNetwork ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                hasNetwork ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <Label className="cursor-pointer" onClick={() => setHasNetwork(!hasNetwork)}>
            L'agence appartient à un réseau
          </Label>
        </div>

        {hasNetwork && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="network-name">Nom du réseau</Label>
              <Input
                id="network-name"
                value={networkName}
                onChange={(e) => setNetworkName(e.target.value)}
                placeholder="Ex : Century 21, Orpi, IAD"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Taux réseau par défaut</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={networkRate}
                  onChange={(e) => setNetworkRate(e.target.value)}
                  className="pr-8"
                  placeholder="8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pourcentage prélevé par le réseau avant répartition agence/collaborateur.
              </p>
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={mutation.isPending}>
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
