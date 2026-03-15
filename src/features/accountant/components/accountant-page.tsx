'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/shared/toast';
import {
  Users,
  MessageSquare,
  FileQuestion,
  BadgeCheck,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { FilterBar } from '@/components/shared/filter-bar';
import { SelectFilter } from '@/components/shared/period-filter';
import { formatPeriod, formatCurrency, formatDate } from '@/lib/formatters';
import {
  COMMENT_TYPES,
  COMMENT_TYPE_LABELS,
  PERIOD_STATUS_LABELS,
  type CommentType,
} from '@/types/enums';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import {
  useAccountantStats,
  useComments,
  useSharedPeriods,
  useResolveComment,
  useCreateComment,
} from '../hooks/use-accountant';
import { CommentThread } from './comment-thread';
import type { AccountantComment } from '@/types/models';

type TabValue = 'all' | 'requests' | 'periods';

export function AccountantPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [typeFilter, setTypeFilter] = useState<CommentType | 'all'>('all');
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'open' | 'resolved'>('open');

  // Read query params for drill-down
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'requests') setActiveTab('requests');
    if (tab === 'periods') setActiveTab('periods');
    const type = searchParams.get('type');
    if (type && type !== 'all') setTypeFilter(type as CommentType);
  }, [searchParams]);

  const { isManager, isAccountant, hasPermission } = usePermissions();
  const canComment = isManager || (isAccountant && hasPermission('comment'));
  const canValidate = isManager || (isAccountant && hasPermission('validate_document'));

  const stats = useAccountantStats();
  const sharedPeriods = useSharedPeriods();
  const resolveMutation = useResolveComment();
  const createMutation = useCreateComment();

  const commentFilters = {
    ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
    ...(resolvedFilter === 'open'
      ? { is_resolved: false as const }
      : resolvedFilter === 'resolved'
        ? { is_resolved: true as const }
        : {}),
  };
  const comments = useComments(commentFilters);

  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) + (resolvedFilter !== 'open' ? 1 : 0);

  function resetFilters() {
    setTypeFilter('all');
    setResolvedFilter('open');
  }

  const { toast } = useToast();

  function handleResolve(commentId: string) {
    resolveMutation.mutate(commentId, {
      onSuccess: () => {
        toast('Élément résolu', 'success');
      },
      onError: () => {
        toast('Impossible de résoudre cet élément. Vérifiez vos permissions.', 'error');
      },
    });
  }

  function handleAddComment(content: string, type: CommentType) {
    // This is used for the global comment list — no specific entity.
    // For entity-specific comments, CommentThread is embedded in detail pages.
    // Here we skip since we need a related entity.
  }

  if (stats.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Espace comptable" description="Collaborez avec votre cabinet comptable" />
        <LoadingState message="Chargement..." />
      </div>
    );
  }

  const hasFiltersFromUrl = searchParams.toString().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espace comptable"
        description="Collaborez avec votre cabinet comptable"
        backFallback={hasFiltersFromUrl ? '/' : undefined}
        backLabel={hasFiltersFromUrl ? 'Retour' : undefined}
      />

      {/* Stats */}
      {stats.data && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <StatCard
            label="Demandes en attente"
            value={stats.data.pendingRequests}
            icon={FileQuestion}
            iconClassName="bg-amber-500/10 text-amber-600"
          />
          <StatCard
            label="Non résolus"
            value={stats.data.unresolvedComments}
            icon={MessageSquare}
            iconClassName="bg-blue-500/10 text-blue-600"
          />
          <StatCard
            label="Périodes partagées"
            value={stats.data.sharedPeriods}
            icon={Calendar}
            iconClassName="bg-violet-500/10 text-violet-600"
          />
          <StatCard
            label="Validations"
            value={stats.data.validationsCount}
            icon={BadgeCheck}
            iconClassName="bg-emerald-500/10 text-emerald-600"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="all" className="text-xs">Échanges</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs">Demandes</TabsTrigger>
          <TabsTrigger value="periods" className="text-xs">Périodes partagées</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab content */}
      {activeTab === 'periods' ? (
        <SharedPeriodsView periods={sharedPeriods.data} isLoading={sharedPeriods.isLoading} />
      ) : (
        <CommentsView
          activeTab={activeTab}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          resolvedFilter={resolvedFilter}
          setResolvedFilter={setResolvedFilter}
          activeFilterCount={activeFilterCount}
          resetFilters={resetFilters}
          comments={comments.data}
          isLoading={comments.isLoading}
          isError={comments.isError}
          refetch={comments.refetch}
          onResolve={handleResolve}
          isResolving={resolveMutation.isPending}
          canComment={canComment}
        />
      )}
    </div>
  );
}

// --- Sub-views ---

