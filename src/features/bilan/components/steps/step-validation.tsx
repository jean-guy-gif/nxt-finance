'use client';

import { useState, useMemo } from 'react';
import {
  CheckCircle, AlertTriangle, XCircle, Check, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useBalanceSheet,
  useValidateBalanceSheetItem,
  useValidateBalanceSheet,
  useRejectBalanceSheet,
} from '../../hooks/use-balance-sheets';
import { BALANCE_SHEET_SECTION_LABELS } from '@/types/enums';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { BalanceSheetItem, BalanceSheetCheck } from '@/types/models';
import type { BalanceSheetSection, CoherenceCheckStatus } from '@/types/enums';

interface StepValidationProps {
  balanceSheetId: string;
  onValidated: () => void;
  onRejected: () => void;
}

function confidenceColor(score: number): string {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function confidenceBg(score: number): string {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

const checkStatusIcon: Record<CoherenceCheckStatus, typeof CheckCircle> = {
  passed: CheckCircle,
  warning: AlertTriangle,
  failed: XCircle,
};

const checkStatusColor: Record<CoherenceCheckStatus, string> = {
  passed: 'text-emerald-600',
  warning: 'text-amber-600',
  failed: 'text-red-600',
};

export function StepValidation({ balanceSheetId, onValidated, onRejected }: StepValidationProps) {
  const { data: balanceSheet, isLoading } = useBalanceSheet(balanceSheetId);
  const validateItemMutation = useValidateBalanceSheetItem();
  const validateSheetMutation = useValidateBalanceSheet();
  const rejectMutation = useRejectBalanceSheet();

  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const items = balanceSheet?.items ?? [];
  const checks = balanceSheet?.checks ?? [];
  const overallConfidence = balanceSheet?.overall_confidence ?? 0;

  // Group items by section
  const groupedItems = useMemo(() => {
    const groups = new Map<BalanceSheetSection, BalanceSheetItem[]>();
    for (const item of items) {
      const section = item.section;
      if (!groups.has(section)) {
        groups.set(section, []);
      }
      groups.get(section)!.push(item);
    }
    return groups;
  }, [items]);

  const hasFailedCheck = checks.some((c) => c.status === 'failed');

  async function handleValidateItem(itemId: string, correctedAmount?: number) {
    await validateItemMutation.mutateAsync({ itemId, correctedAmount });
    setEditingItemId(null);
  }

  async function handleValidateSheet() {
    try {
      await validateSheetMutation.mutateAsync(balanceSheetId);
      onValidated();
    } catch {
      // Error shown via mutation state
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: balanceSheetId, reason: rejectReason });
      onRejected();
    } catch {
      // Error shown via mutation state
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Chargement du bilan...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall confidence bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Confiance globale</span>
          <span className={cn('font-semibold', confidenceColor(overallConfidence))}>
            {overallConfidence}%
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', confidenceBg(overallConfidence))}
            style={{ width: `${overallConfidence}%` }}
          />
        </div>
      </div>

      {/* Items grouped by section */}
      {Array.from(groupedItems.entries()).map(([section, sectionItems]) => (
        <div key={section} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {BALANCE_SHEET_SECTION_LABELS[section] ?? section}
          </h3>
          <div className="rounded-lg border divide-y">
            {sectionItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                {/* Validate checkbox */}
                <button
                  type="button"
                  onClick={() => handleValidateItem(item.id)}
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                    item.is_validated
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-border hover:border-primary'
                  )}
                >
                  {item.is_validated && <Check className="h-3 w-3" />}
                </button>

                {/* Category + PCG code */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.category}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.pcg_code && <span className="mr-2">{item.pcg_code}</span>}
                    {item.original_label}
                  </p>
                </div>

                {/* Confidence score */}
                <span className={cn('text-xs font-medium shrink-0', confidenceColor(item.confidence_score))}>
                  {item.confidence_score}%
                </span>

                {/* Amount — editable */}
                {editingItemId === item.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="h-7 w-28 text-right text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleValidateItem(item.id, parseFloat(editAmount));
                        }
                        if (e.key === 'Escape') {
                          setEditingItemId(null);
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleValidateItem(item.id, parseFloat(editAmount))}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-1 shrink-0 text-sm font-medium tabular-nums hover:text-primary transition-colors"
                    onClick={() => {
                      setEditingItemId(item.id);
                      setEditAmount(String(item.amount));
                    }}
                  >
                    {formatCurrency(item.amount)}
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Coherence checks */}
      {checks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Contrôles de cohérence
          </h3>
          <div className="rounded-lg border divide-y">
            {checks.map((check: BalanceSheetCheck) => {
              const Icon = checkStatusIcon[check.status];
              return (
                <div key={check.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <Icon className={cn('h-5 w-5 shrink-0', checkStatusColor[check.status])} />
                  <span className="flex-1">{check.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error messages */}
      {(validateSheetMutation.isError || rejectMutation.isError) && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {validateSheetMutation.error?.message ?? rejectMutation.error?.message ?? 'Erreur'}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
        {showRejectInput ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              placeholder="Raison du rejet..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              Confirmer
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
            >
              Annuler
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="text-destructive border-destructive/50 hover:bg-destructive/10"
            onClick={() => setShowRejectInput(true)}
          >
            Rejeter
          </Button>
        )}

        <Button
          onClick={handleValidateSheet}
          disabled={hasFailedCheck || validateSheetMutation.isPending}
          className="min-w-[160px]"
        >
          {validateSheetMutation.isPending ? 'Validation...' : 'Valider le bilan'}
        </Button>
      </div>
    </div>
  );
}
