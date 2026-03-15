import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityAction, ActivityEntityType } from '@/types/enums';

/**
 * Write an entry to activity_logs.
 *
 * Called from service/hook level after successful mutations.
 * Never blocks the main operation — errors are logged but not thrown.
 *
 * Format:
 * - action: what happened (created, updated, deleted, status_changed, validated, transmitted, exported, commented)
 * - entity_type: what was affected (revenue, expense, receipt, period, export, comment)
 * - entity_id: the ID of the affected object
 * - changes: optional diff { field: { from, to } } for updates
 * - metadata: optional extra context
 */
export async function writeAuditLog(
  supabase: SupabaseClient,
  params: {
    agencyId: string;
    userId: string;
    action: ActivityAction;
    entityType: ActivityEntityType;
    entityId: string;
    changes?: Record<string, { from: unknown; to: unknown }>;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from('activity_logs').insert({
      agency_id: params.agencyId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      changes: params.changes ?? null,
      metadata: params.metadata ?? null,
    });
    if (error) {
      console.error('Audit log write failed:', error.message, error.details);
    }
  } catch (err) {
    console.error('Audit log write exception:', err);
  }
}

/**
 * Compute a simple diff between two objects for the changes field.
 * Only includes fields that actually changed.
 */
export function computeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of fields) {
    const fromVal = before[field];
    const toVal = after[field];
    if (fromVal !== toVal) {
      changes[field] = { from: fromVal, to: toVal };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}
