'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useSession } from '../hooks/use-session';
import type { Agency, AgencyMember } from '@/types/models';
import { Loader2 } from 'lucide-react';

interface SessionContext {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  switchAgency: (agencyId: string) => Promise<void>;
  memberships: (AgencyMember & { agency: Agency })[];
}

const SessionCtx = createContext<SessionContext | null>(null);

export function useSessionContext(): SessionContext {
  const ctx = useContext(SessionCtx);
  if (!ctx) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return ctx;
}

/**
 * Wraps the dashboard layout.
 * Hydrates auth + agency stores from Supabase, shows loading screen while initializing.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSession();

  // Full-screen loading while session initializes
  if (session.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            NF
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (session.error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive font-bold text-lg">
            !
          </div>
          <p className="text-sm text-destructive">{session.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-primary underline hover:no-underline"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <SessionCtx.Provider value={session}>{children}</SessionCtx.Provider>
  );
}
