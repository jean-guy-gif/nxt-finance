'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Building2, Landmark, ArrowRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatters';
import { useAgencyStore } from '@/stores/agency-store';
import { useActiveCollaborators } from '@/features/collaborators/hooks/use-collaborators';
import { calculateCommission } from '@/features/collaborators/services/commission-service';
import {
  COLLABORATOR_TYPE_LABELS,
  COMPENSATION_TYPE_LABELS,
  getCompensationType,
} from '@/types/enums';
import type { Collaborator } from '@/types/models';
import type { AgencySettings } from '@/types/models';

interface NetworkSettings {
  has_network?: boolean;
  network_name?: string;
  default_network_rate?: number;
}

interface CommissionSplitBlockProps {
  /** Current revenue amount (gross commission) */
  grossAmount: number;
  /** Currently selected collaborator ID */
  selectedCollaboratorId: string | null;
  /** Called when collaborator selection changes */
  onCollaboratorChange: (collaboratorId: string | null) => void;
  /** Called when split parameters change (for live preview + save) */
  onSplitChange: (split: SplitParams | null) => void;
  /** Initial network rate override (from existing split) */
  initialNetworkRate?: number;
  /** Initial collaborator rate override (from existing split) */
  initialCollaboratorRate?: number;
}

export interface SplitParams {
  collaboratorId: string;
  collaboratorType: Collaborator['type'];
  networkRate: number;
  collaboratorRate: number;
  // Calculated
  networkAmount: number;
  agencyRate: number;
  agencyAmount: number;
  collaboratorAmount: number;
}

export function CommissionSplitBlock({
  grossAmount,
  selectedCollaboratorId,
  onCollaboratorChange,
  onSplitChange,
  initialNetworkRate,
  initialCollaboratorRate,
}: CommissionSplitBlockProps) {
  const { data: collaborators } = useActiveCollaborators();
  const agency = useAgencyStore((s) => s.activeAgency);
  const networkSettings = (agency?.settings ?? {}) as AgencySettings & NetworkSettings;

  const hasNetwork = networkSettings.has_network ?? false;
  const defaultNetworkRate = hasNetwork ? (networkSettings.default_network_rate ?? 0) : 0;

  const [networkRate, setNetworkRate] = useState(initialNetworkRate ?? defaultNetworkRate);
  const [collaboratorRate, setCollaboratorRate] = useState(initialCollaboratorRate ?? 50);
  const [prevCollaboratorId, setPrevCollaboratorId] = useState(selectedCollaboratorId);

  const selectedCollaborator = useMemo(
    () => collaborators?.find((c) => c.id === selectedCollaboratorId) ?? null,
    [collaborators, selectedCollaboratorId]
  );

  // Update rates when collaborator selection changes
  useEffect(() => {
    if (!selectedCollaborator) return;

    const isNewSelection = selectedCollaboratorId !== prevCollaboratorId;
    setPrevCollaboratorId(selectedCollaboratorId);

    if (isNewSelection) {
      // Always load the new collaborator's default rate when switching
      setCollaboratorRate(selectedCollaborator.default_split_rate);
      if (!hasNetwork) {
        setNetworkRate(0);
      } else {
        setNetworkRate(defaultNetworkRate);
      }
    }
  }, [selectedCollaborator, selectedCollaboratorId, prevCollaboratorId, hasNetwork, defaultNetworkRate]);

  // Calculate and notify parent
  const calc = useMemo(() => {
    if (!selectedCollaborator || grossAmount <= 0) return null;
    const result = calculateCommission({
      grossAmount,
      networkRate,
      collaboratorRate,
    });
    return {
      collaboratorId: selectedCollaborator.id,
      collaboratorType: selectedCollaborator.type,
      networkRate,
      collaboratorRate,
      ...result,
    } satisfies SplitParams;
  }, [selectedCollaborator, grossAmount, networkRate, collaboratorRate]);

  useEffect(() => {
    onSplitChange(calc);
  }, [calc, onSplitChange]);

  const compensationLabel = selectedCollaborator
    ? COMPENSATION_TYPE_LABELS[getCompensationType(selectedCollaborator.type)]
    : '';

  const isSalarie = selectedCollaborator?.type === 'salarie';

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4 text-muted-foreground" />
        Répartition de la commission
      </div>

      {/* Collaborator selector */}
      <div className="space-y-1.5">
        <Label>Collaborateur</Label>
        <Select
          value={selectedCollaboratorId ?? '__none__'}
          onValueChange={(v) => onCollaboratorChange(v === '__none__' ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Aucun collaborateur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Aucun collaborateur</SelectItem>
            {(collaborators ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name} — {COLLABORATOR_TYPE_LABELS[c.type]} ({c.default_split_rate}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Split config — only when collaborator is selected */}
      {selectedCollaborator && grossAmount > 0 && (
        <>
          {/* Rates */}
          <div className="grid grid-cols-2 gap-4">
            {hasNetwork && (
              <div className="space-y-1.5">
                <Label className="text-xs">Taux réseau</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={networkRate}
                    onChange={(e) => setNetworkRate(parseFloat(e.target.value) || 0)}
                    className="pr-8 h-8 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Taux collaborateur</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={collaboratorRate}
                  onChange={(e) => setCollaboratorRate(parseFloat(e.target.value) || 0)}
                  className="pr-8 h-8 text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Live calculation preview */}
          {calc && (
            <div className="rounded-md border bg-card p-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Répartition calculée — {compensationLabel}
              </p>

              <div className="text-sm space-y-1.5">
                {/* Gross */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Commission brute</span>
                  <span className="font-medium">{formatCurrency(grossAmount)}</span>
                </div>

                {/* Network */}
                {hasNetwork && calc.networkAmount > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Landmark className="h-3 w-3" />
                      Réseau ({networkRate}%)
                    </span>
                    <span>− {formatCurrency(calc.networkAmount)}</span>
                  </div>
                )}

                {/* Agency */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    Part agence ({calc.agencyRate.toFixed(1)}%)
                  </span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(calc.agencyAmount)}
                  </span>
                </div>

                {/* Collaborator */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {isSalarie ? 'Coût salarial estimé' : 'Part collaborateur'} ({collaboratorRate}%)
                  </span>
                  <span className={`font-semibold ${isSalarie ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(calc.collaboratorAmount)}
                  </span>
                </div>
              </div>

              {/* Disclaimer for salarié */}
              {isSalarie && (
                <p className="text-[10px] text-muted-foreground/70 border-t pt-1.5 mt-1.5">
                  Indicateur de pilotage — ne constitue pas un calcul de paie ou de charges sociales.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
