import * as React from 'react';
import { Button, Card, Pagination, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDate } from '@/lib/format';
import { useAdminPosts, useModeratePost, useReports, useResolveReport } from './api';

export default function CommunityPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Community</h1>
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="posts"><PostsTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function PostsTab() {
  const [page, setPage] = React.useState(1);
  const postsQuery = useAdminPosts(undefined, page);
  const moderate = useModeratePost();

  return (
    <div className="flex flex-col gap-3">
      <QueryState isLoading={postsQuery.isLoading} isError={postsQuery.isError} error={postsQuery.error} onRetry={() => postsQuery.refetch()} isEmpty={postsQuery.data?.items.length === 0} emptyTitle="No posts">
        <div className="flex flex-col gap-2">
          {postsQuery.data?.items.map((post) => (
            <Card key={post.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{post.author.displayName}</span>
                <StatusBadge status={post.moderationStatus} />
              </div>
              <p className="text-sm text-foreground">{post.body}</p>
              <div className="flex items-center justify-between text-2xs text-muted-foreground">
                <span>{formatDate(post.createdAt)}</span>
                <div className="flex gap-1">
                  {post.moderationStatus !== 'PUBLISHED' ? <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: post.id, status: 'PUBLISHED' }, { onSuccess: () => toast.success('Published') })}>Publish</Button> : null}
                  {post.moderationStatus !== 'ARCHIVED' ? <Button size="sm" variant="ghost" className="text-destructive" onClick={() => moderate.mutate({ id: post.id, status: 'ARCHIVED' }, { onSuccess: () => toast.success('Archived') })}>Remove</Button> : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </QueryState>
      {postsQuery.data?.pagination ? <Pagination meta={postsQuery.data.pagination} onPageChange={setPage} /> : null}
    </div>
  );
}

function ReportsTab() {
  const reportsQuery = useReports('OPEN');
  const resolve = useResolveReport();

  return (
    <QueryState isLoading={reportsQuery.isLoading} isError={reportsQuery.isError} error={reportsQuery.error} onRetry={() => reportsQuery.refetch()} isEmpty={reportsQuery.data?.length === 0} emptyTitle="No open reports">
      <div className="flex flex-col gap-2">
        {reportsQuery.data?.map((report) => (
          <Card key={report.id} className="flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{report.reason}</span>
              <StatusBadge status={report.status} />
            </div>
            <p className="text-xs text-muted-foreground">&ldquo;{report.excerpt}&rdquo;</p>
            <p className="text-2xs text-muted-foreground">Reported by {report.reporter.displayName} on {formatDate(report.createdAt)}</p>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: report.id, status: 'RESOLVED' }, { onSuccess: () => toast.success('Resolved') })}>Resolve</Button>
              <Button size="sm" variant="ghost" onClick={() => resolve.mutate({ id: report.id, status: 'DISMISSED' })}>Dismiss</Button>
            </div>
          </Card>
        ))}
      </div>
    </QueryState>
  );
}
