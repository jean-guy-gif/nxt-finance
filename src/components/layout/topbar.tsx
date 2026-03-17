'use client';

import { useState } from 'react';
import { Bell, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { useAgencyStore } from '@/stores/agency-store';
import { MEMBER_ROLE_LABELS } from '@/types/enums';
import { PeriodSelector } from './period-selector';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useAlertCount } from '@/features/alerts/hooks/use-alerts-v3';
import { NotificationPanel } from '@/features/alerts/components/notification-panel';

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);
  const clearAgency = useAgencyStore((s) => s.clear);
  const activeMembership = useAgencyStore((s) => s.activeMembership);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const router = useRouter();
  const { data: alertCount } = useAlertCount();
  const [notifOpen, setNotifOpen] = useState(false);

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  const roleLabel = activeMembership?.role
    ? MEMBER_ROLE_LABELS[activeMembership.role]
    : null;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearAuth();
    clearAgency();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b bg-card">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Period selector */}
      <div className="flex-1 flex items-center justify-start md:justify-start ml-2 md:ml-0">
        <PeriodSelector />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Notifications bell — opens V3 notification panel */}
        <button
          type="button"
          onClick={() => setNotifOpen(true)}
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors focus:outline-none"
        >
          <Bell className="h-4 w-4" />
          {!!alertCount && alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>
        <NotificationPanel open={notifOpen} onOpenChange={setNotifOpen} />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full focus:outline-none">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" className="w-52">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">
                {user?.full_name ?? 'Utilisateur'}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              {roleLabel && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {roleLabel}
                </p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
