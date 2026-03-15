'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAgencyStore } from '@/stores/agency-store';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { writeAuditLog } from '@/lib/audit';
import {
  fetchExpenses,
  fetchExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseFilters,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from '../services/expense-service';
import {
  uploadReceipt,
  fetchExpenseReceipts,
  fetchOrphanReceipts,
  linkReceipt,
  unlinkReceipt,
  updateReceipt,
  deleteReceipt,
  type UploadReceiptInput,
  type UpdateReceiptInput,
} from '../services/receipt-service';
import type { ReceiptDocument } from '@/types/models';
import type { ReceiptRelatedType } from '@/types/enums';

// --- Expense hooks ---

function useExpenseKeys() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const month = useUiStore((s) => s.selectedMonth);
  const year = useUiStore((s) => s.selectedYear);
  return { agencyId, month, year };
}

export function useExpenses(filters: Omit<ExpenseFilters, 'month' | 'year'> = {}) {
  const { agencyId, month, year } = useExpenseKeys();
  return useQuery({
    queryKey: ['expenses', agencyId, month, year, filters],
    queryFn: () => {
      const supabase = createClient();
      return fetchExpenses(supabase, agencyId!, { ...filters, month, year });
    },
    enabled: !!agencyId,
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ['expense', id],
    queryFn: () => {
      const supabase = createClient();
      return fetchExpense(supabase, id);
    },
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: Omit<CreateExpenseInput, 'agency_id' | 'created_by'>) => {
      const supabase = createClient();
      return createExpense(supabase, {
        ...input,
        agency_id: agencyId!,
        created_by: userId!,
      });
    },
    onSuccess: (data) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'created', entityType: 'expense', entityId: data.id,
        metadata: { supplier: data.supplier, amount_ttc: data.amount_ttc },
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateExpenseInput & { id: string }) => {
      const supabase = createClient();
      return updateExpense(supabase, id, input);
    },
    onSuccess: (data, variables) => {
      const supabase = createClient();
      const isStatusChange = variables.status !== undefined;
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: isStatusChange ? 'status_changed' : 'updated',
        entityType: 'expense', entityId: variables.id,
        changes: variables.status ? { status: { from: null, to: variables.status } } : undefined,
        metadata: { supplier: data.supplier },
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (id: string) => {
      const supabase = createClient();
      return deleteExpense(supabase, id);
    },
    onSuccess: (_, id) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'deleted', entityType: 'expense', entityId: id,
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// --- Receipt hooks ---

export function useExpenseReceipts(expenseId: string) {
  return useQuery({
    queryKey: ['expense-receipts', expenseId],
    queryFn: () => {
      const supabase = createClient();
      return fetchExpenseReceipts(supabase, expenseId);
    },
    enabled: !!expenseId,
  });
}

export function useOrphanReceipts() {
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  return useQuery({
    queryKey: ['orphan-receipts', agencyId],
    queryFn: () => {
      const supabase = createClient();
      return fetchOrphanReceipts(supabase, agencyId!);
    },
    enabled: !!agencyId,
  });
}

export function useUploadReceipt() {
  const queryClient = useQueryClient();
  const agencyId = useAgencyStore((s) => s.activeAgency?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: Pick<UploadReceiptInput, 'file' | 'source' | 'related_type' | 'related_id'>) => {
      const supabase = createClient();
      return uploadReceipt(supabase, {
        ...input,
        agency_id: agencyId!,
        created_by: userId!,
      });
    },
    onSuccess: (data) => {
      const supabase = createClient();
      writeAuditLog(supabase, {
        agencyId: agencyId!, userId: userId!,
        action: 'created', entityType: 'receipt', entityId: data.id,
        metadata: { file_name: data.file_name, related_type: data.related_type, related_id: data.related_id },
      });
      queryClient.invalidateQueries({ queryKey: ['expense-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['orphan-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useLinkReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      receiptId,
      relatedType,
      relatedId,
    }: {
      receiptId: string;
      relatedType: ReceiptRelatedType;
      relatedId: string;
    }) => {
      const supabase = createClient();
      return linkReceipt(supabase, receiptId, relatedType, relatedId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['orphan-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUnlinkReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (receiptId: string) => {
      const supabase = createClient();
      return unlinkReceipt(supabase, receiptId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['orphan-receipts'] });
    },
  });
}

export function useUpdateReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateReceiptInput & { id: string }) => {
      const supabase = createClient();
      return updateReceipt(supabase, id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['orphan-receipts'] });
    },
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (receipt: ReceiptDocument) => {
      const supabase = createClient();
      return deleteReceipt(supabase, receipt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['orphan-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
