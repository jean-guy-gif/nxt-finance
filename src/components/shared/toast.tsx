'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastLevel = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  level: ToastLevel;
}

interface ToastContextValue {
  toast: (message: string, level?: ToastLevel) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, level: ToastLevel = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, level }]);
    // Auto-dismiss after 5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      {/* Toast container — fixed bottom right */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

const levelConfig = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  error: { icon: AlertCircle, bg: 'bg-red-50 border-red-200 text-red-800' },
  info: { icon: Info, bg: 'bg-blue-50 border-blue-200 text-blue-800' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = levelConfig[toast.level];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right-5 fade-in duration-200',
        config.bg
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <p className="flex-1 text-sm">{toast.message}</p>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
