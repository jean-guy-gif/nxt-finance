'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionCard } from '@/components/shared/section-card';
import { CurrencyInput } from '@/components/shared/currency-input';
import { useAgencyStore } from '@/stores/agency-store';
import { useUpdateAgencySettings } from '../hooks/use-settings';
import {
  DEFAULT_TREASURY_THRESHOLD,
  DEFAULT_PREPARATION_DEADLINE_DAYS,
  DEFAULT_MISSING_DOCUMENTS_TOLERANCE,
} from '@/lib/constants';
import type { AgencySettings } from '@/types/models';
import { Loader2, Check } from 'lucide-react';

export function ThresholdsSection() {
  const agency = useAgencyStore((s) => s.activeAgency);
  const settings = (agency?.settings ?? {}) as AgencySettings;
  const mutation = useUpdateAgencySettings();

  const [treasury, setTreasury] = useState(
    String(settings.treasury_critical_threshold ?? DEFAULT_TREASURY_THRESHOLD)
  );
  const [deadline, setDeadline] = useState(
    String(settings.preparation_deadline_days ?? DEFAULT_PREPARATION_DEADLINE_DAYS)
  );
  const [tolerance, setTolerance] = useState(
    String(settings.missing_documents_tolerance ?? DEFAULT_MISSING_DOCUMENTS_TOLERANCE)
  );
  const [frequency, setFrequency] = useState<string>(
    settings.notification_frequency ?? 'weekly'
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (agency) {
      const s = (agency.settings ?? {}) as AgencySettings;
      setTreasury(String(s.treasury_critical_threshold ?? DEFAULT_TREASURY_THRESHOLD));
      setDeadline(String(s.preparation_deadline_days ?? DEFAULT_PREPARATION_DEADLINE_DAYS));
      setTolerance(String(s.missing_documents_tolerance ?? DEFAULT_MISSING_DOCUMENTS_TOLERANCE));
      setFrequency(s.notification_frequency ?? 'weekly');
    }
  }, [agency]);

  async function handleSave() {
    await mutation.mutateAsync({
      treasury_critical_threshold: parseFloat(treasury) || DEFAULT_TREASURY_THRESHOLD,
      preparation_deadline_days: parseInt(deadline) || DEFAULT_PREPARATION_DEADLINE_DAYS,
      missing_documents_tolerance: parseInt(tolerance) || DEFAULT_MISSING_DOCUMENTS_TOLERANCE,
      notification_frequency: frequency as AgencySettings['notification_frequency'],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Seuils de trésorerie">
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label>Seuil critique de trésorerie</Label>
            <CurrencyInput
              value={treasury}
              onChange={setTreasury}
              placeholder="5000"
            />
            <p className="text-xs text-muted-foreground">
              Une alerte critique sera déclenchée si la trésorerie visible passe sous ce seuil.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Préparation comptable">
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label htmlFor="deadline">Délai de préparation (jours avant fin de mois)</Label>
            <Input
              id="deadline"
              type="number"
              min={1}
              max={30}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Vous recevrez une alerte si la période n'est pas préparée avant ce délai.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tolerance">Tolérance pièces manquantes</Label>
            <Input
              id="tolerance"
              type="number"
              min={0}
              max={50}
              value={tolerance}
              onChange={(e) => setTolerance(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Nombre de pièces manquantes tolérées avant déclenchement d'alerte.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Notifications">
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <Label>Fréquence des résumés</Label>
            <Select value={frequency} onValueChange={(v) => { if (v) setFrequency(v); }}>
              <SelectTrigger className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Fréquence d'envoi du résumé périodique par email (bientôt disponible).
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="mr-2 h-4 w-4" />
          ) : null}
          {saved ? 'Enregistré' : 'Enregistrer les seuils'}
        </Button>
      </div>
    </div>
  );
}
