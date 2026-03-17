'use client';
import { PageHeader } from '@/components/shared/page-header';
import { BackButton } from '@/components/shared/back-button';

export function CollaboratorProfitabilityPage({ id }: { id: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton fallback="/pilotage" label="Pilotage" />
        <h1 className="text-xl font-semibold">Rentabilité collaborateur</h1>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Fiche rentabilité (T7) — ID: {id}
      </div>
    </div>
  );
}
