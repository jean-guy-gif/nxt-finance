'use client';

import { Bell, LogOut, Menu, AlertCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { useAgencyStore } from '@/stores/agency-store';
import { MEMBER_ROLE_LABELS, ALERT_CATEGORY_LABELS, type AlertLevel } from '@/types/enums';
import { PeriodSelector } from './period-selector';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useUnreadAlertCount } from '@/features/dashboard/hooks/use-dashboard';
import { useAlerts, useMarkAlertRead } from '@/features/alerts/hooks/use-alerts';
import { cn } from '@/lib/utils';

const levelIcons: Record<AlertLevel, typeof Info> = {
  info: Info,
  vigilance: AlertTriangle,
  critical: AlertCircle,
};

const levelColors: Record<AlertLevel, string> = {
  info: 'text-blue-600',
  vigilance: 'text-amber-600',
  critical: 'text-red-600',
};

const categoryRoutes: Record<string, string> = {
  treasury: '/recettes',
  vat: '/periodes',
  pre_accounting: '/depenses',
  accountant: '/comptable',
};

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);
  const clearAgency = useAgencyStore((s) => s.clear);
  const activeMembership = useAgencyStore((s) => s.activeMembership);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const router = useRouter();
  const { data: unreadCount } = useUnreadAlertCount();
  const { data: alerts } = useAlerts(8);
  const markRead = useMarkAlertRead();

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

  function handleAlertClick(alertId: string, category: string) {
    markRead.mutate(alertId);
    const route = categoryRoutes[category] ?? '/';
    router.push(route);
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
        {/* Notifications dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors focus:outline-none">
            <Bell className="h-4 w-4" />
            {!!unreadCount && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" className="w-80">
            <div className="px-3 py-2 flex items-center justify-between">
              <p className="text-sm font-medium">Notifications</p>
              {!!unreadCount && unreadCount > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-72">
              {alerts && alerts.length > 0 ? (
                alerts.map((alert) => {
                  const Icon = levelIcons[alert.level];
                  return (
                    <DropdownMenuItem
                      key={alert.id}
                      onClick={() => handleAlertClick(alert.id, alert.category)}
                      className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer"
                    >
                      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', levelColors[alert.level])} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm leading-snug', !alert.is_read && 'font-medium')}>
                          {alert.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {ALERT_CATEGORY_LABELS[alert.category]}
                        </p>
                      </div>
                      {!alert.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Aucune notification
                </div>
              )}
            </ScrollArea>
            {alerts && alerts.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push('/')}
                  className="justify-center text-xs text-muted-foreground"
                >
                  Voir le tableau de bord
                  <ExternalLink className="ml-1 h-3 w-3" />
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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
