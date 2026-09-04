import * as React from 'react';
import { Heart, ImageOff } from 'lucide-react';
import type { ProductSummaryDto } from '@ptg/types';
import { Badge } from '../primitives/badge.js';
import { cn } from '../lib/cn.js';

export interface ProductCardProps {
  product: ProductSummaryDto;
  /** Pre-formatted locale-aware prices. */
  formattedPrice: string;
  formattedCompareAtPrice?: string | null;
  stockLabel?: string;
  onClick?: () => void;
  onToggleWishlist?: () => void;
  isWishlisted?: boolean;
  className?: string;
  as?: React.ElementType;
}

/** Dense product tile used in catalog/shop grids. */
export function ProductCard({
  product,
  formattedPrice,
  formattedCompareAtPrice,
  stockLabel,
  onClick,
  onToggleWishlist,
  isWishlisted,
  className,
  as: Comp = 'div',
}: ProductCardProps) {
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left shadow-card transition-shadow',
        onClick && 'cursor-pointer hover:shadow-raised',
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {product.primaryImageUrl ? (
          <img
            src={product.primaryImageUrl}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-6" />
          </div>
        )}
        {product.stockStatus === 'OUT_OF_STOCK' ? (
          <Badge variant="destructive" className="absolute left-2 top-2">
            {stockLabel ?? 'Out of stock'}
          </Badge>
        ) : product.isFeatured ? (
          <Badge variant="success" className="absolute left-2 top-2">
            Featured
          </Badge>
        ) : null}
        {onToggleWishlist ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist();
            }}
            aria-pressed={isWishlisted}
            aria-label="Toggle wishlist"
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-card/90 shadow-card"
          >
            <Heart className={cn('size-3.5', isWishlisted ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        {product.category ? (
          <span className="text-2xs uppercase tracking-wide text-muted-foreground">{product.category.name}</span>
        ) : null}
        <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{product.name}</span>
        <div className="mt-auto flex items-baseline gap-1.5 pt-1">
          <span className="num text-sm font-semibold text-foreground">{formattedPrice}</span>
          {formattedCompareAtPrice ? (
            <span className="num text-2xs text-muted-foreground line-through">{formattedCompareAtPrice}</span>
          ) : null}
        </div>
      </div>
    </Comp>
  );
}

export function ProductGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5', className)}>
      {children}
    </div>
  );
}
