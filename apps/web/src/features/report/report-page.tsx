import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GitBranch, Gift, Network, PackageCheck, Users } from 'lucide-react';
import { Card, MetricCard, StatusBadge } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDate } from '@/lib/format';
import { useMemberReport } from '@/features/members/api';

export default function ReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reportQuery = useMemberReport();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t('nav.myReport')}</h1>

      <QueryState isLoading={reportQuery.isLoading} isError={reportQuery.isError} error={reportQuery.error} onRetry={() => reportQuery.refetch()} skeletonVariant="card-grid">
        {reportQuery.data ? (
          <>
            <Card className="flex flex-wrap items-center gap-4 p-4">
              <div className="flex flex-col">
                <span className="text-2xs text-muted-foreground">Joined</span>
                <span className="text-sm font-medium text-foreground">{reportQuery.data.joinedAt ? formatDate(reportQuery.data.joinedAt) : '—'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xs text-muted-foreground">Status</span>
                <StatusBadge status={reportQuery.data.membershipStatus} />
              </div>
              <div className="flex flex-col">
                <span className="text-2xs text-muted-foreground">Rank</span>
                <span className="text-sm font-medium text-foreground">{reportQuery.data.rank ?? '—'}</span>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Direct members" value={String(reportQuery.data.directMemberCount)} icon={Users} accent="green" />
              <MetricCard label="Total downline" value={String(reportQuery.data.totalDownlineCount)} icon={Network} accent="blue" />
              <MetricCard label="New this period" value={String(reportQuery.data.newMembersInPeriod)} icon={Users} accent="orange" />
              <MetricCard label="Fulfillment orders" value={String(reportQuery.data.fulfillmentOrderCount)} icon={PackageCheck} accent="neutral" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ReportLink icon={Users} label={t('nav.members')} onClick={() => navigate('/app/members')} />
              <ReportLink icon={Network} label={t('nav.sponsorTree')} onClick={() => navigate('/app/sponsor-tree')} />
              <ReportLink icon={GitBranch} label={t('nav.placementTree')} onClick={() => navigate('/app/placement-tree')} />
              <ReportLink icon={PackageCheck} label={t('nav.fulfillmentOrders')} onClick={() => navigate('/app/fulfillment-orders')} />
              <ReportLink icon={Gift} label={t('nav.myBonus')} onClick={() => navigate('/app/bonuses')} />
            </div>
          </>
        ) : null}
      </QueryState>
    </div>
  );
}

function ReportLink({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <Card className="flex cursor-pointer items-center gap-3 p-4 hover:shadow-raised" onClick={onClick}>
      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4.5" />
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Card>
  );
}
