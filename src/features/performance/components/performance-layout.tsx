'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TABS = [
  { key: '/performance', label: 'KPIs commerciaux' },
  { key: '/performance/pilotage', label: 'Unit Economics' },
];

export function PerformanceTabs() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1 mb-6">
      {TABS.map((tab) => {
        const isActive = pathname === tab.key;
        return (
          <Button
            key={tab.key}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className={cn('flex-1', !isActive && 'text-muted-foreground')}
            onClick={() => router.push(tab.key)}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}
