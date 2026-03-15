'use client';

import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAgencyStore } from '@/stores/agency-store';
import { useSessionContext } from './session-provider';
import { cn } from '@/lib/utils';

/**
 * Agency switcher for multi-agency users.
 * Only renders if user has more than one agency.
 */
export function AgencySwitcher() {
  const { memberships, switchAgency } = useSessionContext();
  const activeAgency = useAgencyStore((s) => s.activeAgency);

  if (memberships.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/50 transition-colors w-full text-left">
        <Building2 className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
        <span className="flex-1 truncate text-sidebar-foreground/80">
          {activeAgency?.name ?? 'Sélectionner'}
        </span>
        <ChevronsUpDown className="h-3 w-3 text-sidebar-foreground/40" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-56">
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.agency_id}
            onClick={() => switchAgency(m.agency_id)}
          >
            <div className="flex items-center gap-2 flex-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{m.agency.name}</span>
              {m.agency.is_demo && (
                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  Démo
                </span>
              )}
            </div>
            {m.agency_id === activeAgency?.id && (
              <Check className={cn('h-4 w-4 text-primary')} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
