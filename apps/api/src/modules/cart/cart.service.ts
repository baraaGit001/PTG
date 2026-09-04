import { Injectable } from '@nestjs/common';
import { CART } from '@ptg/config';
import type { CartDto, CartItemDto, CartTotalsDto } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { toMoney } from '../../common/money.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Server-authoritative cart: every price and stock figure returned here is
 * resolved live from the catalogue/inventory tables at read time. The
 * `addedPriceMinor` snapshot on CartItem exists only to flag drift
 * (`priceChangedFrom`) - it is never used to compute a total.
 */
@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string, currency: string): Promise<CartDto> {
    const cart = await this.getOrCreateCart(userId, currency);
    return this.toDto(cart.id, currency);
  }

  async addItem(userId: string, currency: string, variantId: string, quantity: number): Promise<CartDto> {
    if (quantity < 1 || quantity > CART.maxQuantityPerItem) {
      throw new ApiException('QUANTITY_INVALID', `Quantity must be between 1 and ${CART.maxQuantityPerItem}.`);
    }
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
    if (!variant || variant.product.status !== 'PUBLISHED') throw new ApiException('VARIANT_NOT_FOUND', 'Product variant not found.');

    const cart = await this.getOrCreateCart(userId, currency);
    const existing = await this.prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });

    if (!existing) {
      const distinctCount = await this.prisma.cartItem.count({ where: { cartId: cart.id } });
      if (distinctCount >= CART.maxDistinctItems) {
        throw new ApiException('CART_ITEM_LIMIT_REACHED', `A cart can hold at most ${CART.maxDistinctItems} distinct items.`);
      }
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, variantId, quantity, addedPriceMinor: variant.priceMinor },
      });
    } else {
      const newQuantity = existing.quantity + quantity;
      if (newQuantity > CART.maxQuantityPerItem) {
        throw new ApiException('QUANTITY_INVALID', `Quantity must be between 1 and ${CART.maxQuantityPerItem}.`);
      }
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity, addedPriceMinor: variant.priceMinor },
      });
    }

    await this.prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
    return this.toDto(cart.id, currency);
  }

  async updateItem(userId: string, currency: string, itemId: string, quantity: number): Promise<CartDto> {
    const cart = await this.getOrCreateCart(userId, currency);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId }, include: { variant: true } });
    if (!item || item.cartId !== cart.id) throw new ApiException('CART_ITEM_NOT_FOUND', 'Cart item not found.');

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else if (quantity > CART.maxQuantityPerItem) {
      throw new ApiException('QUANTITY_INVALID', `Quantity must be between 1 and ${CART.maxQuantityPerItem}.`);
    } else {
      await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity, addedPriceMinor: item.variant.priceMinor } });
    }

    return this.toDto(cart.id, currency);
  }

  async removeItem(userId: string, currency: string, itemId: string): Promise<CartDto> {
    const cart = await this.getOrCreateCart(userId, currency);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cart.id) throw new ApiException('CART_ITEM_NOT_FOUND', 'Cart item not found.');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.toDto(cart.id, currency);
  }

  async clear(userId: string, currency: string): Promise<CartDto> {
    const cart = await this.getOrCreateCart(userId, currency);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.toDto(cart.id, currency);
  }

  private async getOrCreateCart(userId: string, currency: string) {
    const existing = await this.prisma.cart.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { userId, currency } });
  }

  private async toDto(cartId: string, currency: string): Promise<CartDto> {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      include: { variant: { include: { product: true, inventory: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const itemDtos: CartItemDto[] = items.map((item) => {
      const available = item.variant.inventory ? item.variant.inventory.onHand - item.variant.inventory.reserved : 0;
      const stockStatus = available <= 0 ? 'OUT_OF_STOCK' : available <= (item.variant.inventory?.lowStockThreshold ?? 5) ? 'LOW_STOCK' : 'IN_STOCK';
      const unitPriceMinor = item.variant.priceMinor;
      const priceChanged = unitPriceMinor !== item.addedPriceMinor;
      return {
        id: item.id,
        productId: item.variant.productId,
        productSlug: item.variant.product.slug,
        productName: item.variant.product.name,
        variantId: item.variantId,
        variantName: item.variant.name,
        sku: item.variant.sku,
        imageUrl: item.variant.imageUrl,
        quantity: item.quantity,
        unitPrice: toMoney(unitPriceMinor, currency),
        lineTotal: toMoney(unitPriceMinor * BigInt(item.quantity), currency),
        stockStatus,
        priceChangedFrom: priceChanged ? toMoney(item.addedPriceMinor, currency) : null,
        availableQuantity: available,
      };
    });

    const subtotalMinor = itemDtos.reduce((acc, item) => acc + BigInt(item.lineTotal.amountMinor), 0n);
    const pointsAwarded = items.reduce((acc, item) => acc + item.variant.pointsAwarded * item.quantity, 0);
    const totals: CartTotalsDto = {
      subtotal: toMoney(subtotalMinor, currency),
      discount: toMoney(0n, currency),
      shipping: toMoney(0n, currency),
      tax: toMoney(0n, currency),
      total: toMoney(subtotalMinor, currency),
      pointsAwarded,
      itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
    };

    const issues: CartDto['issues'] = [];
    for (const item of itemDtos) {
      if (item.stockStatus === 'OUT_OF_STOCK') {
        issues.push({ code: 'INSUFFICIENT_STOCK', itemId: item.id, message: `${item.productName} is out of stock.` });
      } else if (item.availableQuantity !== null && item.quantity > item.availableQuantity) {
        issues.push({ code: 'INSUFFICIENT_STOCK', itemId: item.id, message: `Only ${item.availableQuantity} of ${item.productName} are available.` });
      }
      if (item.priceChangedFrom) {
        issues.push({ code: 'PRICE_CHANGED', itemId: item.id, message: `The price of ${item.productName} has changed.` });
      }
    }

    return {
      id: cartId,
      items: itemDtos,
      totals,
      currency,
      issues,
      updatedAt: new Date().toISOString(),
    };
  }
}
