import * as React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProductCard, ProductGrid, Pagination } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatMoney } from '@/lib/format';
import { useCategories, useProducts } from './api';

export default function CategoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const basePath = location.pathname.startsWith('/shop') ? '/shop' : '/catalog';
  const [page, setPage] = React.useState(1);

  const { data: categories } = useCategories();
  const category = categories?.find((c) => c.slug === slug);
  const productsQuery = useProducts({ categorySlug: slug, page, pageSize: 20 });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{category?.name ?? t('marketplace.categories')}</h1>
      <QueryState
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
        error={productsQuery.error}
        onRetry={() => productsQuery.refetch()}
        isEmpty={productsQuery.data?.items.length === 0}
        emptyTitle="No products in this category"
        skeletonVariant="card-grid"
      >
        <ProductGrid>
          {productsQuery.data?.items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              formattedPrice={formatMoney(product.price)}
              formattedCompareAtPrice={product.compareAtPrice ? formatMoney(product.compareAtPrice) : undefined}
              onClick={() => navigate(`${basePath}/${product.slug}`)}
            />
          ))}
        </ProductGrid>
        {productsQuery.data?.pagination ? <Pagination meta={productsQuery.data.pagination} onPageChange={setPage} className="mt-2" /> : null}
      </QueryState>
    </div>
  );
}
