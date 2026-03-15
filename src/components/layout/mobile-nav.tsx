'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Calendar,
  Users,
  Settings,
  X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';
import { useAgencyStore } from '@/stores/agency-store';

const NAV_ITEMS = [
  { label: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { label: 'Recettes', href: '/recettes', icon: TrendingUp },
  { label: 'Dépenses', href: '/depenses', icon: Receipt },
  { label: 'Périodes', href: '/periodes', icon: Calendar },
  { label: 'Comptable', href: '/comptable', icon: Users },
  { label: 'Paramètres', href: '/parametres', icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const activeAgency = useAgencyStore((s) => s.activeAgency);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" showCloseButton={false} className="w-72 !p-0 bg-sidebar text-sidebar-foreground">
        <SheetHeader className="px-4 h-16 flex flex-row items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
              NF
            </div>
            <SheetTitle className="text-sidebar-foreground text-sm font-semibold">
              NXT Finance
            </SheetTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {activeAgency && (
          <div className="px-4 py-2 text-xs text-sidebar-foreground/60">
            {activeAgency.name}
          </div>
        )}

        <Separator className="bg-sidebar-border" />

        <nav className="flex flex-col gap-1 px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
