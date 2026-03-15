'use client';

import { useAgencyStore } from '@/stores/agency-store';
import { AlertTriangle } from 'lucide-react';

export function DemoBanner() {
  const isDemo = useAgencyStore((s) => s.isDemo);

  if (!isDemo) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-400">
      <AlertTriangle className="inline-block mr-2 h-4 w-4" />
      Mode démonstration — Les données affichées sont simulées. Certaines actions sont limitées.
    </div>
  );
}
