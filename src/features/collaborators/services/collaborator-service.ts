import type { SupabaseClient } from '@supabase/supabase-js';
import type { Collaborator } from '@/types/models';
import type { CollaboratorType, CollaboratorStatus } from '@/types/enums';

export interface CreateCollaboratorInput {
  agency_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  type: CollaboratorType;
  default_split_rate: number;
}

export interface UpdateCollaboratorInput {
  full_name?: string;
  email?: string;
  phone?: string;
  status?: CollaboratorStatus;
  type?: CollaboratorType;
  default_split_rate?: number;
  employer_cost_rate?: number;
}

export async function fetchCollaborators(
  supabase: SupabaseClient,
  agencyId: string
): Promise<Collaborator[]> {
  const { data, error } = await supabase
    .from('collaborators')
    .select('*')
    .eq('agency_id', agencyId)
    .order('full_name');

  if (error) throw error;
  return (data ?? []) as Collaborator[];
}

export async function fetchActiveCollaborators(
  supabase: SupabaseClient,
  agencyId: string
): Promise<Collaborator[]> {
  const { data, error } = await supabase
    .from('collaborators')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('status', 'active')
    .order('full_name');

  if (error) throw error;
  return (data ?? []) as Collaborator[];
}

export async function createCollaborator(
  supabase: SupabaseClient,
  input: CreateCollaboratorInput
): Promise<Collaborator> {
  const { data, error } = await supabase
    .from('collaborators')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Collaborator;
}

export async function updateCollaborator(
  supabase: SupabaseClient,
  id: string,
  input: UpdateCollaboratorInput
): Promise<Collaborator> {
  const { data, error } = await supabase
    .from('collaborators')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Collaborator;
}

export async function deleteCollaborator(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('collaborators')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
