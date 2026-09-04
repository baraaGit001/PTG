import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProductCard, ProductGrid, Pagination, SearchBar, FilterBar } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatMoney } from '@/lib/format';
import { useCategories, useProducts } from './api';

export default function CatalogPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/shop') ? '/shop' : '/catalog';

  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [categorySlug, setCategorySlug] = React.useState<string | undefined>();

  const { data: categories } = useCategories();
  const productsQuery = useProducts({ search: search || undefined, categorySlug, page, pageSize: 20, sortBy: 'newest' });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-foreground">{t('marketplace.shop')}</h1>
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} className="sm:max-w-xs" />
      </div>

      {categories && categories.length > 0 ? (
        <FilterBar
          activeChips={categorySlug ? [{ key: categorySlug, label: categories.find((c) => c.slug === categorySlug)?.name ?? categorySlug }] : []}
          onRemoveChip={() => setCategorySlug(undefined)}
        >
          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => { setCategorySlug(category.slug); setPage(1); }}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-accent"
              >
                {category.name}
              </button>
            ))}
          </div>
        </FilterBar>
      ) : null}

      <QueryState
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
        error={productsQuery.error}
        onRetry={() => productsQuery.refetch()}
        isEmpty={productsQuery.data?.items.length === 0}
        emptyTitle="No products found"
        skeletonVariant="card-grid"
      >
        <ProductGrid>
          {productsQuery.data?.items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              formattedPrice={formatMoney(product.price)}
              formattedCompareAtPrice={product.compareAtPrice ? formatMoney(product.compareAtPrice) : undefined}
              stockLabel={t('marketplace.outOfStock')}
              onClick={() => navigate(`${basePath}/${product.slug}`)}
            />
          ))}
        </ProductGrid>
        {productsQuery.data?.pagination ? (
          <Pagination meta={productsQuery.data.pagination} onPageChange={setPage} className="mt-2" />
        ) : null}
      </QueryState>
    </div>
  );
}
