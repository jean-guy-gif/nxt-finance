'use client';

import { useState } from 'react';
import {
  Shield,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useDemoGuard, DemoBlockDialog } from '@/components/shared/demo-guard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionCard } from '@/components/shared/section-card';
import { LoadingState } from '@/components/shared/loading-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { MEMBER_ROLES, MEMBER_ROLE_LABELS, ACCOUNTANT_PERMISSIONS, type MemberRole, type AccountantPermission } from '@/types/enums';
import type { AgencyMember, AccountantPermissions } from '@/types/models';
import { useAuthStore } from '@/stores/auth-store';
import {
  useAgencyMembers,
  useUpdateMemberRole,
  useUpdateMemberPermissions,
  useRemoveMember,
} from '../hooks/use-settings';

const PERMISSION_LABELS: Record<AccountantPermission, string> = {
  read: 'Consultation',
  download: 'Téléchargement',
  comment: 'Commentaire',
  request_documents: 'Demande de pièces',
  validate_document: 'Validation pièce',
  validate_period: 'Validation période',
  export: 'Export',
  annotate: 'Annotation',
};

export function MembersSection() {
  const { data: members, isLoading } = useAgencyMembers();
  const currentUserId = useAuthStore((s) => s.user?.id);

  if (isLoading) return <LoadingState message="Chargement des membres..." />;

  return (
    <SectionCard
      title="Utilisateurs et rôles"
      action={
        <Button variant="outline" size="sm" disabled>
          Bientôt disponible
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground mb-4">
        Gérez les accès de votre agence. Chaque utilisateur possède un rôle qui détermine ses droits.
      </p>

      <div className="space-y-3">
        {(members ?? []).map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            isSelf={member.user_id === currentUserId}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function MemberCard({
  member,
  isSelf,
}: {
  member: AgencyMember;
  isSelf: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { guard, showBlock, setShowBlock } = useDemoGuard();
  const updateRole = useUpdateMemberRole();
  const updatePerms = useUpdateMemberPermissions();
  const removeMutation = useRemoveMember();

  const profile = member.user_profile;
  const isAccountant = member.role === 'accountant';
  const permissions = (member.permissions ?? {}) as AccountantPermissions;

  function handleRoleChange(role: string | null) {
    if (role) {
      updateRole.mutate({ memberId: member.id, role: role as MemberRole });
    }
  }

  function handlePermissionToggle(perm: AccountantPermission) {
    const updated = { ...permissions, [perm]: !permissions[perm] };
    updatePerms.mutate({ memberId: member.id, permissions: updated });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {profile?.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) ?? '??'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name ?? 'Utilisateur'}
                {isSelf && (
                  <span className="text-[10px] text-muted-foreground ml-1">(vous)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSelf ? (
              <Badge variant="outline" className="text-xs">
                {MEMBER_ROLE_LABELS[member.role]}
              </Badge>
            ) : (
              <Select value={member.role} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-auto h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {MEMBER_ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isAccountant && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}

            {!isSelf && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => guard(() => setDeleteConfirm(true))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Accountant permissions panel */}
        {isAccountant && expanded && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">
                Permissions cabinet
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACCOUNTANT_PERMISSIONS.map((perm) => (
                <button
                  key={perm}
                  onClick={() => handlePermissionToggle(perm)}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                    permissions[perm]
                      ? 'bg-primary/5 border-primary/30 text-primary'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      permissions[perm] ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                  {PERMISSION_LABELS[perm]}
                </button>
              ))}
            </div>
          </div>
        )}

        <ConfirmDialog
          open={deleteConfirm}
          onOpenChange={setDeleteConfirm}
          title="Retirer ce membre"
          description={`${profile?.full_name ?? 'Ce membre'} n'aura plus accès à l'agence.`}
          confirmLabel="Retirer"
          variant="destructive"
          isLoading={removeMutation.isPending}
          onConfirm={() => {
            removeMutation.mutate(member.id);
            setDeleteConfirm(false);
          }}
        />

        <DemoBlockDialog open={showBlock} onOpenChange={setShowBlock} />
      </CardContent>
    </Card>
  );
}
