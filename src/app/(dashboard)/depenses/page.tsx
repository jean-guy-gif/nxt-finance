import { Suspense } from 'react';
import { ExpenseListPage } from '@/features/expenses/components/expense-list-page';
import { LoadingState } from '@/components/shared/loading-state';

export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="Chargement..." />}>
      <ExpenseListPage />
    </Suspense>
  );
}
