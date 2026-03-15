/**
 * Demo mode guard utilities.
 *
 * The demo mode uses the same tables, same flows, same components
 * as real data. The only differences are:
 * 1. A persistent banner indicating demo mode
 * 2. Blocking of destructive actions (delete, bulk operations)
 * 3. A warning toast/message when attempting blocked actions
 *
 * These guards are checked at the hook/component level, not at the
 * service level — so the service layer remains pure and testable.
 */

/** Actions blocked in demo mode */
export const DEMO_BLOCKED_ACTIONS = [
  'delete_revenue',
  'delete_expense',
  'delete_receipt',
  'remove_member',
  'delete_period',
] as const;

export type DemoBlockedAction = (typeof DEMO_BLOCKED_ACTIONS)[number];

/** Human-readable labels for blocked actions */
export const DEMO_BLOCKED_LABELS: Record<DemoBlockedAction, string> = {
  delete_revenue: 'Supprimer une recette',
  delete_expense: 'Supprimer une dépense',
  delete_receipt: 'Supprimer un justificatif',
  remove_member: 'Retirer un membre',
  delete_period: 'Supprimer une période',
};

/** Standard demo block message */
export const DEMO_BLOCK_MESSAGE =
  'Cette action n\'est pas disponible en mode démonstration.';

/**
 * Check if an action is allowed in the current context.
 * Returns true if allowed, false if blocked.
 */
export function isDemoActionAllowed(
  isDemo: boolean,
  action: DemoBlockedAction
): boolean {
  if (!isDemo) return true;
  return !DEMO_BLOCKED_ACTIONS.includes(action);
}
