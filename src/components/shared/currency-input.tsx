'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  currency?: string;
}

/**
 * Currency input with € suffix and numeric-only input.
 * Stores raw string value — formatting is handled at display time.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, currency = '€', className, ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      // Allow digits, one dot or comma, and up to 2 decimals
      const sanitized = raw.replace(',', '.');
      if (sanitized === '' || /^\d*\.?\d{0,2}$/.test(sanitized)) {
        onChange(sanitized);
      }
    }

    return (
      <div className="relative">
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          {currency}
        </span>
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
