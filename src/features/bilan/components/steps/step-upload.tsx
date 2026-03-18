'use client';

import { useState } from 'react';
import { FileSearch, FileSpreadsheet, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUpload, FilePreview } from '@/components/shared/file-upload';
import { useUploadAndCreateBalanceSheet } from '../../hooks/use-balance-sheets';
import { cn } from '@/lib/utils';
import type { BalanceSheetSourceType } from '@/types/enums';

interface StepUploadProps {
  onUploadComplete: (balanceSheetId: string, jobId: string) => void;
}

type SourceChoice = 'libre' | 'template';

const CURRENT_YEAR = new Date().getFullYear();
const FISCAL_YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 1 - i);

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function StepUpload({ onUploadComplete }: StepUploadProps) {
  const [fiscalYear, setFiscalYear] = useState<number>(CURRENT_YEAR - 1);
  const [sourceChoice, setSourceChoice] = useState<SourceChoice | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const uploadMutation = useUploadAndCreateBalanceSheet();

  function getSourceType(): BalanceSheetSourceType {
    if (!file || !sourceChoice) return 'pdf_auto';
    if (sourceChoice === 'template') return 'template';
    if (file.type === 'application/pdf') return 'pdf_auto';
    return 'excel_auto';
  }

  async function handleSubmit() {
    if (!file || !sourceChoice) return;

    try {
      const result = await uploadMutation.mutateAsync({
        file,
        fiscalYear,
        sourceType: getSourceType(),
      });
      onUploadComplete(result.balanceSheet.id, result.jobId);
    } catch {
      // Error is handled by mutation state
    }
  }

  const canSubmit = !!file && !!sourceChoice && !uploadMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Fiscal year selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Exercice fiscal</label>
        <select
          value={fiscalYear}
          onChange={(e) => setFiscalYear(Number(e.target.value))}
          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {FISCAL_YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Source type choice */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type de source</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setSourceChoice('libre'); setFile(null); }}
            className={cn(
              'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50',
              sourceChoice === 'libre'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border'
            )}
          >
            <FileSearch className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-medium">Import libre</p>
              <p className="text-xs text-muted-foreground">
                PDF ou Excel, import structuré
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setSourceChoice('template'); setFile(null); }}
            className={cn(
              'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50',
              sourceChoice === 'template'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border'
            )}
          >
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-medium">Template NXT Finance</p>
              <p className="text-xs text-muted-foreground">
                Import fiable et rapide, recommandé
              </p>
            </div>
            <a
              href="#"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              <Download className="h-3 w-3" />
              Télécharger le template
            </a>
          </button>
        </div>
      </div>

      {/* File upload */}
      {sourceChoice && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Fichier</label>
          {file ? (
            <FilePreview file={file} onRemove={() => setFile(null)} />
          ) : (
            <FileUpload
              onFilesSelected={(files) => setFile(files[0])}
              accept={ACCEPTED_MIME_TYPES}
              isUploading={uploadMutation.isPending}
              compact
            />
          )}
        </div>
      )}

      {/* Error */}
      {uploadMutation.isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {uploadMutation.error?.message ?? "Erreur lors de l'import. Veuillez réessayer."}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="min-w-[160px]"
        >
          {uploadMutation.isPending ? "Import en cours..." : "Lancer l'import"}
        </Button>
      </div>
    </div>
  );
}
