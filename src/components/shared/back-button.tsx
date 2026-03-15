'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  /** Fallback URL if no browser history */
  fallback: string;
  /** Label shown next to the arrow */
  label?: string;
}

/**
 * Contextual back button — always visible, always labeled.
 * Uses router.back() if the user arrived from within the app.
 * Falls back to a fixed URL if the user arrived from an external link.
 */
export function BackButton({ fallback, label }: BackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="shrink-0 gap-1.5"
    >
      <ArrowLeft className="h-4 w-4" />
      {label ?? 'Retour'}
    </Button>
  );
}
