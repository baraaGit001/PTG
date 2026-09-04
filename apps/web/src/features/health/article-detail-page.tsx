import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Card } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDate } from '@/lib/format';
import { useArticle } from './api';

export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const articleQuery = useArticle(slug);
  const article = articleQuery.data;

  return (
    <QueryState isLoading={articleQuery.isLoading} isError={articleQuery.isError} error={articleQuery.error} onRetry={() => articleQuery.refetch()} skeletonVariant="detail">
      {article ? (
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {article.coverImageUrl ? <img src={article.coverImageUrl} alt="" className="aspect-video w-full rounded-lg object-cover" /> : null}
          <div>
            {article.category ? <Badge variant="secondary">{article.category.name}</Badge> : null}
            <h1 className="mt-2 text-xl font-semibold text-foreground">{article.title}</h1>
            <p className="mt-1 text-2xs text-muted-foreground">
              {article.authorName ?? 'PTG Editorial'} · {article.publishedAt ? formatDate(article.publishedAt) : ''} · {article.readingMinutes} min read
            </p>
          </div>
          {/* Admin-authored content from the CMS flow, not user-supplied HTML - see docs/SECURITY.md. */}
          <div className="prose prose-sm max-w-none text-sm text-foreground" dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />

          {article.relatedArticles.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-foreground">Related</h2>
              <div className="flex flex-col gap-2">
                {article.relatedArticles.map((related) => (
                  <Card key={related.id} className="cursor-pointer p-3 hover:shadow-raised" onClick={() => navigate(`/health/knowledge/${related.slug}`)}>
                    <span className="text-sm font-medium text-foreground">{related.title}</span>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </QueryState>
  );
}
