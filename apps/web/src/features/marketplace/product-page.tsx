import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from 'lucide-react';
import { Badge, Button, StatusBadge, toast } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatMoney } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { useProduct } from './api';
import { useAddCartItem } from '@/features/cart/api';

export default function ProductPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const user = useAuthStore((s) => s.user);
  const productQuery = useProduct(slug);
  const addItem = useAddCartItem();

  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [activeImage, setActiveImage] = React.useState(0);

  const product = productQuery.data;
  const variant = product?.variants.find((v) => v.id === selectedVariantId) ?? product?.variants.find((v) => v.isDefault) ?? product?.variants[0];

  // The app splits product artwork in two: a carousel at the top and a long
  // "Product Details" scroll of full-bleed panels underneath.
  const gallery = React.useMemo(() => product?.images.filter((img) => img.role === 'GALLERY') ?? [], [product]);
  const detailImages = React.useMemo(() => product?.images.filter((img) => img.role === 'DETAIL') ?? [], [product]);
  const points = variant?.pointsAwarded ?? product?.pointsAwarded ?? 0;

  React.useEffect(() => {
    if (product && !selectedVariantId) setSelectedVariantId(product.variants.find((v) => v.isDefault)?.id ?? product.variants[0]?.id ?? null);
  }, [product, selectedVariantId]);

  const handleAddToCart = () => {
    if (!user) return navigate('/login', { state: { from: `/shop/product/${slug}` } });
    if (!variant) return;
    addItem.mutate(
      { variantId: variant.id, quantity },
      { onSuccess: () => toast.success(`${product?.name} added to cart`), onError: () => toast.error(t('errors.generic')) },
    );
  };

  return (
    <QueryState isLoading={productQuery.isLoading} isError={productQuery.isError} error={productQuery.error} onRetry={() => productQuery.refetch()} skeletonVariant="detail">
      {product ? (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                {gallery[activeImage] ? (
                  <img src={gallery[activeImage].url} alt={gallery[activeImage].alt ?? product.name} className="size-full object-contain" />
                ) : null}
              </div>
              {gallery.length > 1 ? (
                <div className="flex gap-2">
                  {gallery.map((img, index) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImage(index)}
                      className={`size-14 shrink-0 overflow-hidden rounded-md border ${index === activeImage ? 'border-primary' : 'border-border'}`}
                    >
                      <img src={img.url} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">{product.category?.name}</p>
                <h1 className="text-xl font-semibold text-foreground">{product.name}</h1>
                <p className="mt-1 text-2xs text-muted-foreground">SKU: {product.sku}</p>
              </div>

              {product.shortDescription ? <p className="text-sm text-muted-foreground">{product.shortDescription}</p> : null}

              <div className="flex flex-wrap items-baseline gap-2">
                <span className="num text-2xl font-semibold text-warning">{formatMoney(variant?.price ?? product.price)}</span>
                {product.compareAtPrice ? <span className="num text-sm text-muted-foreground line-through">{formatMoney(product.compareAtPrice)}</span> : null}
                {points > 0 ? <span className="num text-xs text-muted-foreground">{t('marketplace.pvValue', { value: points })}</span> : null}
                <StatusBadge status={variant?.stockStatus ?? product.stockStatus} label={t(`marketplace.${(variant?.stockStatus ?? product.stockStatus).toLowerCase() === 'in_stock' ? 'inStock' : (variant?.stockStatus ?? product.stockStatus).toLowerCase() === 'low_stock' ? 'lowStock' : 'outOfStock'}`)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground">{t('marketplace.specification')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`rounded-md border px-3 py-1.5 text-xs ${v.id === selectedVariantId ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-foreground">{t('marketplace.quantity')}</span>
                <div className="flex items-center rounded-md border border-border">
                  <button className="flex size-8 items-center justify-center" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                    <Minus className="size-3.5" />
                  </button>
                  <span className="num w-8 text-center text-sm">{quantity}</span>
                  <button className="flex size-8 items-center justify-center" onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity">
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              <Button onClick={handleAddToCart} loading={addItem.isPending} disabled={variant?.stockStatus === 'OUT_OF_STOCK'} size="lg">
                {t('marketplace.addToCart')}
              </Button>

              {points > 0 ? <Badge variant="info">{t('marketplace.pvOnPurchase', { value: points })}</Badge> : null}

              {product.description ? <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description}</p> : null}

              {product.attributes.length > 0 ? (
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {product.attributes.map((attr) => (
                    <div key={attr.name} className="flex flex-col">
                      <dt className="text-muted-foreground">{attr.name}</dt>
                      <dd className="text-foreground">{attr.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </div>

          {detailImages.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-foreground">{t('marketplace.productDetails')}</h2>
              <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card">
                {detailImages.map((img) => (
                  <img key={img.id} src={img.url} alt={img.alt ?? ''} loading="lazy" className="block w-full" />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </QueryState>
  );
}
