'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SectionCard } from '@/components/shared/section-card';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useToast } from '@/components/shared/toast';
import { useDemoGuard, DemoBlockDialog } from '@/components/shared/demo-guard';
import {
  COLLABORATOR_TYPE_LABELS,
  COLLABORATOR_STATUS_LABELS,
} from '@/types/enums';
import type { Collaborator } from '@/types/models';
import {
  useCollaborators,
  useCreateCollaborator,
  useUpdateCollaborator,
  useDeleteCollaborator,
} from '../hooks/use-collaborators';
import { CollaboratorForm, } from './collaborator-form';
import type { CollaboratorFormValues } from './collaborator-schema';
import { Users } from 'lucide-react';

export function CollaboratorsSection() {
  const { data: collaborators, isLoading } = useCollaborators();
  const createMutation = useCreateCollaborator();
  const updateMutation = useUpdateCollaborator();
  const deleteMutation = useDeleteCollaborator();
  const { toast } = useToast();
  const { guard, showBlock, setShowBlock } = useDemoGuard();

  const [showForm, setShowForm] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(values: CollaboratorFormValues) {
    try {
      await createMutation.mutateAsync({
        full_name: values.full_name,
        type: values.type!,
        email: values.email || undefined,
        phone: values.phone || undefined,
        default_split_rate: values.type === 'salarie' ? 0 : (values.default_split_rate ?? 50),
      });
      toast('Collaborateur ajouté', 'success');
      setShowForm(false);
    } catch {
      toast('Impossible d\'ajouter le collaborateur.', 'error');
    }
  }

  async function handleUpdate(values: CollaboratorFormValues) {
    if (!editingCollaborator) return;
    try {
      await updateMutation.mutateAsync({
        id: editingCollaborator.id,
        full_name: values.full_name,
        type: values.type,
        email: values.email || undefined,
        phone: values.phone || undefined,
        default_split_rate: values.type === 'salarie' ? 0 : (values.default_split_rate ?? 50),
        salary_net_monthly: values.type === 'salarie' && values.salary_net_monthly && !isNaN(values.salary_net_monthly) ? values.salary_net_monthly : null,
        salary_gross_monthly: values.type === 'salarie' && values.salary_gross_monthly && !isNaN(values.salary_gross_monthly) ? values.salary_gross_monthly : null,
        employer_total_cost_monthly: values.type === 'salarie' && values.employer_total_cost_monthly && !isNaN(values.employer_total_cost_monthly) ? values.employer_total_cost_monthly : null,
        status: values.status,
      });
      toast('Collaborateur modifié', 'success');
      setEditingCollaborator(null);
    } catch {
      toast('Impossible de modifier le collaborateur.', 'error');
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast('Collaborateur supprimé', 'success');
      setDeletingId(null);
    } catch {
      toast('Impossible de supprimer le collaborateur. Il est peut-être lié à des recettes.', 'error');
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(collab: Collaborator) {
    const newStatus = collab.status === 'active' ? 'inactive' as const : 'active' as const;
    await updateMutation.mutateAsync({ id: collab.id, status: newStatus });
    toast(newStatus === 'active' ? 'Collaborateur réactivé' : 'Collaborateur désactivé', 'success');
  }

  if (isLoading) return <LoadingState message="Chargement des collaborateurs..." />;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Collaborateurs"
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Ajouter
          </Button>
        }
      >
        {!collaborators || collaborators.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun collaborateur"
            description="Ajoutez vos collaborateurs pour suivre la répartition des commissions."
            action={{ label: 'Ajouter un collaborateur', onClick: () => setShowForm(true) }}
          />
        ) : (
          <div className="space-y-2">
            {collaborators.map((collab) => (
              <Card key={collab.id} className={collab.status === 'inactive' ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {collab.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{collab.full_name}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {COLLABORATOR_TYPE_LABELS[collab.type]}
                          </Badge>
                          {collab.status === 'inactive' && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {COLLABORATOR_STATUS_LABELS[collab.status]}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {collab.type !== 'salarie' && `Taux : ${collab.default_split_rate}%`}
                          {collab.type === 'salarie' && collab.employer_total_cost_monthly != null && `Coût employeur : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(collab.employer_total_cost_monthly)}/mois`}
                          {collab.type === 'salarie' && collab.employer_total_cost_monthly == null && 'Rémunération non renseignée'}
                          {collab.email && ` — ${collab.email}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleStatus(collab)}
                        title={collab.status === 'active' ? 'Désactiver' : 'Réactiver'}
                      >
                        {collab.status === 'active' ? (
                          <UserX className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingCollaborator(collab)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => guard(() => setDeletingId(collab.id))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Create dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau collaborateur</DialogTitle>
          </DialogHeader>
          <CollaboratorForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingCollaborator} onOpenChange={() => setEditingCollaborator(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le collaborateur</DialogTitle>
          </DialogHeader>
          {editingCollaborator && (
            <CollaboratorForm
              collaborator={editingCollaborator}
              onSubmit={handleUpdate}
              onCancel={() => setEditingCollaborator(null)}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={() => setDeletingId(null)}
        title="Supprimer le collaborateur"
        description="Cette action est irréversible. Le collaborateur sera retiré de l'agence. Les répartitions existantes seront conservées."
        confirmLabel="Supprimer"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      <DemoBlockDialog open={showBlock} onOpenChange={setShowBlock} />
    </div>
  );
}
