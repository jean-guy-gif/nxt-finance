'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useAgencyStore } from '@/stores/agency-store';
import {
  fetchUserProfile,
  fetchUserMemberships,
  resolveActiveAgency,
  savePreferredAgency,
  getPreferredAgency,
} from '../services/auth-service';
import type { Agency, AgencyMember } from '@/types/models';

interface SessionState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}

/**
 * Core session hook — handles auth state, profile hydration, and agency selection.
 * Should be used once at the dashboard layout level via SessionProvider.
 */
export function useSession(): SessionState & {
  switchAgency: (agencyId: string) => Promise<void>;
  memberships: (AgencyMember & { agency: Agency })[];
} {
  const [state, setState] = useState<SessionState>({
    isLoading: true,
    isReady: false,
    error: null,
  });
  const [memberships, setMemberships] = useState<
    (AgencyMember & { agency: Agency })[]
  >([]);

  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clear);
  const setActiveAgency = useAgencyStore((s) => s.setActiveAgency);
  const clearAgency = useAgencyStore((s) => s.clear);

  const hydrate = useCallback(async () => {
    const supabase = createClient();

    try {
      // 1. Get current auth session
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        clearAuth();
        clearAgency();
        setState({ isLoading: false, isReady: true, error: null });
        return;
      }

      // 2. Fetch user profile — must already exist (created at signup or via seed)
      // No implicit profile creation here: if the profile is missing, it's an
      // onboarding gap that should be handled explicitly, not silently patched.
      const profile = await fetchUserProfile(supabase, authUser.id);
      if (!profile) {
        setState({
          isLoading: false,
          isReady: false,
          error:
            'Profil utilisateur introuvable. Contactez l\'administrateur.',
        });
        return;
      }
      setUser(profile);

      // 3. Fetch memberships
      const userMemberships = await fetchUserMemberships(
        supabase,
        authUser.id
      );
      setMemberships(userMemberships);

      // 4. Resolve active agency
      // The preferred agency from localStorage is only used if the user
      // still has an active membership for it (revalidates real rights).
      const preferredId = getPreferredAgency();
      const resolved = resolveActiveAgency(userMemberships, preferredId);

      if (resolved) {
        setActiveAgency(resolved.agency, resolved.membership);
        savePreferredAgency(resolved.agency.id);
      } else {
        // User has no agency membership — clear stale localStorage
        savePreferredAgency('');
      }

      setState({ isLoading: false, isReady: true, error: null });
    } catch (err) {
      console.error('Session hydration failed:', err);
      setState({
        isLoading: false,
        isReady: false,
        error: 'Erreur de chargement de la session',
      });
    }
  }, [setUser, clearAuth, setActiveAgency, clearAgency]);

  // Hydrate on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Listen for auth state changes (login/logout from other tabs)
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        hydrate();
      } else if (event === 'SIGNED_OUT') {
        clearAuth();
        clearAgency();
        setMemberships([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [hydrate, clearAuth, clearAgency]);

  // Switch active agency
  const switchAgency = useCallback(
    async (agencyId: string) => {
      const target = memberships.find((m) => m.agency_id === agencyId);
      if (target) {
        setActiveAgency(target.agency, target);
        savePreferredAgency(agencyId);
      }
    },
    [memberships, setActiveAgency]
  );

  return { ...state, switchAgency, memberships };
}
