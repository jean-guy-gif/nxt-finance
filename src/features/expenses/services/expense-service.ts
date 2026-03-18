import type { SupabaseClient } from '@supabase/supabase-js';
import type { Expense } from '@/types/models';
import type { ExpenseStatus, ExpenseCategory, PaymentMethod } from '@/types/enums';
import { ensurePeriodExists } from '@/features/vat/services/auto-period';

// ============================================
// Expense CRUD service
// ============================================

export interface ExpenseFilters {
  status?: ExpenseStatus | 'all';
  category?: ExpenseCategory | 'all';
  search?: string;
  month?: number;
  year?: number;
  /** Date range (takes precedence over month/year) */
  startDate?: string;
  endDate?: string;
  /** Special filter: only expenses missing a receipt */
  missingReceipt?: boolean;
  /** Special filter: only expenses linked to receipts with a specific status */
  receiptStatus?: string;
}

export interface CreateExpenseInput {
  agency_id: string;
  date: string;
  supplier: string;
  amount_ttc: number;
  amount_ht?: number;
  vat_amount?: number;
  category: ExpenseCategory;
  payment_method?: PaymentMethod;
  status: ExpenseStatus;
  period_id?: string;
  comment?: string;
  created_by: string;
}

export interface UpdateExpenseInput {
  date?: string;
  supplier?: string;
  amount_ttc?: number;
  amount_ht?: number;
  vat_amount?: number;
  category?: ExpenseCategory;
  payment_method?: PaymentMethod | null;
  status?: ExpenseStatus;
  period_id?: string | null;
  comment?: string;
}

export async function fetchExpenses(
  supabase: SupabaseClient,
  agencyId: string,
  filters: ExpenseFilters = {}
): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select('*, creator:user_profiles!created_by(id, full_name, email)')
    .eq('agency_id', agencyId)
    .order('date', { ascending: false });

  // Date range filter (startDate/endDate takes precedence over month/year)
  if (filters.startDate && filters.endDate) {
    query = query.gte('date', filters.startDate).lt('date', filters.endDate);
  } else if (filters.month && filters.year) {
    const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
    const endMonth = filters.month === 12 ? 1 : filters.month + 1;
    const endYear = filters.month === 12 ? filters.year + 1 : filters.year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    query = query.gte('date', startDate).lt('date', endDate);
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (filters.search) {
    query = query.or(`supplier.ilike.%${filters.search}%,comment.ilike.%${filters.search}%`);
  }

  let results = ((await query).data ?? []) as Expense[];

  // Post-filter: expenses missing receipts (requires a second query)
  if (filters.missingReceipt) {
    const expenseIds = results.map((e) => e.id);
    if (expenseIds.length > 0) {
      const { data: linkedReceipts } = await supabase
        .from('receipt_documents')
        .select('related_id')
        .eq('related_type', 'expense')
        .in('related_id', expenseIds);
      const linkedIds = new Set((linkedReceipts ?? []).map((r) => r.related_id));
      results = results.filter((e) => !linkedIds.has(e.id));
    }
  }

  // Post-filter: expenses linked to receipts with a specific status
  // (e.g. receiptStatus=unreadable → only expenses with an unreadable receipt)
  if (filters.receiptStatus) {
    const expenseIds = results.map((e) => e.id);
    if (expenseIds.length > 0) {
      const { data: matchingReceipts } = await supabase
        .from('receipt_documents')
        .select('related_id')
        .eq('related_type', 'expense')
        .in('related_id', expenseIds)
        .eq('status', filters.receiptStatus);
      const matchingIds = new Set((matchingReceipts ?? []).map((r) => r.related_id));
      results = results.filter((e) => matchingIds.has(e.id));
    } else {
      results = [];
    }
  }

  return results;
}

export async function fetchExpense(
  supabase: SupabaseClient,
  id: string
): Promise<Expense | null> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, creator:user_profiles!created_by(id, full_name, email)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Expense;
}

export async function createExpense(
  supabase: SupabaseClient,
  input: CreateExpenseInput
): Promise<Expense> {
  // Auto-resolve period from the expense date
  if (!input.period_id && input.date) {
    const d = new Date(input.date);
    const periodId = await ensurePeriodExists(
      supabase,
      input.agency_id,
      d.getMonth() + 1,
      d.getFullYear()
    );
    input.period_id = periodId;
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function updateExpense(
  supabase: SupabaseClient,
  id: string,
  input: UpdateExpenseInput
): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function deleteExpense(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}
