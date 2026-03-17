import type { SupabaseClient } from '@supabase/supabase-js';
import type { BalanceSheetSourceType, BalanceSheetSection } from '@/types/enums';
import { runCoherenceChecks } from './balance-sheet-service';
import {
  startJob,
  updateJobProgress,
  completeJob,
  failJob,
} from '@/features/shared/services/job-orchestrator';

// ============================================
// Interfaces (matches Edge Function output)
// ============================================

interface ParsedItem {
  section: string;
  category: string;
  pcg_code: string;
  amount: number;
  amount_n_minus_1: number;
  confidence_score: number;
  original_label: string;
}

interface ParseResult {
  items: ParsedItem[];
  overallConfidence: number;
  warnings: string[];
}

// ============================================
// Helper: update balance_sheet status
// ============================================

async function updateSheetStatus(
  supabase: SupabaseClient,
  balanceSheetId: string,
  status: string
): Promise<void> {
  await supabase
    .from('balance_sheets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', balanceSheetId);
}

// ============================================
// processParsedBilan
// ============================================

/**
 * Persist parsed items into balance_sheet_items and update overall confidence.
 * Deletes existing items first (idempotent for re-parse).
 */
export async function processParsedBilan(
  supabase: SupabaseClient,
  balanceSheetId: string,
  parsedData: ParseResult
): Promise<void> {
  // a) Delete any existing items for this balance_sheet (in case of re-parse)
  await supabase
    .from('balance_sheet_items')
    .delete()
    .eq('balance_sheet_id', balanceSheetId);

  // b) Insert all parsed items
  if (parsedData.items.length > 0) {
    const rows = parsedData.items.map((item) => ({
      balance_sheet_id: balanceSheetId,
      section: item.section as BalanceSheetSection,
      category: item.category,
      pcg_code: item.pcg_code,
      amount: item.amount,
      amount_n_minus_1: item.amount_n_minus_1,
      confidence_score: item.confidence_score,
      original_label: item.original_label,
    }));

    const { error } = await supabase
      .from('balance_sheet_items')
      .insert(rows);

    if (error) throw error;
  }

  // c) Update balance_sheet overall_confidence
  await supabase
    .from('balance_sheets')
    .update({ overall_confidence: parsedData.overallConfidence })
    .eq('id', balanceSheetId);
}

// ============================================
// triggerBilanParsing
// ============================================

/**
 * Main orchestration function for bilan parsing.
 * Manages the full lifecycle: job management, Edge Function call,
 * data persistence, coherence checks, and status updates.
 */
export async function triggerBilanParsing(
  supabase: SupabaseClient,
  jobId: string,
  balanceSheetId: string,
  fileUrl: string,
  sourceType: BalanceSheetSourceType
): Promise<void> {
  try {
    // a) Start the job
    await startJob(supabase, jobId);

    // b) Update balance_sheet status to 'parsing'
    await updateSheetStatus(supabase, balanceSheetId, 'parsing');

    // c) Update job progress to 10
    await updateJobProgress(supabase, jobId, 10);

    // d) Call the Edge Function
    const { data, error: fnError } = await supabase.functions.invoke('parse-bilan', {
      body: { jobId, fileUrl, sourceType, balanceSheetId },
    });

    // e) If Edge Function returns error: fail the job, restore sheet status
    if (fnError) {
      await failJob(supabase, jobId, fnError.message ?? 'Edge Function error');
      await updateSheetStatus(supabase, balanceSheetId, 'uploaded');
      return;
    }

    // f) Update job progress to 50
    await updateJobProgress(supabase, jobId, 50);

    // g) Persist parsed items
    const parsedData = data as ParseResult;
    await processParsedBilan(supabase, balanceSheetId, parsedData);

    // h) Update job progress to 80
    await updateJobProgress(supabase, jobId, 80);

    // i) Run coherence checks
    await runCoherenceChecks(supabase, balanceSheetId);

    // j) Update balance_sheet status to 'parsed'
    await updateSheetStatus(supabase, balanceSheetId, 'parsed');

    // k) Complete the job
    await completeJob(supabase, jobId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during bilan parsing';
    await failJob(supabase, jobId, message).catch(() => {});
    await updateSheetStatus(supabase, balanceSheetId, 'uploaded').catch(() => {});
  }
}
