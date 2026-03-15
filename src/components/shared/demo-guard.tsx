'use client';

import { useState } from 'react';
import { useAgencyStore } from '@/stores/agency-store';
import { DEMO_BLOCK_MESSAGE } from '@/lib/demo-guard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

/**
 * Hook that wraps a callback with demo protection.
 * If in demo mode, shows a blocking dialog instead of executing.
 * If not in demo mode, executes normally.
 */
export function useDemoGuard() {
  const isDemo = useAgencyStore((s) => s.isDemo);
  const [showBlock, setShowBlock] = useState(false);

  function guard(callback: () => void) {
    if (isDemo) {
      setShowBlock(true);
    } else {
      callback();
    }
  }

  return { guard, isDemo, showBlock, setShowBlock };
}

/**
 * Dialog shown when a user attempts a blocked action in demo mode.
 */
export function DemoBlockDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 mb-2">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle>Mode démonstration</DialogTitle>
          <DialogDescription>{DEMO_BLOCK_MESSAGE}</DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Créez un compte pour accéder à toutes les fonctionnalités.
        </p>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Compris
        </Button>
      </DialogContent>
    </Dialog>
  );
}
