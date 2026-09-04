import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, Button, Card, Pagination, Textarea, toast } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDate } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { useCommunityFeed, useCreatePost, useReactToPost } from './api';

export default function CommunityPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = React.useState(1);
  const [draft, setDraft] = React.useState('');
  const feedQuery = useCommunityFeed({ page, pageSize: 10 });
  const createPost = useCreatePost();
  const react = useReactToPost();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t('health.community')}</h1>

      {user ? (
        <Card className="flex flex-col gap-2 p-3">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Share a wellness win…" rows={2} />
          <Button
            size="sm"
            className="self-end"
            disabled={!draft.trim()}
            loading={createPost.isPending}
            onClick={() => createPost.mutate({ body: draft }, { onSuccess: () => { setDraft(''); toast.success('Posted'); } })}
          >
            {t('common.submit')}
          </Button>
        </Card>
      ) : null}

      <QueryState isLoading={feedQuery.isLoading} isError={feedQuery.isError} error={feedQuery.error} onRetry={() => feedQuery.refetch()} isEmpty={feedQuery.data?.items.length === 0} emptyTitle="No posts yet">
        <div className="flex flex-col gap-3">
          {feedQuery.data?.items.map((post) => (
            <Card key={post.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">{post.author.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground">{post.author.displayName}</span>
                  <span className="text-2xs text-muted-foreground">{formatDate(post.createdAt)}</span>
                </div>
              </div>
              {post.title ? <p className="text-sm font-semibold text-foreground">{post.title}</p> : null}
              <p className="text-sm text-foreground">{post.body}</p>
              <div className="flex items-center gap-4 pt-1 text-2xs text-muted-foreground">
                <button
                  className={`flex items-center gap-1 ${post.myReaction ? 'text-destructive' : ''}`}
                  onClick={() => react.mutate({ postId: post.id, type: 'LIKE' })}
                >
                  <Heart className={`size-3.5 ${post.myReaction ? 'fill-destructive' : ''}`} />
                  {post.reactionCounts.LIKE}
                </button>
                <span className="flex items-center gap-1">
                  <MessageCircle className="size-3.5" />
                  {post.commentCount}
                </span>
              </div>
            </Card>
          ))}
        </div>
        {feedQuery.data?.pagination ? <Pagination meta={feedQuery.data.pagination} onPageChange={setPage} className="mt-1" /> : null}
      </QueryState>
    </div>
  );
}
