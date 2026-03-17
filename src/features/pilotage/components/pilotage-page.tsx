'use client';
import { PageHeader } from '@/components/shared/page-header';

export function PilotagePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Pilotage rentabilité" description="Suivi de la rentabilité par collaborateur, activité et agence" />
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Dashboard rentabilité (T6)
      </div>
    </div>
  );
}
