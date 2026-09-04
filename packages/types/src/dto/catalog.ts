import type { Money } from '../money.js';
import type { ListQuery } from '../envelope.js';
import type { ProductStatus, StockStatus } from '../enums.js';

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  position: number;
  productCount: number;
  children?: CategoryDto[];
}

export interface ProductImageDto {
  id: string;
  url: string;
  alt: string | null;
  position: number;
  isPrimary: boolean;
}

export interface ProductAttributeDto {
  name: string;
  value: string;
  /** Attributes marked as variant axes drive the variant selector. */
  isVariantAxis: boolean;
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  name: string;
  price: Money;
  compareAtPrice: Money | null;
  /** Points awarded on purchase, if the admin configured any. */
  pointsAwarded: number;
  imageUrl: string | null;
  options: Record<string, string>;
  stockStatus: StockStatus;
  /** Exact quantity is only exposed to staff; shoppers get the status. */
  availableQuantity: number | null;
  isDefault: boolean;
}

export interface ProductSummaryDto {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  primaryImageUrl: string | null;
  price: Money;
  compareAtPrice: Money | null;
  stockStatus: StockStatus;
  category: { id: string; slug: string; name: string } | null;
  status: ProductStatus;
  isFeatured: boolean;
}

export interface ProductDetailDto extends ProductSummaryDto {
  description: string | null;
  sku: string;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
  attributes: ProductAttributeDto[];
  pointsAwarded: number;
  relatedProducts: ProductSummaryDto[];
  publishedAt: string | null;
}

export interface ProductListQuery extends ListQuery {
  categorySlug?: string;
  /** Inclusive bounds in minor units of the active currency. */
  minPriceMinor?: number;
  maxPriceMinor?: number;
  inStockOnly?: boolean;
  featuredOnly?: boolean;
  /** Admin only; the public catalog is always restricted to PUBLISHED. */
  status?: ProductStatus;
}

export const PRODUCT_SORT_FIELDS = [
  'relevance',
  'newest',
  'priceAsc',
  'priceDesc',
  'name',
] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export interface CategoryInput {
  slug: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  position?: number;
}

export interface ProductVariantInput {
  id?: string;
  sku: string;
  name: string;
  priceMinor: number;
  compareAtPriceMinor?: number | null;
  pointsAwarded?: number;
  imageUrl?: string | null;
  options: Record<string, string>;
  isDefault?: boolean;
  initialQuantity?: number;
}

export interface ProductInput {
  slug: string;
  name: string;
  sku: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId?: string | null;
  currency: string;
  basePriceMinor: number;
  compareAtPriceMinor?: number | null;
  pointsAwarded?: number;
  status: ProductStatus;
  isFeatured?: boolean;
  images?: Array<{ url: string; alt?: string | null; position?: number; isPrimary?: boolean }>;
  attributes?: Array<{ name: string; value: string; isVariantAxis?: boolean }>;
  variants?: ProductVariantInput[];
}

export interface InventoryAdjustmentRequest {
  variantId: string;
  /** Signed delta applied to on-hand quantity. */
  quantityDelta: number;
  reason: string;
  idempotencyKey: string;
}

export interface InventoryDto {
  variantId: string;
  sku: string;
  productName: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  stockStatus: StockStatus;
  updatedAt: string;
}
