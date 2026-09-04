import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { InventoryDto, StockStatus } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AUDIT_ACTIONS } from '@ptg/config';

export function deriveStockStatus(available: number, lowStockThreshold: number, backorder: boolean): StockStatus {
  if (available <= 0) return backorder ? 'BACKORDER' : 'OUT_OF_STOCK';
  if (available <= lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

/**
 * Every on-hand quantity change is an immutable InventoryTransaction row,
 * mirroring the wallet ledger's discipline: no controller or checkout flow
 * ever writes `Inventory.onHand` directly.
 */
@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async ensureInventory(variantId: string) {
    const existing = await this.prisma.inventory.findUnique({ where: { variantId } });
    if (existing) return existing;
    return this.prisma.inventory.create({ data: { variantId, onHand: 0, reserved: 0 } });
  }

  async getForVariants(variantIds: string[]) {
    return this.prisma.inventory.findMany({ where: { variantId: { in: variantIds } } });
  }

  /** Reserves stock for a cart/checkout flow. Throws INSUFFICIENT_STOCK if unavailable. */
  async reserve(variantId: string, quantity: number, referenceId: string, idempotencyKey: string): Promise<void> {
    await this.applyDelta(variantId, 'RESERVE', 0, quantity, referenceId, idempotencyKey);
  }

  async release(variantId: string, quantity: number, referenceId: string, idempotencyKey: string): Promise<void> {
    await this.applyDelta(variantId, 'RELEASE', 0, -quantity, referenceId, idempotencyKey);
  }

  /** Converts a reservation into a permanent decrement once an order ships/fulfils. */
  async fulfill(variantId: string, quantity: number, referenceId: string, idempotencyKey: string): Promise<void> {
    await this.applyDelta(variantId, 'FULFILL', -quantity, -quantity, referenceId, idempotencyKey);
  }

  async restock(variantId: string, quantity: number, referenceId: string, idempotencyKey: string): Promise<void> {
    await this.applyDelta(variantId, 'RESTOCK', quantity, 0, referenceId, idempotencyKey);
  }

  async adjust(actorId: string, variantId: string, quantityDelta: number, reason: string, idempotencyKey: string): Promise<InventoryDto> {
    await this.applyDelta(variantId, 'ADJUSTMENT', quantityDelta, 0, null, idempotencyKey, reason);
    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.inventoryAdjusted,
      entityType: 'Inventory',
      entityId: variantId,
      after: { quantityDelta, reason },
    });
    return this.toDto(variantId);
  }

  async toDto(variantId: string): Promise<InventoryDto> {
    const inventory = await this.prisma.inventory.findUniqueOrThrow({
      where: { variantId },
      include: { variant: { include: { product: { select: { name: true } } } } },
    });
    const available = inventory.onHand - inventory.reserved;
    return {
      variantId,
      sku: inventory.variant.sku,
      productName: inventory.variant.product.name,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
      available,
      lowStockThreshold: inventory.lowStockThreshold,
      stockStatus: deriveStockStatus(available, inventory.lowStockThreshold, false),
      updatedAt: inventory.updatedAt.toISOString(),
    };
  }

  private async applyDelta(
    variantId: string,
    type: 'RESTOCK' | 'RESERVE' | 'RELEASE' | 'FULFILL' | 'ADJUSTMENT' | 'RETURN',
    onHandDelta: number,
    reservedDelta: number,
    referenceId: string | null,
    idempotencyKey: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        if (idempotencyKey) {
          const existing = await tx.inventoryTransaction.findUnique({ where: { idempotencyKey } });
          if (existing) return;
        }

        const inventory = await tx.inventory.upsert({
          where: { variantId },
          create: { variantId, onHand: 0, reserved: 0 },
          update: {},
        });

        const newOnHand = inventory.onHand + onHandDelta;
        const newReserved = inventory.reserved + reservedDelta;
        if (newOnHand < 0) throw new ApiException('INSUFFICIENT_STOCK', 'Not enough stock on hand.');
        if (newReserved < 0 || newReserved > newOnHand) {
          throw new ApiException('INSUFFICIENT_STOCK', 'Not enough available stock to reserve.');
        }

        await tx.inventory.update({ where: { variantId }, data: { onHand: newOnHand, reserved: newReserved } });
        await tx.inventoryTransaction.create({
          data: {
            variantId,
            type,
            quantityDelta: onHandDelta !== 0 ? onHandDelta : reservedDelta,
            reason,
            referenceType: referenceId ? 'ORDER' : undefined,
            referenceId: referenceId ?? undefined,
            idempotencyKey: idempotencyKey || undefined,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 },
    );
  }
}
