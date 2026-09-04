import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import type { Prisma } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL_SECONDS, AUDIT_ACTIONS } from '@ptg/config';
import type {
  CategoryDto,
  CategoryInput,
  ProductDetailDto,
  ProductInput,
  ProductListQuery,
  ProductSummaryDto,
} from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { toMoney, toMinorBigInt } from '../../common/money.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { REDIS_CLIENT } from '../../redis/redis.module.js';
import { AuditService } from '../audit/audit.service.js';
import {
  paginationArgs,
  buildPaginationMeta,
  type PaginatedResult,
  type PaginationQueryDto,
} from '../../common/dto/pagination.dto.js';
import { InventoryService } from './inventory.service.js';
import { deriveStockStatus } from './inventory.service.js';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  // --- categories --------------------------------------------------------------

  async getCategoryTree(): Promise<CategoryDto[]> {
    const cached = await this.redis.get(CACHE_KEYS.categoryTree);
    if (cached) return JSON.parse(cached) as CategoryDto[];

    const categories = await this.prisma.category.findMany({
      orderBy: { position: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    const byId = new Map<string, CategoryDto>(
      categories.map((c) => [
        c.id,
        {
          id: c.id,
          slug: c.slug,
          name: c.name,
          description: c.description,
          imageUrl: c.imageUrl,
          parentId: c.parentId,
          position: c.position,
          productCount: c._count.products,
          children: [],
        },
      ]),
    );
    const roots: CategoryDto[] = [];
    for (const category of byId.values()) {
      if (category.parentId && byId.has(category.parentId)) {
        byId.get(category.parentId)!.children!.push(category);
      } else {
        roots.push(category);
      }
    }

    await this.redis.set(CACHE_KEYS.categoryTree, JSON.stringify(roots), 'EX', CACHE_TTL_SECONDS.categoryTree);
    return roots;
  }

  async createCategory(actorId: string, input: CategoryInput): Promise<CategoryDto> {
    const existing = await this.prisma.category.findUnique({ where: { slug: input.slug } });
    if (existing) throw new ApiException('SLUG_TAKEN', 'A category with this slug already exists.');
    const category = await this.prisma.category.create({ data: { ...input } });
    await this.invalidateCategoryCache();
    await this.audit.record({ actorId, action: 'category.created', entityType: 'Category', entityId: category.id, after: input });
    return { ...category, productCount: 0, children: [] };
  }

  async updateCategory(actorId: string, id: string, input: Partial<CategoryInput>): Promise<CategoryDto> {
    const before = await this.prisma.category.findUnique({ where: { id } });
    if (!before) throw new ApiException('CATEGORY_NOT_FOUND', 'Category not found.');
    const category = await this.prisma.category.update({ where: { id }, data: input });
    await this.invalidateCategoryCache();
    await this.audit.record({ actorId, action: 'category.updated', entityType: 'Category', entityId: id, before, after: input });
    return { ...category, productCount: 0, children: [] };
  }

  async deleteCategory(actorId: string, id: string): Promise<void> {
    const [childCount, productCount] = await Promise.all([
      this.prisma.category.count({ where: { parentId: id } }),
      this.prisma.product.count({ where: { categoryId: id } }),
    ]);
    if (childCount > 0 || productCount > 0) {
      throw new ApiException('CATEGORY_HAS_CHILDREN', 'Remove child categories and products before deleting this category.');
    }
    await this.prisma.category.delete({ where: { id } });
    await this.invalidateCategoryCache();
    await this.audit.record({ actorId, action: 'category.deleted', entityType: 'Category', entityId: id });
  }

  private async invalidateCategoryCache(): Promise<void> {
    await this.redis.del(CACHE_KEYS.categoryTree);
  }

  // --- products ------------------------------------------------------------------

  async listProducts(query: ProductListQuery & PaginationQueryDto, forcePublished: boolean): Promise<PaginatedResult<ProductSummaryDto>> {
    const where: Prisma.ProductWhereInput = {
      status: forcePublished ? 'PUBLISHED' : query.status,
      category: query.categorySlug ? { slug: query.categorySlug } : undefined,
      isFeatured: query.featuredOnly ? true : undefined,
      basePriceMinor:
        query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined
          ? { gte: query.minPriceMinor !== undefined ? BigInt(query.minPriceMinor) : undefined, lte: query.maxPriceMinor !== undefined ? BigInt(query.maxPriceMinor) : undefined }
          : undefined,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const orderBy = this.resolveSort(query.sortBy);

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { images: { where: { isPrimary: true }, take: 1 }, category: true, variants: { include: { inventory: true }, take: 1 } },
        orderBy,
        ...paginationArgs(query),
      }),
      this.prisma.product.count({ where }),
    ]);

    let items = rows.map(toProductSummary);
    if (query.inStockOnly) {
      items = items.filter((p) => p.stockStatus !== 'OUT_OF_STOCK');
    }

    return { items, pagination: buildPaginationMeta(query, total) };
  }

  private resolveSort(sortBy?: string): Prisma.ProductOrderByWithRelationInput {
    switch (sortBy) {
      case 'priceAsc':
        return { basePriceMinor: 'asc' };
      case 'priceDesc':
        return { basePriceMinor: 'desc' };
      case 'name':
        return { name: 'asc' };
      case 'newest':
        return { publishedAt: 'desc' };
      default:
        return { isFeatured: 'desc' };
    }
  }

  async getProductBySlug(slug: string, includeUnpublished: boolean): Promise<ProductDetailDto> {
    const cacheKey = CACHE_KEYS.productDetail(slug);
    if (!includeUnpublished) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as ProductDetailDto;
    }

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { position: 'asc' } },
        attributes: true,
        variants: { include: { inventory: true } },
        category: true,
      },
    });
    if (!product || (!includeUnpublished && product.status !== 'PUBLISHED')) {
      throw new ApiException('PRODUCT_NOT_FOUND', 'Product not found.');
    }

    const related = await this.prisma.product.findMany({
      where: { categoryId: product.categoryId ?? undefined, status: 'PUBLISHED', id: { not: product.id } },
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true, variants: { include: { inventory: true }, take: 1 } },
      take: 8,
    });

    const dto: ProductDetailDto = {
      ...toProductSummary(product),
      description: product.description,
      sku: product.sku,
      images: product.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt, position: img.position, isPrimary: img.isPrimary })),
      variants: product.variants.map((variant) => toVariantDto(variant, product.currency)),
      attributes: product.attributes.map((a) => ({ name: a.name, value: a.value, isVariantAxis: a.isVariantAxis })),
      pointsAwarded: product.pointsAwarded,
      relatedProducts: related.map(toProductSummary),
      publishedAt: product.publishedAt?.toISOString() ?? null,
    };

    if (!includeUnpublished) {
      await this.redis.set(cacheKey, JSON.stringify(dto), 'EX', CACHE_TTL_SECONDS.productDetail);
    }
    return dto;
  }

  async createProduct(actorId: string, input: ProductInput): Promise<ProductDetailDto> {
    const [slugTaken, skuTaken] = await Promise.all([
      this.prisma.product.findUnique({ where: { slug: input.slug } }),
      this.prisma.product.findUnique({ where: { sku: input.sku } }),
    ]);
    if (slugTaken) throw new ApiException('SLUG_TAKEN', 'A product with this slug already exists.');
    if (skuTaken) throw new ApiException('SKU_TAKEN', 'A product with this SKU already exists.');

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          slug: input.slug,
          name: input.name,
          sku: input.sku,
          shortDescription: input.shortDescription,
          description: input.description,
          categoryId: input.categoryId,
          currency: input.currency,
          basePriceMinor: toMinorBigInt(input.basePriceMinor),
          compareAtPriceMinor: input.compareAtPriceMinor != null ? toMinorBigInt(input.compareAtPriceMinor) : null,
          pointsAwarded: input.pointsAwarded ?? 0,
          status: input.status,
          isFeatured: input.isFeatured ?? false,
          publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
          images: { create: input.images?.map((img) => ({ url: img.url, alt: img.alt, position: img.position ?? 0, isPrimary: img.isPrimary ?? false })) },
          attributes: { create: input.attributes?.map((attr) => ({ name: attr.name, value: attr.value, isVariantAxis: attr.isVariantAxis ?? false })) },
        },
      });

      const variantsInput = input.variants?.length
        ? input.variants
        : [{ sku: input.sku, name: input.name, priceMinor: input.basePriceMinor, options: {}, isDefault: true }];

      for (const variant of variantsInput) {
        const createdVariant = await tx.productVariant.create({
          data: {
            productId: created.id,
            sku: variant.sku,
            name: variant.name,
            priceMinor: toMinorBigInt(variant.priceMinor),
            compareAtPriceMinor: variant.compareAtPriceMinor != null ? toMinorBigInt(variant.compareAtPriceMinor) : null,
            pointsAwarded: variant.pointsAwarded ?? 0,
            imageUrl: variant.imageUrl,
            options: variant.options as Prisma.InputJsonValue,
            isDefault: variant.isDefault ?? false,
          },
        });
        await tx.inventory.create({ data: { variantId: createdVariant.id, onHand: variant.initialQuantity ?? 0 } });
      }

      return created;
    });

    await this.audit.record({ actorId, action: AUDIT_ACTIONS.productCreated, entityType: 'Product', entityId: product.id, after: { slug: input.slug } });
    return this.getProductBySlug(product.slug, true);
  }

  async updateProduct(actorId: string, id: string, input: Partial<ProductInput>): Promise<ProductDetailDto> {
    const before = await this.prisma.product.findUnique({ where: { id } });
    if (!before) throw new ApiException('PRODUCT_NOT_FOUND', 'Product not found.');

    const priceChanged = input.basePriceMinor !== undefined && BigInt(input.basePriceMinor) !== before.basePriceMinor;

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        shortDescription: input.shortDescription,
        description: input.description,
        categoryId: input.categoryId,
        basePriceMinor: input.basePriceMinor != null ? toMinorBigInt(input.basePriceMinor) : undefined,
        compareAtPriceMinor: input.compareAtPriceMinor != null ? toMinorBigInt(input.compareAtPriceMinor) : undefined,
        pointsAwarded: input.pointsAwarded,
        status: input.status,
        isFeatured: input.isFeatured,
        publishedAt: input.status === 'PUBLISHED' && !before.publishedAt ? new Date() : undefined,
      },
    });

    await this.redis.del(CACHE_KEYS.productDetail(product.slug));
    await this.audit.record({
      actorId,
      action: priceChanged ? AUDIT_ACTIONS.productPriceChanged : AUDIT_ACTIONS.productUpdated,
      entityType: 'Product',
      entityId: id,
      before: { basePriceMinor: before.basePriceMinor.toString(), status: before.status },
      after: { basePriceMinor: product.basePriceMinor.toString(), status: product.status },
    });

    return this.getProductBySlug(product.slug, true);
  }

  async adjustInventory(actorId: string, variantId: string, quantityDelta: number, reason: string, idempotencyKey: string) {
    return this.inventory.adjust(actorId, variantId, quantityDelta, reason, idempotencyKey);
  }
}

