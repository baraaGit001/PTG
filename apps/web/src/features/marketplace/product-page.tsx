import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronLeft, ChevronRight, Expand, Minus, Plus } from 'lucide-react';
import { Badge, Button, ImageLightbox, StatusBadge, toast } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatMoney } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { useProduct } from './api';
import { useAddCartItem } from '@/features/cart/api';

/** Catalog rows shown before the reader asks for "show all". */
const DETAIL_COLLAPSED_ROWS = 2;

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
  const [lightbox, setLightbox] = React.useState<{ source: 'gallery' | 'detail'; index: number } | null>(null);
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);

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

  const stepImage = (delta: number) => {
    if (gallery.length === 0) return;
    setActiveImage((i) => (i + delta + gallery.length) % gallery.length);
  };

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
              <div className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                {gallery[activeImage] ? (
                  <button
                    type="button"
                    onClick={() => setLightbox({ source: 'gallery', index: activeImage })}
                    className="size-full cursor-zoom-in"
                    aria-label={t('marketplace.viewFullImage')}
                  >
                    <img src={gallery[activeImage].url} alt={gallery[activeImage].alt ?? product.name} className="size-full object-contain" />
                  </button>
                ) : null}

                {gallery.length > 0 ? (
                  <span className="pointer-events-none absolute bottom-2 end-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-2xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Expand className="size-3" />
                    {t('marketplace.viewFullImage')}
                  </span>
                ) : null}

                {gallery.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => stepImage(-1)}
                      aria-label={t('marketplace.previousImage')}
                      className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-card/80 opacity-0 shadow-card transition-opacity hover:bg-card focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepImage(1)}
                      aria-label={t('marketplace.nextImage')}
                      className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-card/80 opacity-0 shadow-card transition-opacity hover:bg-card focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring group-hover:opacity-100"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                    <span className="num pointer-events-none absolute start-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-2xs tabular-nums text-white">
                      {activeImage + 1} / {gallery.length}
                    </span>
                  </>
                ) : null}
              </div>

              {gallery.length > 1 ? (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {gallery.map((img, index) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImage(index)}
                      aria-label={`${product.name} ${index + 1}`}
                      aria-current={index === activeImage}
                      className={`size-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${index === activeImage ? 'border-primary' : 'border-border hover:border-muted-foreground/40'}`}
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
            <section className="flex flex-col gap-5">
              <div className="flex items-baseline justify-between border-b border-border pb-2">
                <h2 className="text-sm font-semibold text-foreground">{t('marketplace.productDetails')}</h2>
                <span className="num text-2xs text-muted-foreground">{t('marketplace.imageCount', { value: detailImages.length })}</span>
              </div>

              <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 sm:gap-12">
                {(detailsExpanded ? detailImages : detailImages.slice(0, DETAIL_COLLAPSED_ROWS)).map((img, index) => (
                  <article
                    key={img.id}
                    className="grid items-center gap-4 sm:grid-cols-2 sm:gap-8"
                  >
                    <figure className={`m-0 ${index % 2 === 1 ? 'sm:order-2' : ''}`}>
                      <button
                        type="button"
                        onClick={() => setLightbox({ source: 'detail', index })}
                        className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border bg-card"
                        aria-label={t('marketplace.viewFullImage')}
                      >
                        <img src={img.url} alt={img.alt ?? ''} loading="lazy" className="block w-full" />
                      </button>
                    </figure>

                    <div className="flex flex-col gap-2">
                      <span className="num text-2xs uppercase tracking-widest text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {img.alt ?? product.shortDescription ?? product.name}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              {detailImages.length > DETAIL_COLLAPSED_ROWS ? (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => setDetailsExpanded((v) => !v)}>
                    {detailsExpanded ? t('marketplace.showLessImages') : t('marketplace.showAllImages', { value: detailImages.length })}
                    <ChevronDown className={`ms-1 size-3.5 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}

          <ImageLightbox
            images={lightbox?.source === 'detail' ? detailImages : gallery}
            index={lightbox?.index ?? null}
            title={product.name}
            onIndexChange={(index) => {
              setLightbox((l) => (l ? { ...l, index } : l));
              if (lightbox?.source === 'gallery') setActiveImage(index);
            }}
            onClose={() => setLightbox(null)}
          />
        </div>
      ) : null}
    </QueryState>
  );
}
