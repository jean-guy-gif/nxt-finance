import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReceiptDocument } from '@/types/models';
import type { ReceiptStatus, ReceiptRelatedType } from '@/types/enums';

// ============================================
// Receipt document service — upload, CRUD, linking
// ============================================

export interface UploadReceiptInput {
  agency_id: string;
  file: File;
  source: 'upload' | 'photo' | 'email';
  created_by: string;
  /** Optional immediate link */
  related_type?: ReceiptRelatedType;
  related_id?: string;
}

export interface UpdateReceiptInput {
  status?: ReceiptStatus;
  related_type?: ReceiptRelatedType | null;
  related_id?: string | null;
  /** Manual overrides — always take precedence over OCR */
  ocr_date?: string | null;
  ocr_supplier?: string | null;
  ocr_amount?: number | null;
  ocr_vat?: number | null;
  anomalies?: { type: string; message: string }[];
}

/**
 * Upload a receipt file to Supabase Storage and insert the metadata row.
 */
export async function uploadReceipt(
  supabase: SupabaseClient,
  input: UploadReceiptInput
): Promise<ReceiptDocument> {
  const { agency_id, file, source, created_by, related_type, related_id } = input;

  // 1. Generate a unique storage path
  const ext = file.name.split('.').pop() ?? 'bin';
  const timestamp = Date.now();
  const storagePath = `${agency_id}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  // 2. Upload to Supabase Storage (bucket: "receipts")
  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw new Error(`Échec de l'envoi : ${uploadError.message}`);

  // 3. Insert metadata row
  const { data, error: insertError } = await supabase
    .from('receipt_documents')
    .insert({
      agency_id,
      file_name: file.name,
      file_path: storagePath,
      file_type: file.type,
      source,
      related_type: related_type ?? null,
      related_id: related_id ?? null,
      status: 'received' as ReceiptStatus,
      anomalies: [],
      created_by,
    })
    .select()
    .single();

  if (insertError) throw new Error(`Échec d'enregistrement : ${insertError.message}`);

  return data as ReceiptDocument;
}

/**
 * Fetch receipts linked to an expense.
 */
export async function fetchExpenseReceipts(
  supabase: SupabaseClient,
  expenseId: string
): Promise<ReceiptDocument[]> {
  const { data, error } = await supabase
    .from('receipt_documents')
    .select('*')
    .eq('related_type', 'expense')
    .eq('related_id', expenseId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data as ReceiptDocument[];
}

/**
 * Fetch all unlinked receipts for an agency (orphans waiting to be attached).
 */
export async function fetchOrphanReceipts(
  supabase: SupabaseClient,
  agencyId: string
): Promise<ReceiptDocument[]> {
  const { data, error } = await supabase
    .from('receipt_documents')
    .select('*')
    .eq('agency_id', agencyId)
    .is('related_id', null)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data as ReceiptDocument[];
}

/**
 * Link an existing receipt to an expense (or revenue).
 */
export async function linkReceipt(
  supabase: SupabaseClient,
  receiptId: string,
  relatedType: ReceiptRelatedType,
  relatedId: string
): Promise<void> {
  const { error } = await supabase
    .from('receipt_documents')
    .update({ related_type: relatedType, related_id: relatedId })
    .eq('id', receiptId);

  if (error) throw error;
}

/**
 * Unlink a receipt (set related to null).
 */
export async function unlinkReceipt(
  supabase: SupabaseClient,
  receiptId: string
): Promise<void> {
  const { error } = await supabase
    .from('receipt_documents')
    .update({ related_type: null, related_id: null })
    .eq('id', receiptId);

  if (error) throw error;
}

/**
 * Update receipt metadata (status, manual corrections, anomalies).
 */
export async function updateReceipt(
  supabase: SupabaseClient,
  receiptId: string,
  input: UpdateReceiptInput
): Promise<ReceiptDocument> {
  const { data, error } = await supabase
    .from('receipt_documents')
    .update(input)
    .eq('id', receiptId)
    .select()
    .single();

  if (error) throw error;
  return data as ReceiptDocument;
}

/**
 * Get a signed URL for viewing/downloading a receipt.
 */
export async function getReceiptUrl(
  supabase: SupabaseClient,
  filePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(filePath, 3600); // 1 hour

  if (error) return null;
  return data.signedUrl;
}

/**
 * Delete a receipt (file + metadata).
 */
export async function deleteReceipt(
  supabase: SupabaseClient,
  receipt: ReceiptDocument
): Promise<void> {
  // Delete file from storage
  await supabase.storage.from('receipts').remove([receipt.file_path]);
  // Delete metadata row
  const { error } = await supabase
    .from('receipt_documents')
    .delete()
    .eq('id', receipt.id);
  if (error) throw error;
}
