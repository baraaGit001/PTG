import { WalletLedgerService } from '../src/modules/wallet/wallet-ledger.service.js';
import { ApiException } from '../src/common/errors/api.exception.js';

/**
 * A minimal in-memory stand-in for PrismaService, implementing just the
 * calls WalletLedgerService makes. `$transaction` runs the callback against
 * this same fake, which is enough to exercise the idempotency and balance
 * invariants without a real database.
 */
class FakePrisma {
  wallets = new Map<string, any>();
  transactions = new Map<string, any>();
  private walletSeq = 0;
  private txSeq = 0;

  wallet = {
    findUnique: async ({ where }: any) => {
      if (where.id) return this.wallets.get(where.id) ?? null;
      return [...this.wallets.values()].find((w) => w.userId === where.userId_type.userId && w.type === where.userId_type.type) ?? null;
    },
    create: async ({ data }: any) => {
      const id = `wallet-${++this.walletSeq}`;
      const wallet = { id, status: 'ACTIVE', allowNegative: false, balanceMinor: 0n, reservedMinor: 0n, updatedAt: new Date(), ...data };
      this.wallets.set(id, wallet);
      return wallet;
    },
    update: async ({ where, data }: any) => {
      const wallet = this.wallets.get(where.id);
      const updated = { ...wallet, ...data, updatedAt: new Date() };
      this.wallets.set(where.id, updated);
      return updated;
    },
  };

  walletTransaction = {
    findUnique: async ({ where, include }: any) => {
      let found: any = null;
      if (where.id) found = this.transactions.get(where.id) ?? null;
      else if (where.idempotencyKey) found = [...this.transactions.values()].find((t) => t.idempotencyKey === where.idempotencyKey) ?? null;
      else if (where.reversalOfId) found = [...this.transactions.values()].find((t) => t.reversalOfId === where.reversalOfId) ?? null;
      if (found && include?.wallet) return { ...found, wallet: this.wallets.get(found.walletId) };
      return found;
    },
    create: async ({ data }: any) => {
      const id = `tx-${++this.txSeq}`;
      const tx = { id, reversalOfId: null, createdAt: new Date(), ...data };
      this.transactions.set(id, tx);
      return tx;
    },
    update: async ({ where, data }: any) => {
      const tx = this.transactions.get(where.id);
      const updated = { ...tx, ...data };
      this.transactions.set(where.id, updated);
      return updated;
    },
  };

  async $transaction(fn: (tx: this) => Promise<unknown>) {
    return fn(this);
  }
}

describe('WalletLedgerService (in-memory Prisma double)', () => {
  function build() {
    const prisma = new FakePrisma();
    const service = new WalletLedgerService(prisma as any);
    return { prisma, service };
  }

  it('posts a transaction and updates the cached wallet balance atomically', async () => {
    const { service } = build();
    const tx = await service.postTransaction({
      userId: 'user-1',
      walletType: 'E_ACCOUNT',
      currency: 'USD',
      type: 'CREDIT',
      direction: 'IN',
      amountMinor: 5000,
      description: 'Top-up',
      idempotencyKey: 'key-1',
    });

    expect(tx.balanceAfter).toEqual({ amountMinor: 5000, currency: 'USD' });
    const wallet = await service.getWallet('user-1', 'E_ACCOUNT', 'USD');
    expect(wallet.balance.amountMinor).toBe(5000);
  });

  it('replays an idempotent request instead of posting a second time', async () => {
    const { service } = build();
    const params = {
      userId: 'user-1',
      walletType: 'E_ACCOUNT' as const,
      currency: 'USD',
      type: 'CREDIT' as const,
      direction: 'IN' as const,
      amountMinor: 1000,
      description: 'Bonus',
      idempotencyKey: 'same-key',
    };

    const first = await service.postTransaction(params);
    const second = await service.postTransaction(params);

    expect(second.id).toBe(first.id);
    const wallet = await service.getWallet('user-1', 'E_ACCOUNT', 'USD');
    // If the second call had posted again, the balance would be 2000.
    expect(wallet.balance.amountMinor).toBe(1000);
  });

  it('rejects a debit that would take a non-negative wallet below zero', async () => {
    const { service } = build();
    await service.postTransaction({
      userId: 'user-2',
      walletType: 'E_ACCOUNT',
      currency: 'USD',
      type: 'CREDIT',
      direction: 'IN',
      amountMinor: 500,
      description: 'Top-up',
      idempotencyKey: 'seed-2',
    });

    await expect(
      service.postTransaction({
        userId: 'user-2',
        walletType: 'E_ACCOUNT',
        currency: 'USD',
        type: 'ORDER_PAYMENT',
        direction: 'OUT',
        amountMinor: 600,
        description: 'Order payment',
        idempotencyKey: 'debit-2',
      }),
    ).rejects.toThrow(ApiException);
  });

  it('reverses a posted transaction with the opposite direction and refuses a second reversal', async () => {
    const { service } = build();
    const original = await service.postTransaction({
      userId: 'user-3',
      walletType: 'BONUS_POOL',
      currency: 'USD',
      type: 'BONUS',
      direction: 'IN',
      amountMinor: 2000,
      description: 'Bonus payout',
      idempotencyKey: 'bonus-3',
    });

    const reversal = await service.reverseTransaction(original.id, 'reversal-3', 'Reversing test bonus');
    expect(reversal.direction).toBe('OUT');
    expect(reversal.amount.amountMinor).toBe(2000);

    await expect(service.reverseTransaction(original.id, 'reversal-3-again', 'Second attempt')).rejects.toThrow(ApiException);
  });
});
