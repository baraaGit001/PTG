import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CategoryDto, InventoryDto, ProductDetailDto, ProductSummaryDto } from '@ptg/types';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { CatalogService } from './catalog.service.js';
import { CategoryInputDto, InventoryAdjustmentDto, ProductInputDto, ProductListQueryDto } from './catalog.dto.js';
import { InventoryService } from './inventory.service.js';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get()
  async list(): Promise<CategoryDto[]> {
    return this.catalog.getCategoryTree();
  }
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get()
  async list(@Query() query: ProductListQueryDto): Promise<PaginatedResult<ProductSummaryDto>> {
    return this.catalog.listProducts(query, true);
  }

  @Public()
  @Get(':slug')
  async detail(@Param('slug') slug: string): Promise<ProductDetailDto> {
    return this.catalog.getProductBySlug(slug, false);
  }
}

@ApiTags('admin/categories')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @RequirePermissions('products.read')
  async list(): Promise<CategoryDto[]> {
    return this.catalog.getCategoryTree();
  }

  @Post()
  @RequirePermissions('categories.write')
  async create(@CurrentUser() actor: RequestUser, @Body() dto: CategoryInputDto): Promise<CategoryDto> {
    return this.catalog.createCategory(actor.id, dto);
  }

  @Patch(':id')
  @RequirePermissions('categories.write')
  async update(@CurrentUser() actor: RequestUser, @Param('id') id: string, @Body() dto: Partial<CategoryInputDto>): Promise<CategoryDto> {
    return this.catalog.updateCategory(actor.id, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('categories.write')
  async remove(@CurrentUser() actor: RequestUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.catalog.deleteCategory(actor.id, id);
    return { ok: true };
  }
}

@ApiTags('admin/products')
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly inventory: InventoryService,
  ) {}

  @Get()
  @RequirePermissions('products.read')
  async list(@Query() query: ProductListQueryDto): Promise<PaginatedResult<ProductSummaryDto>> {
    return this.catalog.listProducts(query, false);
  }

  @Post()
  @RequirePermissions('products.write')
  async create(@CurrentUser() actor: RequestUser, @Body() dto: ProductInputDto): Promise<ProductDetailDto> {
    return this.catalog.createProduct(actor.id, dto);
  }

  @Patch(':id')
  @RequirePermissions('products.write')
  async update(@CurrentUser() actor: RequestUser, @Param('id') id: string, @Body() dto: Partial<ProductInputDto>): Promise<ProductDetailDto> {
    return this.catalog.updateProduct(actor.id, id, dto);
  }

  @Post('inventory/adjust')
  @RequirePermissions('inventory.write')
  async adjustInventory(@CurrentUser() actor: RequestUser, @Body() dto: InventoryAdjustmentDto): Promise<InventoryDto> {
    return this.inventory.adjust(actor.id, dto.variantId, dto.quantityDelta, dto.reason, dto.idempotencyKey);
  }
}
