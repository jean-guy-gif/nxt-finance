'use client';

import { FileText, Image, AlertCircle, Download, Unlink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { RECEIPT_STATUS_LABELS } from '@/types/enums';
import type { ReceiptDocument } from '@/types/models';
import { OCR_CONFIDENCE_THRESHOLD } from '@/lib/constants';

interface ReceiptCardProps {
  receipt: ReceiptDocument;
  onDownload?: () => void;
  onUnlink?: () => void;
  onDelete?: () => void;
}

/**
 * Displays a receipt document with its OCR data, anomalies, and status.
 * Manual values always take precedence — OCR data is shown as "extracted" context.
 */
export function ReceiptCard({
  receipt,
  onDownload,
  onUnlink,
  onDelete,
}: ReceiptCardProps) {
  const isImage = receipt.file_type.startsWith('image/');
  const isLowConfidence =
    receipt.ocr_confidence != null &&
    receipt.ocr_confidence < OCR_CONFIDENCE_THRESHOLD;
  const hasAnomalies = receipt.anomalies.length > 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header: file info + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isImage ? (
            <Image className="h-5 w-5 text-muted-foreground shrink-0" />
          ) : (
            <FileText className="h-5 w-5 text-red-500 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{receipt.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {receipt.source === 'photo' ? 'Photo' : receipt.source === 'email' ? 'Email' : 'Upload'}
            </p>
          </div>
        </div>
        <StatusBadge
          status={receipt.status}
          label={RECEIPT_STATUS_LABELS[receipt.status]}
        />
      </div>

      {/* OCR extracted data (if any) */}
      {(receipt.ocr_supplier || receipt.ocr_amount || receipt.ocr_date) && (
        <div className="rounded-md bg-muted/50 p-2.5 space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Données extraites
            {receipt.ocr_confidence != null && (
              <span className={isLowConfidence ? ' text-amber-600' : ' text-emerald-600'}>
                {' '}— confiance {Math.round(receipt.ocr_confidence * 100)}%
              </span>
            )}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {receipt.ocr_supplier && (
              <>
                <span className="text-xs text-muted-foreground">Fournisseur</span>
                <span className="text-xs">{receipt.ocr_supplier}</span>
              </>
            )}
            {receipt.ocr_amount != null && (
              <>
                <span className="text-xs text-muted-foreground">Montant</span>
                <span className="text-xs">{formatCurrency(receipt.ocr_amount)}</span>
              </>
            )}
            {receipt.ocr_vat != null && (
              <>
                <span className="text-xs text-muted-foreground">TVA</span>
                <span className="text-xs">{formatCurrency(receipt.ocr_vat)}</span>
              </>
            )}
            {receipt.ocr_date && (
              <>
                <span className="text-xs text-muted-foreground">Date</span>
                <span className="text-xs">{formatDate(receipt.ocr_date)}</span>
              </>
            )}
          </div>
          {isLowConfidence && (
            <p className="text-[10px] text-amber-600 mt-1">
              Confiance faible — vérifiez les données manuellement
            </p>
          )}
        </div>
      )}

      {/* Anomalies */}
      {hasAnomalies && (
        <div className="space-y-1">
          {receipt.anomalies.map((anomaly, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{anomaly.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1">
        {onDownload && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onDownload}>
            <Download className="mr-1 h-3 w-3" />
            Voir
          </Button>
        )}
        {onUnlink && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onUnlink}>
            <Unlink className="mr-1 h-3 w-3" />
            Détacher
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Supprimer
          </Button>
        )}
      </div>
    </div>
  );
}
