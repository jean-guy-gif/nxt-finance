'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import {
  updateAgencyInfo,
  updateAgencySettings,
  fetchAgencyMembers,
  updateMemberRole,
  updateMemberPermissions,
  removeMember,
} from '../services/settings-service';
import type { AgencySettings, AccountantPermissions } from '@/types/models';
import type { MemberRole } from '@/types/enums';

export function useAgencyMembers() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['settings', 'members', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchAgencyMembers(supabase, agencyId!);
    },
    enabled: !!agencyId,
  });
}

export function useUpdateAgencyInfo() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const setActiveAgency = useAgencyStore((s) => s.setActiveAgency);
  const membership = useAgencyStore((s) => s.activeMembership);

  return useMutation({
    mutationFn: (input: { name?: string; siret?: string; address?: string }) => {
      const supabase = createClient();
      return updateAgencyInfo(supabase, agencyId!, input);
    },
    onSuccess: (agency) => {
      if (membership) setActiveAgency(agency, membership);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useUpdateAgencySettings() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const setActiveAgency = useAgencyStore((s) => s.setActiveAgency);
  const membership = useAgencyStore((s) => s.activeMembership);

  return useMutation({
    mutationFn: (settings: Partial<AgencySettings>) => {
      const supabase = createClient();
      return updateAgencySettings(supabase, agencyId!, settings);
    },
    onSuccess: (agency) => {
      if (membership) setActiveAgency(agency, membership);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: MemberRole }) => {
      const supabase = createClient();
      return updateMemberRole(supabase, memberId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'members'] });
    },
  });
}

export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      permissions,
    }: {
      memberId: string;
      permissions: AccountantPermissions;
    }) => {
      const supabase = createClient();
      return updateMemberPermissions(supabase, memberId, permissions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'members'] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => {
      const supabase = createClient();
      return removeMember(supabase, memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'members'] });
    },
  });
}
