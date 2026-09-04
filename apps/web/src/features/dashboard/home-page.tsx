import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, BookOpen, MessagesSquare, Trophy, Wallet, Gift, Coins } from 'lucide-react';
import { Avatar, AvatarFallback, BalanceCard, Card, OrderCard, WalletTransactionRow } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDate, formatMoney } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboard } from './api';

const QUICK_ACTIONS = [
  { key: 'healthManagement', icon: Activity, path: '/health/management' },
  { key: 'community', icon: MessagesSquare, path: '/health/community' },
  { key: 'sportRanking', icon: Trophy, path: '/health/sport-ranking' },
  { key: 'healthKnowledge', icon: BookOpen, path: '/health/knowledge' },
] as const;

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const dashboardQuery = useDashboard();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Avatar className="size-11">
          <AvatarFallback>{user?.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm text-muted-foreground">
            {dashboardQuery.data ? t(`dashboard.greeting.${dashboardQuery.data.greetingCode.toLowerCase()}`) : ' '}
          </p>
          <h1 className="text-lg font-semibold text-foreground">
            {user?.displayName} <span className="num text-xs font-normal text-muted-foreground">{user?.memberId}</span>
          </h1>
        </div>
      </div>

      {dashboardQuery.data?.demoMode ? (
        <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">{t('common.demoModeBanner')}</div>
      ) : null}

      <QueryState isLoading={dashboardQuery.isLoading} isError={dashboardQuery.isError} error={dashboardQuery.error} onRetry={() => dashboardQuery.refetch()} skeletonVariant="card-grid">
        {dashboardQuery.data ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {dashboardQuery.data.kpis.map((kpi) => (
                <BalanceCard
                  key={kpi.key}
                  label={t(kpi.labelCode, kpi.labelCode.split('.').pop() ?? kpi.key)}
                  formattedAmount={kpi.money ? formatMoney(kpi.money) : String(kpi.count ?? 0)}
                  accent={kpi.accent}
                  icon={kpi.walletType === 'BONUS_POOL' ? Gift : kpi.walletType === 'PERSONAL_POINTS' ? Coins : Wallet}
                  onClick={() => navigate('/app/wallet')}
                />
              ))}
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-foreground">{t('dashboard.quickActions')}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {QUICK_ACTIONS.map((action) => (
                  <Card key={action.key} className="flex cursor-pointer flex-col items-center gap-2 p-4 text-center hover:shadow-raised" onClick={() => navigate(action.path)}>
                    <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <action.icon className="size-4.5" />
                    </span>
                    <span className="text-xs font-medium text-foreground">{t(`nav.${action.key}`)}</span>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <h2 className="mb-2 text-sm font-semibold text-foreground">{t('dashboard.recentOrders')}</h2>
                {dashboardQuery.data.recentOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('dashboard.noOrders')}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dashboardQuery.data.recentOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        formattedTotal={formatMoney(order.total)}
                        formattedDate={formatDate(order.placedAt)}
                        itemCountLabel={`${order.itemCount} items`}
                        onClick={() => navigate(`/orders/${order.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h2 className="mb-2 text-sm font-semibold text-foreground">{t('dashboard.recentTransactions')}</h2>
                <Card className="p-3">
                  {dashboardQuery.data.recentTransactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('dashboard.noTransactions')}</p>
                  ) : (
                    dashboardQuery.data.recentTransactions.map((tx) => (
                      <WalletTransactionRow key={tx.id} transaction={tx} formattedAmount={formatMoney(tx.amount)} formattedDate={formatDate(tx.createdAt)} typeLabel={tx.description} />
                    ))
                  )}
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </QueryState>
    </div>
  );
}
