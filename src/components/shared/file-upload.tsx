'use client';

import { useCallback, useState, useRef } from 'react';
import { Upload, X, FileText, Image, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface FileUploadProps {
  /** Called when files are selected */
  onFilesSelected: (files: File[]) => void;
  /** Allow multiple files */
  multiple?: boolean;
  /** Accepted MIME types (defaults to images + PDF) */
  accept?: string[];
  /** Max file size in bytes (default 10MB) */
  maxSize?: number;
  /** Whether an upload is currently in progress */
  isUploading?: boolean;
  /** Upload progress (0-100) */
  progress?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Compact mode — smaller drop zone */
  compact?: boolean;
  className?: string;
}

export function FileUpload({
  onFilesSelected,
  multiple = false,
  accept = ACCEPTED_TYPES,
  maxSize = MAX_FILE_SIZE,
  isUploading = false,
  progress,
  disabled = false,
  compact = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const valid: File[] = [];
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        if (!accept.includes(file.type)) {
          setError(`Type non supporté : ${file.name}. Formats acceptés : JPEG, PNG, PDF.`);
          return [];
        }
        if (file.size > maxSize) {
          const maxMB = Math.round(maxSize / 1024 / 1024);
          setError(`Fichier trop volumineux : ${file.name}. Maximum ${maxMB} Mo.`);
          return [];
        }
        valid.push(file);
      }

      setError(null);
      return valid;
    },
    [accept, maxSize]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const valid = validateFiles(files);
      if (valid.length > 0) {
        onFilesSelected(multiple ? valid : [valid[0]]);
      }
    },
    [validateFiles, onFilesSelected, multiple]
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && !isUploading && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleClick() {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors cursor-pointer',
          compact ? 'p-4 gap-2' : 'p-8 gap-3',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30',
          (disabled || isUploading) && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
          // Enable camera on mobile
          capture="environment"
        />

        {isUploading ? (
          <>
            <Loader2 className={cn('text-primary animate-spin', compact ? 'h-5 w-5' : 'h-8 w-8')} />
            <div className="text-center">
              <p className="text-sm font-medium">Envoi en cours...</p>
              {progress !== undefined && (
                <div className="mt-2 w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={cn(
              'flex items-center justify-center rounded-full bg-muted',
              compact ? 'h-8 w-8' : 'h-12 w-12'
            )}>
              <Upload className={cn('text-muted-foreground', compact ? 'h-4 w-4' : 'h-5 w-5')} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {isDragging ? 'Déposez ici' : 'Glissez un fichier ou cliquez'}
              </p>
              {!compact && (
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG ou PDF — {Math.round(maxSize / 1024 / 1024)} Mo max
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// --- File preview thumbnail ---

interface FilePreviewProps {
  file: File;
  onRemove?: () => void;
  className?: string;
}

export function FilePreview({ file, onRemove, className }: FilePreviewProps) {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  const sizeKB = Math.round(file.size / 1024);
  const sizeLabel = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} Mo` : `${sizeKB} Ko`;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3',
        className
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
        {isImage ? (
          <Image className="h-5 w-5 text-muted-foreground" />
        ) : isPdf ? (
          <FileText className="h-5 w-5 text-red-500" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{sizeLabel}</p>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
