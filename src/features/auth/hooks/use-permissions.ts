'use client';

import { useMemo } from 'react';
import { useAgencyStore } from '@/stores/agency-store';
import type { MemberRole, AccountantPermission } from '@/types/enums';
import type { AccountantPermissions } from '@/types/models';

interface PermissionsResult {
  /** Current user's role in the active agency */
  role: MemberRole | null;
  /** Whether the user is a manager */
  isManager: boolean;
  /** Whether the user is an assistant */
  isAssistant: boolean;
  /** Whether the user is an accountant */
  isAccountant: boolean;
  /** Check if user has a specific accountant permission (only relevant for accountant role) */
  hasPermission: (permission: AccountantPermission) => boolean;
  /** Whether the user can create/edit revenues */
  canManageRevenues: boolean;
  /** Whether the user can create/edit expenses */
  canManageExpenses: boolean;
  /** Whether the user can manage settings */
  canManageSettings: boolean;
  /** Whether the user can share with accountant */
  canShareWithAccountant: boolean;
}

/**
 * Provides role and permission checks for the current user in the active agency.
 */
export function usePermissions(): PermissionsResult {
  const membership = useAgencyStore((s) => s.activeMembership);

  return useMemo(() => {
    const role = membership?.role ?? null;
    const isManager = role === 'manager';
    const isAssistant = role === 'assistant';
    const isAccountant = role === 'accountant';

    const permissions = (membership?.permissions ?? null) as AccountantPermissions | null;

    function hasPermission(permission: AccountantPermission): boolean {
      if (!isAccountant || !permissions) return false;
      return permissions[permission] === true;
    }

    return {
      role,
      isManager,
      isAssistant,
      isAccountant,
      hasPermission,
      // Manager: full access. Assistant: can manage revenues/expenses. Accountant: read-only unless permitted.
      canManageRevenues: isManager || isAssistant,
      canManageExpenses: isManager || isAssistant,
      canManageSettings: isManager,
      canShareWithAccountant: isManager,
    };
  }, [membership]);
}
