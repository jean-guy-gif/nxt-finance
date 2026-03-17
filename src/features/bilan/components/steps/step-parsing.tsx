'use client';

import { useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJobStatus } from '@/features/shared/hooks/use-jobs';
import { cn } from '@/lib/utils';

interface StepParsingProps {
  jobId: string;
  balanceSheetId: string;
  onParsingComplete: () => void;
}

export function StepParsing({ jobId, onParsingComplete }: StepParsingProps) {
  const { data: job, isLoading, refetch } = useJobStatus(jobId);

  const status = job?.status;
  const progress = job?.progress ?? 0;

  useEffect(() => {
    if (status === 'completed') {
      onParsingComplete();
    }
  }, [status, onParsingComplete]);

  const isFailed = status === 'failed';

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      {isFailed ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-medium text-destructive">
              Erreur lors de l&apos;extraction
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              {job?.error_message ?? "Une erreur est survenue pendant l'extraction des postes comptables."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </>
      ) : (
        <>
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <div className="text-center space-y-1">
            <p className="text-base font-medium">
              Extraction en cours...
            </p>
            <p className="text-sm text-muted-foreground">
              Extraction des postes comptables en cours...
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs space-y-1">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full bg-primary transition-all duration-500 ease-out',
                )}
                style={{ width: `${Math.max(progress, isLoading ? 5 : 0)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {progress}%
            </p>
          </div>
        </>
      )}
    </div>
  );
}
