import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { Badge, Card, Pagination, SearchBar } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDate } from '@/lib/format';
import { useArticles } from './api';

export default function KnowledgePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const articlesQuery = useArticles({ search: search || undefined, page });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-foreground">{t('health.knowledge')}</h1>
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} className="sm:max-w-xs" />
      </div>

      <QueryState isLoading={articlesQuery.isLoading} isError={articlesQuery.isError} error={articlesQuery.error} onRetry={() => articlesQuery.refetch()} isEmpty={articlesQuery.data?.items.length === 0} emptyTitle="No articles found" skeletonVariant="card-grid">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {articlesQuery.data?.items.map((article) => (
            <Card key={article.id} className="flex cursor-pointer flex-col overflow-hidden hover:shadow-raised" onClick={() => navigate(`/health/knowledge/${article.slug}`)}>
              <div className="aspect-video bg-muted">
                {article.coverImageUrl ? <img src={article.coverImageUrl} alt="" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-muted-foreground"><BookOpen className="size-6" /></div>}
              </div>
              <div className="flex flex-col gap-1 p-3">
                {article.isFeatured ? <Badge variant="success" className="w-fit">Featured</Badge> : null}
                <h2 className="line-clamp-2 text-sm font-semibold text-foreground">{article.title}</h2>
                {article.excerpt ? <p className="line-clamp-2 text-xs text-muted-foreground">{article.excerpt}</p> : null}
                <span className="text-2xs text-muted-foreground">
                  {article.publishedAt ? formatDate(article.publishedAt) : ''} · {article.readingMinutes} min read
                </span>
              </div>
            </Card>
          ))}
        </div>
        {articlesQuery.data?.pagination ? <Pagination meta={articlesQuery.data.pagination} onPageChange={setPage} /> : null}
      </QueryState>
    </div>
  );
}
