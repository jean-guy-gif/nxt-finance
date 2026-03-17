'use client';

import { useCallback, useState } from 'react';
import { BackButton } from '@/components/shared/back-button';
import { cn } from '@/lib/utils';
import { StepUpload } from './steps/step-upload';
import { StepParsing } from './steps/step-parsing';
import { StepValidation } from './steps/step-validation';
import { StepComplete } from './steps/step-complete';

type WizardStep = 'upload' | 'parsing' | 'validation' | 'complete';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Import' },
  { key: 'parsing', label: 'Extraction' },
  { key: 'validation', label: 'Validation' },
  { key: 'complete', label: 'Terminé' },
];

export function ImportWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [balanceSheetId, setBalanceSheetId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleUploadComplete = useCallback((bsId: string, jId: string) => {
    setBalanceSheetId(bsId);
    setJobId(jId);
    setCurrentStep('parsing');
  }, []);

  const handleParsingComplete = useCallback(() => {
    setCurrentStep('validation');
  }, []);

  const handleValidated = useCallback(() => {
    setCurrentStep('complete');
  }, []);

  const handleRejected = useCallback(() => {
    // On rejection, go back to step 1 for re-import
    resetWizard();
  }, []);

  function resetWizard() {
    setCurrentStep('upload');
    setBalanceSheetId(null);
    setJobId(null);
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton fallback="/analyse" label="Analyse" />
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Import bilan comptable
          </h1>
          <p className="text-sm text-muted-foreground">
            Importez et validez votre bilan en 4 étapes
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <nav aria-label="Progress" className="w-full">
        <ol className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <li key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 mx-2 rounded-full transition-colors -mt-5',
                      index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <div className="rounded-lg border bg-card p-6">
        {currentStep === 'upload' && (
          <StepUpload onUploadComplete={handleUploadComplete} />
        )}

        {currentStep === 'parsing' && jobId && balanceSheetId && (
          <StepParsing
            jobId={jobId}
            balanceSheetId={balanceSheetId}
            onParsingComplete={handleParsingComplete}
          />
        )}

        {currentStep === 'validation' && balanceSheetId && (
          <StepValidation
            balanceSheetId={balanceSheetId}
            onValidated={handleValidated}
            onRejected={handleRejected}
          />
        )}

        {currentStep === 'complete' && balanceSheetId && (
          <StepComplete
            balanceSheetId={balanceSheetId}
            onReset={resetWizard}
          />
        )}
      </div>
    </div>
  );
}
