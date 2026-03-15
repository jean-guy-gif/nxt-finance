'use client';

import type { ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FilterBarProps {
  /** Filter controls (Select, DatePicker, etc.) */
  children: ReactNode;
  /** Number of active filters */
  activeCount?: number;
  /** Called when user clicks "Reset" */
  onReset?: () => void;
}

/**
 * Horizontal filter bar for list pages.
 * Renders filter controls inline with an active filter count and reset button.
 */
export function FilterBar({ children, activeCount = 0, onReset }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-1">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Filtres</span>
        {activeCount > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {activeCount}
          </Badge>
        )}
      </div>

      {children}

      {activeCount > 0 && onReset && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={onReset}
        >
          <X className="mr-1 h-3 w-3" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
