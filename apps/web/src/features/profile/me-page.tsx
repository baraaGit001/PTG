import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  CreditCard,
  FileBarChart,
  Gift,
  IdCard,
  Languages,
  LogOut,
  MapPin,
  MessageSquare,
  PackageCheck,
  Settings,
  Truck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Card } from '@ptg/ui';
import { formatMoney } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/features/auth/api';
import { useDashboard } from '@/features/dashboard/api';

/**
 * The "My" tab. Mirrors the mobile app: identity header, the three balances,
 * the Investment Plan entry, the four order-status shortcuts, then the account
 * menu.
 */
export default function MePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const dashboardQuery = useDashboard();

  if (!user) return null;

  const kpis = dashboardQuery.data?.kpis ?? [];

  const orderShortcuts = [
    { key: 'pay', icon: CreditCard, status: 'PENDING_PAYMENT' },
    { key: 'ship', icon: PackageCheck, status: 'PAID' },
    { key: 'receive', icon: Truck, status: 'SHIPPED' },
    { key: 'done', icon: MessageSquare, status: 'DELIVERED' },
  ] as const;

  const menuItems = [
    { key: 'myReport', icon: FileBarChart, path: '/app/report', show: true },
    { key: 'personalInformation', icon: IdCard, path: '/app/profile', show: true },
    { key: 'addresses', icon: MapPin, path: '/app/addresses', show: true },
    { key: 'language', icon: Languages, path: '/app/language', show: true },
  ].filter((item) => item.show);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start gap-3">
        <Avatar className="size-16">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-xl">{user.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-foreground">{user.displayName}</h1>
          <p className="num text-sm text-muted-foreground">{user.memberId}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            {user.membership?.rank ? (
              <span className="rounded-full bg-foreground px-2.5 py-0.5 font-medium text-background">{user.membership.rank}</span>
            ) : null}
            <span className="text-muted-foreground">{t('profile.serviceCenter')}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/app/profile')}
          aria-label={t('nav.personalInformation')}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <Settings className="size-4.5" />
        </button>
      </header>

      <Card className="grid grid-cols-3 divide-x divide-border p-4">
        {kpis.length > 0
          ? kpis.map((kpi) => (
              <button
                key={kpi.key}
                type="button"
                onClick={() => navigate('/app/wallet')}
                className="flex flex-col items-center gap-0.5 px-1"
              >
                <span className="num text-base font-semibold text-foreground">
                  {kpi.money ? formatMoney(kpi.money) : String(kpi.count ?? 0)}
                </span>
                <span className="text-2xs text-muted-foreground">{t(kpi.labelCode, kpi.labelCode.split('.').pop() ?? kpi.key)}</span>
              </button>
            ))
          : ['eAccount', 'bonusPool', 'personalPoints'].map((key) => (
              <div key={key} className="flex flex-col items-center gap-0.5 px-1">
                <span className="num text-base font-semibold text-muted-foreground">—</span>
                <span className="text-2xs text-muted-foreground">{t(`wallet.${key}`)}</span>
              </div>
            ))}
      </Card>

      <Card
        className="flex cursor-pointer items-center gap-3 p-4 hover:shadow-raised"
        onClick={() => navigate('/app/investment')}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
          <Gift className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{t('investment.title')}</p>
          <p className="truncate text-xs text-muted-foreground">{t('investment.subtitle')}</p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Card>

      <Card className="flex flex-col p-4">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="flex items-center justify-between border-b border-border pb-3"
        >
          <span className="text-sm font-semibold text-foreground">{t('nav.myOrders')}</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
        <div className="grid grid-cols-4 pt-3">
          {orderShortcuts.map((shortcut) => (
            <button
              key={shortcut.key}
              type="button"
              onClick={() => navigate(`/orders?status=${shortcut.status}`)}
              className="flex flex-col items-center gap-1.5"
            >
              <shortcut.icon className="size-5 text-muted-foreground" />
              <span className="text-2xs text-foreground">{t(`orders.shortcut.${shortcut.key}`)}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col divide-y divide-border">
        {menuItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent"
          >
            <item.icon className="size-4.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm text-foreground">{t(`nav.${item.key}`)}</span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => logout.mutate(false)}
          className="flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent"
        >
          <LogOut className="size-4.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm text-foreground">{t('common.signOut')}</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </Card>
    </div>
  );
}
