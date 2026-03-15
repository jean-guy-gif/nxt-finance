'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useAuthStore } from '@/stores/auth-store';
import { writeAuditLog } from '@/lib/audit';
import {
  fetchComments,
  fetchEntityComments,
  createComment,
  resolveComment,
  fetchSharedPeriods,
  fetchAccountantStats,
  type CommentFilters,
  type CreateCommentInput,
} from '../services/accountant-service';
import type { CommentType } from '@/types/enums';

export function useAccountantStats() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['accountant', 'stats', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchAccountantStats(supabase, agencyId!);
    },
    enabled: !!agencyId,
  });
}

export function useComments(filters: CommentFilters = {}) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['accountant', 'comments', agencyId, filters],
    queryFn: () => {
      const supabase = createClient();
      return fetchComments(supabase, agencyId!, filters);
    },
    enabled: !!agencyId,
  });
}

export function useEntityComments(
  relatedType: 'expense' | 'receipt' | 'period',
  relatedId: string
) {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['accountant', 'entity-comments', agencyId, relatedType, relatedId],
    queryFn: () => {
      const supabase = createClient();
      return fetchEntityComments(supabase, agencyId!, relatedType, relatedId);
    },
    enabled: !!agencyId && !!relatedId,
  });
}

export function useSharedPeriods() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['accountant', 'shared-periods', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchSharedPeriods(supabase, agencyId!);
    },
    enabled: !!agencyId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (
      input: Pick<CreateCommentInput, 'related_type' | 'related_id' | 'content' | 'type'>
    ) => {
      const supabase = createClient();
      return createComment(supabase, {
        ...input,
        agency_id: agencyId!,
        author_id: userId!,
      });
    },
    onSuccess: (data) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'commented', entityType: 'comment', entityId: data.id,
        metadata: { type: data.type, related_type: data.related_type, related_id: data.related_id },
      });
      queryClient.invalidateQueries({ queryKey: ['accountant'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useResolveComment() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (commentId: string) => {
      const supabase = createClient();
      return resolveComment(supabase, commentId);
    },
    onSuccess: (_, commentId) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'validated', entityType: 'comment', entityId: commentId,
        changes: { is_resolved: { from: false, to: true } },
      });
      queryClient.invalidateQueries({ queryKey: ['accountant'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