function CommentsView({
  activeTab,
  typeFilter,
  setTypeFilter,
  resolvedFilter,
  setResolvedFilter,
  activeFilterCount,
  resetFilters,
  comments,
  isLoading,
  isError,
  refetch,
  onResolve,
  isResolving,
  canComment,
}: {
  activeTab: TabValue;
  typeFilter: CommentType | 'all';
  setTypeFilter: (v: CommentType | 'all') => void;
  resolvedFilter: 'all' | 'open' | 'resolved';
  setResolvedFilter: (v: 'all' | 'open' | 'resolved') => void;
  activeFilterCount: number;
  resetFilters: () => void;
  comments: AccountantComment[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  onResolve: (id: string) => void;
  isResolving: boolean;
  canComment: boolean;
}) {
  // When on "requests" tab, force the type filter
  const filteredComments = comments
    ? activeTab === 'requests'
      ? comments.filter((c) => c.type === 'request')
      : comments
    : [];

  if (isLoading) return <LoadingState message="Chargement des échanges..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-4">
      {activeTab === 'all' && (
        <FilterBar activeCount={activeFilterCount} onReset={resetFilters}>
          <SelectFilter
            value={typeFilter}
            onChange={setTypeFilter}
            options={COMMENT_TYPES}
            labels={COMMENT_TYPE_LABELS}
            placeholder="Type"
            allLabel="Tous types"
          />
          <SelectFilter
            value={resolvedFilter}
            onChange={(v) => setResolvedFilter(v as typeof resolvedFilter)}
            options={['open', 'resolved'] as const}
            labels={{ open: 'En cours', resolved: 'Résolus' }}
            placeholder="État"
            allLabel="Tous"
          />
        </FilterBar>
      )}

      {filteredComments.length === 0 ? (
        <EmptyState
          icon={Users}
          title={activeTab === 'requests' ? 'Aucune demande' : 'Aucun échange'}
          description={
            activeTab === 'requests'
              ? 'Aucune demande de complément en attente.'
              : 'Les échanges avec votre cabinet apparaîtront ici.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onResolve={() => onResolve(comment.id)}
              isResolving={isResolving}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getCommentHref(comment: AccountantComment): string | undefined {
  if (!comment.related_id) return undefined;
  if (comment.related_type === 'expense') return `/depenses/${comment.related_id}`;
  if (comment.related_type === 'period') return `/periodes/${comment.related_id}`;
  if (comment.related_type === 'receipt') return `/depenses`; // Receipts are viewed via expenses
  return undefined;
}

function CommentCard({
  comment,
  onResolve,
  isResolving,
}: {
  comment: AccountantComment;
  onResolve: () => void;
  isResolving: boolean;
}) {
  const typeColor: Record<CommentType, string> = {
    comment: 'text-blue-600 bg-blue-50',
    request: 'text-amber-600 bg-amber-50',
    validation: 'text-emerald-600 bg-emerald-50',
    annotation: 'text-violet-600 bg-violet-50',
  };

  const relatedLabels: Record<string, string> = {
    expense: 'Dépense',
    receipt: 'Justificatif',
    period: 'Période',
  };

  const href = getCommentHref(comment);

  return (
    <Card className={comment.is_resolved ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-medium">
                {comment.author?.full_name ?? 'Utilisateur'}
              </span>
              <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded ${typeColor[comment.type]}`}>
                {COMMENT_TYPE_LABELS[comment.type]}
              </span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {relatedLabels[comment.related_type] ?? comment.related_type}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatDate(comment.created_at)}
              </span>
              {comment.is_resolved && (
                <StatusBadge status="completed" label="Résolu" />
              )}
            </div>
            <p className="text-sm">{comment.content}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {href && (
              <a href={href}>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  Voir
                </Button>
              </a>
            )}
            {!comment.is_resolved && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={onResolve}
                disabled={isResolving}
              >
                Résoudre
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SharedPeriodsView({
  periods,
  isLoading,
}: {
  periods: Awaited<ReturnType<typeof import('../services/accountant-service').fetchSharedPeriods>> | undefined;
  isLoading: boolean;
}) {
  if (isLoading) return <LoadingState message="Chargement des périodes..." />;
  if (!periods || periods.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Aucune période partagée"
        description="Partagez une période comptable depuis le module Périodes pour la rendre accessible à votre cabinet."
      />
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {periods.map((period) => (
        <Card key={period.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold capitalize">
                {formatPeriod(period.month, period.year)}
              </h3>
              <StatusBadge
                status={period.status}
                label={PERIOD_STATUS_LABELS[period.status]}
              />
            </div>
            {period.vat_balance != null && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Collectée</p>
                  <p className="text-xs font-medium">{formatCurrency(period.vat_collected ?? 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Déductible</p>
                  <p className="text-xs font-medium">{formatCurrency(period.vat_deductible ?? 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Solde</p>
                  <p className="text-xs font-semibold">{formatCurrency(period.vat_balance ?? 0)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
