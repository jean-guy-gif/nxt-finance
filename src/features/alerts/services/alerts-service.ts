import type { SupabaseClient } from '@supabase/supabase-js';
import type { Alert } from '@/types/models';

/**
 * Fetch priority alerts for the dashboard.
 * Returns unread, non-dismissed alerts ordered by level (critical first) then date.
 */
export async function fetchPriorityAlerts(
  supabase: SupabaseClient,
  agencyId: string,
  limit = 5
): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Sort client-side: critical > vigilance > info
  const levelOrder = { critical: 0, vigilance: 1, info: 2 };
  return (data as Alert[]).sort(
    (a, b) =>
      (levelOrder[a.level] ?? 3) - (levelOrder[b.level] ?? 3)
  );
}

/**
 * Count unread alerts.
 */
export async function countUnreadAlerts(
  supabase: SupabaseClient,
  agencyId: string
): Promise<number> {
  const { count } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('is_read', false)
    .eq('is_dismissed', false);

  return count ?? 0;
}

/**
 * Mark an alert as dismissed.
 */
export async function dismissAlert(
  supabase: SupabaseClient,
  alertId: string
): Promise<void> {
  await supabase
    .from('alerts')
    .update({ is_dismissed: true })
    .eq('id', alertId);
}

/**
 * Mark an alert as read.
 */
export async function markAlertRead(
  supabase: SupabaseClient,
  alertId: string
): Promise<void> {
  await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('id', alertId);
}
