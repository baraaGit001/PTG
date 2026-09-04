import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { WalletTransaction } from '@prisma/client';
import type {
  ReferenceType,
  TransactionDirection,
  TransactionType,
  WalletDto,
  WalletTransactionDto,
  WalletType,
} from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { toMinorBigInt, toMoney } from '../../common/money.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface PostTransactionParams {
  userId: string;
  walletType: WalletType;
  currency: string;
  type: TransactionType;
  direction: TransactionDirection;
  /** Absolute value in minor units - `direction` decides the sign applied to the balance. */
  amountMinor: number;
  description: string;
  descriptionCode?: string;
  referenceType?: ReferenceType;
  referenceId?: string;
  referenceLabel?: string;
  /**
   * Required for every client- or event-triggered post. A retried request
   * with the same key returns the original transaction instead of posting a
   * second time - this is what makes double bonus issuance and double
   * refunds structurally impossible, not just unlikely.
   */
  idempotencyKey: string;
}

const MAX_SERIALIZATION_RETRIES = 3;

/**
 * The sole writer of E_ACCOUNT and BONUS_POOL balances. No other service
 * touches `Wallet.balanceMinor` directly - every change is an immutable
 * WalletTransaction row appended inside a Serializable database transaction,
 * with the cached balance updated atomically alongside it.
 */
@Injectable()
export class WalletLedgerService {
  private readonly logger = new Logger(WalletLedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWallet(userId: string, type: WalletType, currency: string) {
    const existing = await this.prisma.wallet.findUnique({ where: { userId_type: { userId, type } } });
    if (existing) return existing;
    return this.prisma.wallet.create({ data: { userId, type, currency, balanceMinor: 0n, reservedMinor: 0n } });
  }

  async getWalletSummary(userId: string, defaultCurrency: string): Promise<WalletDto[]> {
    const types: WalletType[] = ['E_ACCOUNT', 'BONUS_POOL'];
    const wallets = await Promise.all(types.map((type) => this.getOrCreateWallet(userId, type, defaultCurrency)));
    return wallets.map(toWalletDto);
  }

  async getWallet(userId: string, type: WalletType, defaultCurrency: string): Promise<WalletDto> {
    const wallet = await this.getOrCreateWallet(userId, type, defaultCurrency);
    return toWalletDto(wallet);
  }

  async listTransactions(
    userId: string,
    type: WalletType,
    args: { skip: number; take: number; filters: Prisma.WalletTransactionWhereInput },
  ): Promise<{ items: WalletTransactionDto[]; total: number }> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId_type: { userId, type } } });
    if (!wallet) return { items: [], total: 0 };

    const where: Prisma.WalletTransactionWhereInput = { walletId: wallet.id, ...args.filters };
    const [rows, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: args.skip, take: args.take }),
      this.prisma.walletTransaction.count({ where }),
    ]);
    return { items: rows.map((row) => toTransactionDto(row, type)), total };
  }

  /** The single authoritative entry point for any E_ACCOUNT/BONUS_POOL balance change. */
  async postTransaction(params: PostTransactionParams): Promise<WalletTransactionDto> {
    for (let attempt = 1; attempt <= MAX_SERIALIZATION_RETRIES; attempt++) {
      try {
        return await this.postOnce(params);
      } catch (error) {
        const isSerializationConflict =
          error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === '40001');
        if (!isSerializationConflict || attempt === MAX_SERIALIZATION_RETRIES) throw error;
        this.logger.warn(`Wallet transaction serialization conflict, retrying (attempt ${attempt})`);
      }
    }
    throw new ApiException('INTERNAL_ERROR', 'Could not post the wallet transaction after multiple attempts.');
  }

  private async postOnce(params: PostTransactionParams): Promise<WalletTransactionDto> {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.walletTransaction.findUnique({ where: { idempotencyKey: params.idempotencyKey } });
        if (existing) return toTransactionDto(existing, params.walletType);

        let wallet = await tx.wallet.findUnique({ where: { userId_type: { userId: params.userId, type: params.walletType } } });
        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId: params.userId, type: params.walletType, currency: params.currency, balanceMinor: 0n, reservedMinor: 0n },
          });
        }
        if (wallet.status !== 'ACTIVE') {
          throw new ApiException('WALLET_INACTIVE', 'This wallet is not active.');
        }
        if (wallet.currency !== params.currency) {
          throw new ApiException('CURRENCY_MISMATCH', 'The transaction currency does not match the wallet currency.');
        }

        const amount = toMinorBigInt(params.amountMinor);
        if (amount < 0n) throw new ApiException('BAD_REQUEST', 'amountMinor must be a positive value; direction sets the sign.');

        const delta = params.direction === 'IN' ? amount : -amount;
        const newBalance = wallet.balanceMinor + delta;

        if (newBalance < 0n && !wallet.allowNegative) {
          throw new ApiException('INSUFFICIENT_FUNDS', 'This wallet does not have sufficient funds for this operation.');
        }

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balanceMinor: newBalance },
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            walletId: updatedWallet.id,
            type: params.type,
            direction: params.direction,
            status: 'POSTED',
            amountMinor: amount,
            currency: params.currency,
            balanceAfterMinor: newBalance,
            description: params.description,
            descriptionCode: params.descriptionCode,
            referenceType: params.referenceType,
            referenceId: params.referenceId,
            referenceLabel: params.referenceLabel,
            idempotencyKey: params.idempotencyKey,
            postedAt: new Date(),
          },
        });

        return toTransactionDto(transaction, params.walletType);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 },
    );
  }

  /** Posts the mirror-image transaction of `originalId`. Each transaction can be reversed at most once (DB-enforced by a unique constraint). */
  async reverseTransaction(originalId: string, idempotencyKey: string, reason: string): Promise<WalletTransactionDto> {
    const original = await this.prisma.walletTransaction.findUnique({ where: { id: originalId }, include: { wallet: true } });
    if (!original) throw new ApiException('TRANSACTION_NOT_FOUND', 'Transaction not found.');
    if (original.status !== 'POSTED') throw new ApiException('TRANSACTION_NOT_REVERSIBLE', 'Only posted transactions can be reversed.');

    const existingReversal = await this.prisma.walletTransaction.findUnique({ where: { reversalOfId: originalId } });
    if (existingReversal) throw new ApiException('TRANSACTION_ALREADY_REVERSED', 'This transaction has already been reversed.');

    const reversed = await this.postTransaction({
      userId: original.wallet.userId,
      walletType: original.wallet.type,
      currency: original.currency,
      type: 'REVERSAL',
      direction: original.direction === 'IN' ? 'OUT' : 'IN',
      amountMinor: Number(original.amountMinor),
      description: reason,
      descriptionCode: 'TRANSACTION_REVERSED',
      referenceType: original.referenceType ?? undefined,
      referenceId: original.referenceId ?? undefined,
      referenceLabel: original.referenceLabel ?? undefined,
      idempotencyKey,
    });

    await this.prisma.walletTransaction.update({ where: { id: reversed.id }, data: { reversalOfId: originalId } });
    return reversed;
  }
}

