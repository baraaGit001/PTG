import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProductCard, ProductGrid, Button, Card } from '@ptg/ui';
import { formatMoney } from '@/lib/format';
import { useProducts } from '@/features/marketplace/api';
import { usePublicSettings } from '@/features/settings/api';

export default function GuestHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: settings } = usePublicSettings();
  const featuredQuery = useProducts({ featuredOnly: true, page: 1, pageSize: 8 });

  return (
    <div className="flex flex-col gap-8">
      <Card className="flex flex-col items-center gap-3 border-none bg-primary/5 p-10 text-center shadow-none">
        <h1 className="text-2xl font-semibold text-foreground">{settings?.brandName ?? t('common.appName')}</h1>
        <p className="max-w-md text-sm text-muted-foreground">Browse the marketplace, or sign in to access your wallet, network, and orders.</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/catalog')}>{t('marketplace.shop')}</Button>
          <Button variant="outline" onClick={() => navigate('/login')}>{t('common.signIn')}</Button>
        </div>
      </Card>

      {featuredQuery.data?.items.length ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Featured products</h2>
          <ProductGrid>
            {featuredQuery.data.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                formattedPrice={formatMoney(product.price)}
                formattedCompareAtPrice={product.compareAtPrice ? formatMoney(product.compareAtPrice) : undefined}
                onClick={() => navigate(`/catalog/${product.slug}`)}
              />
            ))}
          </ProductGrid>
        </div>
      ) : null}
    </div>
  );
}
