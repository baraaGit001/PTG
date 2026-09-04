import { AlertTriangle, Boxes, ClipboardCheck, Gift, ShoppingCart, Users, Wallet } from 'lucide-react';
import { MetricCard } from '@ptg/ui';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { QueryState } from '@/components/query-state';
import { formatMoney } from '@/lib/format';
import { useAdminDashboard } from './api';

export default function DashboardPage() {
  const dashboardQuery = useAdminDashboard();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
      <QueryState isLoading={dashboardQuery.isLoading} isError={dashboardQuery.isError} error={dashboardQuery.error} onRetry={() => dashboardQuery.refetch()} skeletonVariant="card-grid">
        {dashboardQuery.data ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <MetricCard label="Users" value={String(dashboardQuery.data.totals.users)} icon={Users} accent="green" />
              <MetricCard label="Active partners" value={String(dashboardQuery.data.totals.activeMembers)} icon={Users} accent="blue" />
              <MetricCard label="Orders (30d)" value={String(dashboardQuery.data.totals.orders30d)} icon={ShoppingCart} accent="orange" />
              <MetricCard label="Revenue (30d)" value={formatMoney(dashboardQuery.data.totals.revenue30d)} icon={Wallet} accent="green" />
              <MetricCard label="Pending fulfillment" value={String(dashboardQuery.data.totals.pendingFulfillment)} icon={ClipboardCheck} accent="neutral" />
              <MetricCard label="Pending bonuses" value={String(dashboardQuery.data.totals.pendingBonusRecords)} icon={Gift} accent="orange" />
              <MetricCard label="Pending adjustments" value={String(dashboardQuery.data.totals.pendingWalletAdjustments)} icon={Wallet} accent="blue" />
              <MetricCard label="Open reports" value={String(dashboardQuery.data.totals.openCommunityReports)} icon={AlertTriangle} accent="orange" />
              <MetricCard label="Low stock variants" value={String(dashboardQuery.data.totals.lowStockVariants)} icon={Boxes} accent="neutral" />
            </div>

            {dashboardQuery.data.salesSeries.length > 0 ? (
              <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Revenue (30 days)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dashboardQuery.data.salesSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenueMinor" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Recent admin actions</h2>
              <div className="flex flex-col divide-y divide-border">
                {dashboardQuery.data.recentAuditActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between py-2 text-xs">
                    <span className="text-foreground">{action.action}</span>
                    <span className="text-muted-foreground">{action.actorName ?? 'System'}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </QueryState>
    </div>
  );
}
