import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';
import { InventoryService } from './inventory.service.js';
import {
  CategoriesController,
  ProductsController,
  AdminCategoriesController,
  AdminProductsController,
} from './catalog.controller.js';

@Module({
  controllers: [CategoriesController, ProductsController, AdminCategoriesController, AdminProductsController],
  providers: [CatalogService, InventoryService],
  exports: [CatalogService, InventoryService],
})
export class CatalogModule {}