function toWalletDto(wallet: {
  id: string;
  type: WalletType;
  status: string;
  balanceMinor: bigint;
  reservedMinor: bigint;
  currency: string;
  allowNegative: boolean;
  updatedAt: Date;
}): WalletDto {
  const balance = toMoney(wallet.balanceMinor, wallet.currency);
  const reserved = toMoney(wallet.reservedMinor, wallet.currency);
  return {
    id: wallet.id,
    type: wallet.type,
    status: wallet.status as WalletDto['status'],
    balance,
    reserved,
    available: { amountMinor: balance.amountMinor - reserved.amountMinor, currency: balance.currency },
    allowNegative: wallet.allowNegative,
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

function toTransactionDto(transaction: WalletTransaction, walletType: WalletType): WalletTransactionDto {
  return {
    id: transaction.id,
    walletId: transaction.walletId,
    walletType,
    type: transaction.type,
    direction: transaction.direction,
    status: transaction.status,
    amount: toMoney(transaction.amountMinor, transaction.currency),
    balanceAfter: toMoney(transaction.balanceAfterMinor, transaction.currency),
    description: transaction.description,
    descriptionCode: transaction.descriptionCode,
    reference: transaction.referenceType
      ? { type: transaction.referenceType, id: transaction.referenceId, label: transaction.referenceLabel }
      : null,
    reversalOfId: transaction.reversalOfId,
    createdAt: transaction.createdAt.toISOString(),
    postedAt: transaction.postedAt?.toISOString() ?? null,
  };
}
