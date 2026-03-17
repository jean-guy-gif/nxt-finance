'use client';

import { BackButton } from '@/components/shared/back-button';

export function BusinessPlanEditorPage({ id }: { id: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton fallback="/business-plan" label="Business Plans" />
        <h1 className="text-xl font-semibold">Business Plan</h1>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Éditeur BP (T6) — ID: {id}
      </div>
    </div>
  );
}
