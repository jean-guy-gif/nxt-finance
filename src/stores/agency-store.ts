import { create } from 'zustand';
import type { Agency, AgencyMember } from '@/types/models';

interface AgencyState {
  /** Currently active agency */
  activeAgency: Agency | null;
  /** Current user's membership in the active agency */
  activeMembership: AgencyMember | null;
  /** Whether the active agency is a demo agency */
  isDemo: boolean;
  setActiveAgency: (agency: Agency, membership: AgencyMember) => void;
  clear: () => void;
}

export const useAgencyStore = create<AgencyState>((set) => ({
  activeAgency: null,
  activeMembership: null,
  isDemo: false,
  setActiveAgency: (agency, membership) =>
    set({
      activeAgency: agency,
      activeMembership: membership,
      isDemo: agency.is_demo,
    }),
  clear: () =>
    set({ activeAgency: null, activeMembership: null, isDemo: false }),
}));
