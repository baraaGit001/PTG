import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, FormField, Input, Pagination, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge, Textarea, toast } from '@ptg/ui';
import type { ArticleInput } from '@ptg/types';
import { QueryState } from '@/components/query-state';
import { useAdminArticles, useCreateArticle, useUpdateArticle } from './api';

export default function HealthContentPage() {
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const articlesQuery = useAdminArticles(page);
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle();
  const { register, handleSubmit, reset } = useForm<ArticleInput>({ defaultValues: { slug: '', title: '', bodyHtml: '', status: 'DRAFT' } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Health Content</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>New article</Button>
      </div>

      <QueryState isLoading={articlesQuery.isLoading} isError={articlesQuery.isError} error={articlesQuery.error} onRetry={() => articlesQuery.refetch()} isEmpty={articlesQuery.data?.items.length === 0} emptyTitle="No articles yet">
        <div className="flex flex-col gap-2">
          {articlesQuery.data?.items.map((article) => (
            <Card key={article.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{article.title}</p>
                <p className="text-2xs text-muted-foreground">{article.category?.name ?? 'Uncategorised'}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={article.status} />
                <Select value={article.status} onValueChange={(status) => updateArticle.mutate({ id: article.id, status: status as never }, { onSuccess: () => toast.success('Updated') })}>
                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED'].map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>
      </QueryState>
      {articlesQuery.data?.pagination ? <Pagination meta={articlesQuery.data.pagination} onPageChange={setPage} /> : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New article</DialogTitle></DialogHeader>
          <form
            className="grid grid-cols-1 gap-3"
            onSubmit={handleSubmit((values) => createArticle.mutate(values, { onSuccess: () => { setDialogOpen(false); reset(); toast.success('Article created'); } }))}
          >
            <FormField label="Title" required><Input {...register('title', { required: true })} /></FormField>
            <FormField label="Slug" required><Input {...register('slug', { required: true })} /></FormField>
            <FormField label="Excerpt"><Input {...register('excerpt')} /></FormField>
            <FormField label="Body (HTML)" required><Textarea rows={6} {...register('bodyHtml', { required: true })} /></FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createArticle.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
