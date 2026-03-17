import type { SupabaseClient } from '@supabase/supabase-js';
import type { BalanceSheet, BalanceSheetItem, BalanceSheetCheck } from '@/types/models';
import type { BalanceSheetSourceType, BalanceSheetSection } from '@/types/enums';
import { BILAN_ANALYSIS_CONFIDENCE_GATE } from '@/lib/constants';

// ============================================
// Balance sheet service
// CRUD, validation, coherence checks, file upload.
// ============================================

export interface CreateBalanceSheetInput {
  agencyId: string;
  fiscalYear: number;
  sourceType: BalanceSheetSourceType;
  sourceFilePath?: string;
}

// ---------------------------------------------------------------------------
// 1. fetchBalanceSheets
// ---------------------------------------------------------------------------

/**
 * Fetch all balance sheets for an agency, optionally filtered by fiscal year.
 */
export async function fetchBalanceSheets(
  supabase: SupabaseClient,
  agencyId: string,
  fiscalYear?: number
): Promise<BalanceSheet[]> {
  let query = supabase
    .from('balance_sheets')
    .select('*')
    .eq('agency_id', agencyId)
    .order('fiscal_year', { ascending: false })
    .order('created_at', { ascending: false });

  if (fiscalYear !== undefined) {
    query = query.eq('fiscal_year', fiscalYear);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BalanceSheet[];
}

// ---------------------------------------------------------------------------
// 2. fetchBalanceSheet
// ---------------------------------------------------------------------------

/**
 * Fetch a single balance sheet by id, with items and checks.
 */
export async function fetchBalanceSheet(
  supabase: SupabaseClient,
  id: string
): Promise<BalanceSheet | null> {
  const { data, error } = await supabase
    .from('balance_sheets')
    .select('*, items:balance_sheet_items(*), checks:balance_sheet_checks(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as BalanceSheet | null;
}

// ---------------------------------------------------------------------------
// 3. createBalanceSheet
// ---------------------------------------------------------------------------

/**
 * Create a new balance sheet with status 'uploaded'.
 */
export async function createBalanceSheet(
  supabase: SupabaseClient,
  input: CreateBalanceSheetInput
): Promise<BalanceSheet> {
  const { data, error } = await supabase
    .from('balance_sheets')
    .insert({
      agency_id: input.agencyId,
      fiscal_year: input.fiscalYear,
      source_type: input.sourceType,
      source_file_path: input.sourceFilePath ?? null,
      status: 'uploaded',
      version_number: 1,
      is_current: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as BalanceSheet;
}

// ---------------------------------------------------------------------------
// 4. validateBalanceSheetItem
// ---------------------------------------------------------------------------

/**
 * Mark an individual item as validated; optionally correct its amount.
 */
export async function validateBalanceSheetItem(
  supabase: SupabaseClient,
  itemId: string,
  correctedAmount?: number
): Promise<BalanceSheetItem> {
  const update: Record<string, unknown> = { is_validated: true };
  if (correctedAmount !== undefined) {
    update.amount = correctedAmount;
  }

  const { data, error } = await supabase
    .from('balance_sheet_items')
    .update(update)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) throw error;
  return data as BalanceSheetItem;
}

// ---------------------------------------------------------------------------
// 5. validateBalanceSheet
// ---------------------------------------------------------------------------

/**
 * Validate a balance sheet after checking coherence and confidence.
 * Archives previous validated versions for the same agency + fiscal year.
 */
export async function validateBalanceSheet(
  supabase: SupabaseClient,
  id: string,
  validatedBy: string
): Promise<BalanceSheet> {
  // Fetch sheet with checks and items
  const sheet = await fetchBalanceSheet(supabase, id);
  if (!sheet) throw new Error('Balance sheet not found');

  // Guard: no unresolved failed checks
  const failedChecks = (sheet.checks ?? []).filter(c => c.status === 'failed');
  if (failedChecks.length > 0) {
    throw new Error('Cannot validate: unresolved failed checks');
  }

  // Guard: confidence gate or all items validated
  const allItemsValidated =
    (sheet.items ?? []).length > 0 &&
    (sheet.items ?? []).every(i => i.is_validated);

  if (
    sheet.overall_confidence < BILAN_ANALYSIS_CONFIDENCE_GATE &&
    !allItemsValidated
  ) {
    throw new Error(
      `Cannot validate: confidence (${sheet.overall_confidence}) below gate (${BILAN_ANALYSIS_CONFIDENCE_GATE}) and not all items are validated`
    );
  }

  // Archive previous validated versions for the same agency + fiscal year
  await supabase
    .from('balance_sheets')
    .update({
      is_current: false,
      archived_reason: 'Replaced by newer version',
    })
    .eq('agency_id', sheet.agency_id)
    .eq('fiscal_year', sheet.fiscal_year)
    .neq('id', id);

  // Validate this sheet
  const { data, error } = await supabase
    .from('balance_sheets')
    .update({
      status: 'validated',
      validated_by: validatedBy,
      validated_at: new Date().toISOString(),
      is_current: true,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as BalanceSheet;
}

// ---------------------------------------------------------------------------
// 6. rejectBalanceSheet
// ---------------------------------------------------------------------------

/**
 * Reject a balance sheet with a reason.
 */
export async function rejectBalanceSheet(
  supabase: SupabaseClient,
  id: string,
  reason: string
): Promise<BalanceSheet> {
  const { data, error } = await supabase
    .from('balance_sheets')
    .update({
      status: 'rejected',
      archived_reason: reason,
      is_current: false,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as BalanceSheet;
}

// ---------------------------------------------------------------------------
// 7. runCoherenceChecks
// ---------------------------------------------------------------------------

/** Sections that compose the "actif" side of the balance sheet. */
const ACTIF_SECTIONS: BalanceSheetSection[] = ['actif_immobilise', 'actif_circulant'];
/** Sections that compose the "passif" side of the balance sheet. */
const PASSIF_SECTIONS: BalanceSheetSection[] = ['capitaux_propres', 'dettes'];
/** The four main balance-sheet sections that must be present. */
const MAIN_SECTIONS: BalanceSheetSection[] = [
  'actif_immobilise', 'actif_circulant', 'capitaux_propres', 'dettes',
];

function sumBySection(items: BalanceSheetItem[], sections: BalanceSheetSection[]): number {
  return items
    .filter(i => (sections as string[]).includes(i.section))
    .reduce((sum, i) => sum + Number(i.amount), 0);
}

/**
 * Run coherence checks on a balance sheet, persist results,
 * and recompute the overall confidence score.
 */
export async function runCoherenceChecks(
  supabase: SupabaseClient,
  balanceSheetId: string
): Promise<BalanceSheetCheck[]> {
  // Delete existing checks
  await supabase
    .from('balance_sheet_checks')
    .delete()
    .eq('balance_sheet_id', balanceSheetId);

  // Fetch items
  const { data: items, error: itemsError } = await supabase
    .from('balance_sheet_items')
    .select('*')
    .eq('balance_sheet_id', balanceSheetId);

  if (itemsError) throw itemsError;
  const allItems = (items ?? []) as BalanceSheetItem[];

  const checks: Omit<BalanceSheetCheck, 'id' | 'created_at' | 'updated_at'>[] = [];

  // --- a) actif_passif_balance ---
  const totalActif = sumBySection(allItems, ACTIF_SECTIONS);
  const totalPassif = sumBySection(allItems, PASSIF_SECTIONS);
  const diff = Math.abs(totalActif - totalPassif);
  const diffPct = totalActif > 0 ? (diff / totalActif) * 100 : (diff > 0 ? 100 : 0);

  if (diff <= 0.01) {
    checks.push({
      balance_sheet_id: balanceSheetId,
      check_type: 'actif_passif_balance',
      status: 'passed',
      severity: 'info',
      expected_value: totalActif,
      actual_value: totalPassif,
      message: `Actif (${totalActif.toFixed(2)}) = Passif (${totalPassif.toFixed(2)})`,
    });
  } else if (diffPct < 5) {
    checks.push({
      balance_sheet_id: balanceSheetId,
      check_type: 'actif_passif_balance',
      status: 'warning',
      severity: 'warning',
      expected_value: totalActif,
      actual_value: totalPassif,
      message: `Écart actif/passif de ${diff.toFixed(2)} (${diffPct.toFixed(1)}%)`,
    });
  } else {
    checks.push({
      balance_sheet_id: balanceSheetId,
      check_type: 'actif_passif_balance',
      status: 'failed',
      severity: 'critical',
      expected_value: totalActif,
      actual_value: totalPassif,
      message: `Déséquilibre actif/passif critique : ${diff.toFixed(2)} (${diffPct.toFixed(1)}%)`,
    });
  }

  // --- b) totals_consistency ---
  const produits = sumBySection(allItems, [
    'produits_exploitation', 'produits_financiers', 'produits_exceptionnels',
  ]);
  const charges = sumBySection(allItems, [
    'charges_exploitation', 'charges_financieres', 'charges_exceptionnelles',
  ]);
  const resultat = produits - charges;

  if (resultat < 0) {
    checks.push({
      balance_sheet_id: balanceSheetId,
      check_type: 'totals_consistency',
      status: 'warning',
      severity: 'info',
      expected_value: produits,
      actual_value: charges,
      message: `Résultat négatif (${resultat.toFixed(2)}) — vérifier si attendu`,
    });
  } else {
    checks.push({
      balance_sheet_id: balanceSheetId,
      check_type: 'totals_consistency',
      status: 'passed',
      severity: 'info',
      expected_value: produits,
      actual_value: charges,
      message: `Résultat positif (${resultat.toFixed(2)})`,
    });
  }

  // --- c) missing_items ---
  const presentSections = new Set(allItems.map(i => i.section));
  const missingSections = MAIN_SECTIONS.filter(s => !presentSections.has(s));
  if (missingSections.length > 0) {
    checks.push({
      balance_sheet_id: balanceSheetId,
      check_type: 'missing_items',
      status: 'warning',
      severity: 'warning',
      expected_value: MAIN_SECTIONS.length,
      actual_value: MAIN_SECTIONS.length - missingSections.length,
      message: `Sections manquantes : ${missingSections.join(', ')}`,
    });
  } else {
    checks.push({
      balance_sheet_id: balanceSheetId,
      check_type: 'missing_items',
      status: 'passed',
      severity: 'info',
      expected_value: MAIN_SECTIONS.length,
      actual_value: MAIN_SECTIONS.length,
      message: 'Toutes les sections principales sont présentes',
    });
  }

  // Insert all checks
  const { data: insertedChecks, error: insertError } = await supabase
    .from('balance_sheet_checks')
    .insert(checks)
    .select('*');

  if (insertError) throw insertError;

  // Recompute overall confidence
  const avgConfidence =
    allItems.length > 0
      ? allItems.reduce((sum, i) => sum + Number(i.confidence_score), 0) / allItems.length
      : 0;

  const failedCount = checks.filter(c => c.status === 'failed').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const penalty = failedCount * 10 + warningCount * 5;
  const overallConfidence = Math.max(0, Math.min(100, Math.round(avgConfidence - penalty)));

  await supabase
    .from('balance_sheets')
    .update({ overall_confidence: overallConfidence })
    .eq('id', balanceSheetId);

  return (insertedChecks ?? []) as BalanceSheetCheck[];
}

// ---------------------------------------------------------------------------
// 8. uploadBilanFile
// ---------------------------------------------------------------------------

/**
 * Upload a file to the 'bilans' storage bucket.
 * Returns the file path within the bucket.
 */
export async function uploadBilanFile(
  supabase: SupabaseClient,
  agencyId: string,
  file: File
): Promise<string> {
  const filePath = `${agencyId}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from('bilans')
    .upload(filePath, file);

  if (error) throw error;
  return filePath;
}
