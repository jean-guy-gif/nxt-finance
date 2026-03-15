'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant = 'draft' | 'to_verify' | 'validated' | 'collected' | 'transmitted' |
  'received' | 'unreadable' | 'incomplete' | 'usable' |
  'in_progress' | 'ready_to_transmit' |
  'info' | 'vigilance' | 'critical' |
  'pending' | 'processing' | 'completed' | 'failed';

const statusStyles: Record<StatusVariant, string> = {
  // Common
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  to_verify: 'bg-amber-50 text-amber-700 border-amber-200',
  validated: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  collected: 'bg-blue-50 text-blue-700 border-blue-200',
  transmitted: 'bg-violet-50 text-violet-700 border-violet-200',
  // Receipts
  received: 'bg-sky-50 text-sky-700 border-sky-200',
  unreadable: 'bg-red-50 text-red-700 border-red-200',
  incomplete: 'bg-orange-50 text-orange-700 border-orange-200',
  usable: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // Periods
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  ready_to_transmit: 'bg-teal-50 text-teal-700 border-teal-200',
  // Alerts
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  vigilance: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  // Exports
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

interface StatusBadgeProps {
  status: StatusVariant;
  label: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-medium border',
        statusStyles[status] ?? statusStyles.draft,
        className
      )}
    >
      {label}
    </Badge>
  );
}
