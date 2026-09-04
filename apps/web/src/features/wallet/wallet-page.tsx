import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Gift, Wallet as WalletIcon } from 'lucide-react';
import { BalanceCard, Pagination, Tabs, TabsContent, TabsList, TabsTrigger, WalletTransactionRow } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useWalletSummary, useWalletTransactions, usePointsSummary, usePointsTransactions } from './api';

export default function WalletPage() {
  const { t } = useTranslation();
  const summaryQuery = useWalletSummary();
  const pointsSummaryQuery = usePointsSummary();
  const [tab, setTab] = React.useState<'E_ACCOUNT' | 'BONUS_POOL' | 'PERSONAL_POINTS'>('E_ACCOUNT');
  const [page, setPage] = React.useState(1);

  const eAccount = summaryQuery.data?.wallets.find((w) => w.type === 'E_ACCOUNT');
  const bonusPool = summaryQuery.data?.wallets.find((w) => w.type === 'BONUS_POOL');

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold text-foreground">{t('wallet.title')}</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BalanceCard label={t('wallet.eAccount')} formattedAmount={eAccount ? formatMoney(eAccount.balance) : '—'} icon={WalletIcon} accent="green" />
        <BalanceCard label={t('wallet.bonusPool')} formattedAmount={bonusPool ? formatMoney(bonusPool.balance) : '—'} icon={Gift} accent="blue" />
        <BalanceCard label={t('wallet.personalPoints')} formattedAmount={pointsSummaryQuery.data ? String(pointsSummaryQuery.data.balance) : '—'} icon={Coins} accent="orange" />
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="E_ACCOUNT">{t('wallet.eAccount')}</TabsTrigger>
          <TabsTrigger value="BONUS_POOL">{t('wallet.bonusPool')}</TabsTrigger>
          <TabsTrigger value="PERSONAL_POINTS">{t('wallet.personalPoints')}</TabsTrigger>
        </TabsList>
        <TabsContent value="E_ACCOUNT">
          <WalletTransactionList type="E_ACCOUNT" page={page} onPageChange={setPage} />
        </TabsContent>
        <TabsContent value="BONUS_POOL">
          <WalletTransactionList type="BONUS_POOL" page={page} onPageChange={setPage} />
        </TabsContent>
        <TabsContent value="PERSONAL_POINTS">
          <PointsTransactionList page={page} onPageChange={setPage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WalletTransactionList({ type, page, onPageChange }: { type: 'E_ACCOUNT' | 'BONUS_POOL'; page: number; onPageChange: (p: number) => void }) {
  const { t } = useTranslation();
  const query = useWalletTransactions(type, page);
  return (
    <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={() => query.refetch()} isEmpty={query.data?.items.length === 0} emptyTitle={t('wallet.noTransactions')}>
      <div className="rounded-lg border border-border p-3">
        {query.data?.items.map((tx) => (
          <WalletTransactionRow key={tx.id} transaction={tx} formattedAmount={formatMoney(tx.amount)} formattedDate={formatDateTime(tx.createdAt)} typeLabel={tx.description} />
        ))}
      </div>
      {query.data?.pagination ? <Pagination meta={query.data.pagination} onPageChange={onPageChange} className="mt-3" /> : null}
    </QueryState>
  );
}

function PointsTransactionList({ page, onPageChange }: { page: number; onPageChange: (p: number) => void }) {
  const { t } = useTranslation();
  const query = usePointsTransactions(page);
  return (
    <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={() => query.refetch()} isEmpty={query.data?.items.length === 0} emptyTitle={t('wallet.noTransactions')}>
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border p-3">
        {query.data?.items.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between py-2 text-sm">
            <div className="flex flex-col">
              <span className="text-foreground">{tx.description}</span>
              <span className="text-2xs text-muted-foreground">{formatDateTime(tx.createdAt)}</span>
            </div>
            <span className={`num font-semibold ${tx.points >= 0 ? 'text-success' : 'text-destructive'}`}>
              {tx.points >= 0 ? '+' : ''}
              {tx.points}
            </span>
          </div>
        ))}
      </div>
      {query.data?.pagination ? <Pagination meta={query.data.pagination} onPageChange={onPageChange} className="mt-3" /> : null}
    </QueryState>
  );
}
