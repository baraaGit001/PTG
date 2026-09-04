import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { PRODUCT_IMAGE_ROLES, PRODUCT_STATUSES, type ProductImageRole, type ProductStatus } from '@ptg/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class ProductListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minPriceMinor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxPriceMinor?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inStockOnly?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featuredOnly?: boolean;

  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  status?: ProductStatus;
}

export class CategoryInputDto {
  @IsString()
  slug!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;
}

class ProductImageInputDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  alt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsIn(PRODUCT_IMAGE_ROLES)
  role?: ProductImageRole;
}

class ProductAttributeInputDto {
  @IsString()
  name!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsBoolean()
  isVariantAxis?: boolean;
}

class ProductVariantInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMinor!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  compareAtPriceMinor?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pointsAwarded?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  options!: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  initialQuantity?: number;
}

export class ProductInputDto {
  @IsString()
  slug!: string;

  @IsString()
  name!: string;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  shortDescription?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsString()
  currency!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  basePriceMinor!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  compareAtPriceMinor?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pointsAwarded?: number;

  @IsIn(PRODUCT_STATUSES)
  status!: ProductStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  images?: ProductImageInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeInputDto)
  attributes?: ProductAttributeInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];
}

export class InventoryAdjustmentDto {
  @IsString()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  quantityDelta!: number;

  @IsString()
  reason!: string;

  @IsString()
  idempotencyKey!: string;
}
