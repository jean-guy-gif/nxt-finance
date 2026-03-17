'use client';

import { BackButton } from '@/components/shared/back-button';

export function ImportWizard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton fallback="/analyse" label="Analyse" />
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Import bilan comptable
          </h1>
          <p className="text-sm text-muted-foreground">
            Importez et validez votre bilan en 4 étapes
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Wizard à implémenter (T6)
      </div>
    </div>
  );
}
