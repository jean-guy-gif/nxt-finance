import type { SupabaseClient } from '@supabase/supabase-js';
import type { Agency, AgencySettings, AgencyMember, AccountantPermissions } from '@/types/models';
import type { MemberRole } from '@/types/enums';

// ============================================
// Settings service — agency, members, permissions
// ============================================

/**
 * Update agency info (name, siret, address).
 */
export async function updateAgencyInfo(
  supabase: SupabaseClient,
  agencyId: string,
  input: { name?: string; siret?: string; address?: string }
): Promise<Agency> {
  const { data, error } = await supabase
    .from('agencies')
    .update(input)
    .eq('id', agencyId)
    .select()
    .single();

  if (error) throw error;
  return data as Agency;
}

/**
 * Update agency settings (thresholds, notifications).
 */
export async function updateAgencySettings(
  supabase: SupabaseClient,
  agencyId: string,
  settings: Partial<AgencySettings>
): Promise<Agency> {
  // Merge with existing settings
  const { data: current } = await supabase
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  const merged = { ...(current?.settings ?? {}), ...settings };

  const { data, error } = await supabase
    .from('agencies')
    .update({ settings: merged })
    .eq('id', agencyId)
    .select()
    .single();

  if (error) throw error;
  return data as Agency;
}

/**
 * Fetch all members of an agency with their profiles.
 */
export async function fetchAgencyMembers(
  supabase: SupabaseClient,
  agencyId: string
): Promise<AgencyMember[]> {
  const { data, error } = await supabase
    .from('agency_members')
    .select('*, user_profile:user_profiles!user_id(id, full_name, email, avatar_url)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AgencyMember[];
}

/**
 * Update a member's role.
 */
export async function updateMemberRole(
  supabase: SupabaseClient,
  memberId: string,
  role: MemberRole
): Promise<AgencyMember> {
  const { data, error } = await supabase
    .from('agency_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw error;
  return data as AgencyMember;
}

/**
 * Update accountant permissions for a member.
 */
export async function updateMemberPermissions(
  supabase: SupabaseClient,
  memberId: string,
  permissions: AccountantPermissions
): Promise<AgencyMember> {
  const { data, error } = await supabase
    .from('agency_members')
    .update({ permissions })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw error;
  return data as AgencyMember;
}

/**
 * Remove a member from an agency.
 */
export async function removeMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from('agency_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}