function toVariantDto(variant: {
  id: string;
  sku: string;
  name: string;
  priceMinor: bigint;
  compareAtPriceMinor: bigint | null;
  pointsAwarded: number;
  imageUrl: string | null;
  options: Prisma.JsonValue;
  isDefault: boolean;
  inventory: { onHand: number; reserved: number; lowStockThreshold: number } | null;
}, currency: string) {
  const available = variant.inventory ? variant.inventory.onHand - variant.inventory.reserved : 0;
  return {
    id: variant.id,
    sku: variant.sku,
    name: variant.name,
    price: toMoney(variant.priceMinor, currency),
    compareAtPrice: variant.compareAtPriceMinor != null ? toMoney(variant.compareAtPriceMinor, currency) : null,
    pointsAwarded: variant.pointsAwarded,
    imageUrl: variant.imageUrl,
    options: (variant.options as Record<string, string>) ?? {},
    stockStatus: deriveStockStatus(available, variant.inventory?.lowStockThreshold ?? 5, false),
    availableQuantity: available,
    isDefault: variant.isDefault,
  };
}

function toProductSummary(product: {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  currency: string;
  basePriceMinor: bigint;
  compareAtPriceMinor: bigint | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured: boolean;
  images: Array<{ url: string }>;
  category: { id: string; slug: string; name: string } | null;
  variants: Array<{ inventory: { onHand: number; reserved: number; lowStockThreshold: number } | null }>;
}): ProductSummaryDto {
  const primaryVariant = product.variants[0];
  const available = primaryVariant?.inventory ? primaryVariant.inventory.onHand - primaryVariant.inventory.reserved : 0;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    primaryImageUrl: product.images[0]?.url ?? null,
    price: toMoney(product.basePriceMinor, product.currency),
    compareAtPrice: product.compareAtPriceMinor != null ? toMoney(product.compareAtPriceMinor, product.currency) : null,
    stockStatus: deriveStockStatus(available, primaryVariant?.inventory?.lowStockThreshold ?? 5, false),
    category: product.category ? { id: product.category.id, slug: product.category.slug, name: product.category.name } : null,
    status: product.status,
    isFeatured: product.isFeatured,
  };
}
