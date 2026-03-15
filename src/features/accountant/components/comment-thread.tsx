'use client';

import { useState } from 'react';
import { CheckCircle2, MessageSquare, Send, FileQuestion, BadgeCheck, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { COMMENT_TYPE_LABELS, type CommentType } from '@/types/enums';
import type { AccountantComment } from '@/types/models';

const typeIcons: Record<CommentType, typeof MessageSquare> = {
  comment: MessageSquare,
  request: FileQuestion,
  validation: BadgeCheck,
  annotation: StickyNote,
};

const typeColors: Record<CommentType, string> = {
  comment: 'text-blue-600 bg-blue-50',
  request: 'text-amber-600 bg-amber-50',
  validation: 'text-emerald-600 bg-emerald-50',
  annotation: 'text-violet-600 bg-violet-50',
};

interface CommentThreadProps {
  comments: AccountantComment[];
  onResolve: (commentId: string) => void;
  onAdd: (content: string, type: CommentType) => void;
  isResolving?: boolean;
  isAdding?: boolean;
  /** Permission: can the current user add comments */
  canComment: boolean;
  /** Permission: can the current user validate */
  canValidate: boolean;
}

export function CommentThread({
  comments,
  onResolve,
  onAdd,
  isResolving,
  isAdding,
  canComment,
  canValidate,
}: CommentThreadProps) {
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<CommentType>('comment');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;
    onAdd(newContent.trim(), newType);
    setNewContent('');
  }

  // Filter available types based on permissions
  const availableTypes: CommentType[] = ['comment', 'request', 'annotation'];
  if (canValidate) availableTypes.push('validation');

  return (
    <div className="space-y-4">
      {/* Comment list */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onResolve={() => onResolve(comment.id)}
              isResolving={isResolving}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun échange pour le moment
        </p>
      )}

      {/* Add comment form */}
      {canComment && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Select
              value={newType}
              onValueChange={(v) => { if (v) setNewType(v as CommentType); }}
            >
              <SelectTrigger className="w-auto h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {COMMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Écrire un commentaire..."
              className="h-9 text-sm"
              disabled={isAdding}
            />
            <Button type="submit" size="sm" disabled={isAdding || !newContent.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  onResolve,
  isResolving,
}: {
  comment: AccountantComment;
  onResolve: () => void;
  isResolving?: boolean;
}) {
  const Icon = typeIcons[comment.type];
  const colorClass = typeColors[comment.type];
  const initials = comment.author?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??';

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg border',
        comment.is_resolved && 'opacity-60'
      )}
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px] bg-muted">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">
            {comment.author?.full_name ?? 'Utilisateur'}
          </span>
          <span className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded', colorClass)}>
            <Icon className="h-2.5 w-2.5" />
            {COMMENT_TYPE_LABELS[comment.type]}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDate(comment.created_at)}
          </span>
          {comment.is_resolved && (
            <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Résolu
            </span>
          )}
        </div>

        <p className="text-sm">{comment.content}</p>

        {!comment.is_resolved && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] mt-1 text-muted-foreground"
            onClick={onResolve}
            disabled={isResolving}
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Marquer résolu
          </Button>
        )}
      </div>
    </div>
  );
}
