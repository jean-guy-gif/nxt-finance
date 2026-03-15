import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, AgencyMember, Agency } from '@/types/models';

/**
 * Fetch the user profile from the user_profiles table.
 */
export async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

/**
 * Fetch all agency memberships for a user, with agency details.
 */
export async function fetchUserMemberships(
  supabase: SupabaseClient,
  userId: string
): Promise<(AgencyMember & { agency: Agency })[]> {
  const { data, error } = await supabase
    .from('agency_members')
    .select(`
      *,
      agency:agencies(*)
    `)
    .eq('user_id', userId);

  if (error || !data) return [];
  return data as (AgencyMember & { agency: Agency })[];
}

/**
 * Determine the active agency from memberships.
 * Priority: last selected (from localStorage) > first non-demo > first available.
 */
export function resolveActiveAgency(
  memberships: (AgencyMember & { agency: Agency })[],
  preferredAgencyId?: string | null
): { agency: Agency; membership: AgencyMember } | null {
  if (memberships.length === 0) return null;

  // Try preferred agency first
  if (preferredAgencyId) {
    const preferred = memberships.find((m) => m.agency_id === preferredAgencyId);
    if (preferred) {
      return { agency: preferred.agency, membership: preferred };
    }
  }

  // Prefer first non-demo agency, fallback to first available
  const nonDemo = memberships.find((m) => !m.agency.is_demo);
  const selected = nonDemo ?? memberships[0];

  return { agency: selected.agency, membership: selected };
}

/**
 * Persist the preferred agency ID in localStorage.
 */
export function savePreferredAgency(agencyId: string): void {
  try {
    localStorage.setItem('nxt-finance-active-agency', agencyId);
  } catch {
    // SSR or storage not available
  }
}

/**
 * Read the preferred agency ID from localStorage.
 */
export function getPreferredAgency(): string | null {
  try {
    return localStorage.getItem('nxt-finance-active-agency');
  } catch {
    return null;
  }
}
