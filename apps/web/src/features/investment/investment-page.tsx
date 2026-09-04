import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react';
import type { InvestmentPlanDto } from '@ptg/types';
import { Badge, Button, Card, StatusBadge, toast } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { formatDate, formatMoney } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { useEnrollInPlan, useInvestmentPlans, useMyEnrollments } from './api';

export default function InvestmentPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const plansQuery = useInvestmentPlans();
  const enrollmentsQuery = useMyEnrollments(Boolean(user));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
          <Gift className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{t('investment.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('investment.subtitle')}</p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">{t('investment.availablePlans')}</h2>
        <QueryState
          isLoading={plansQuery.isLoading}
          isError={plansQuery.isError}
          error={plansQuery.error}
          onRetry={() => plansQuery.refetch()}
          isEmpty={plansQuery.data?.length === 0}
          emptyTitle={t('investment.noPlans')}
          skeletonVariant="card-grid"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {plansQuery.data?.map((plan) => (
              <PlanCard key={plan.id} plan={plan} canEnroll={Boolean(user)} />
            ))}
          </div>
        </QueryState>
      </section>

      {user ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">{t('investment.myEnrollments')}</h2>
          <QueryState
            isLoading={enrollmentsQuery.isLoading}
            isError={enrollmentsQuery.isError}
            error={enrollmentsQuery.error}
            onRetry={() => enrollmentsQuery.refetch()}
            isEmpty={enrollmentsQuery.data?.length === 0}
            emptyTitle={t('investment.noEnrollments')}
            skeletonVariant="list"
          >
            <div className="flex flex-col gap-2">
              {enrollmentsQuery.data?.map((enrollment) => (
                <Card key={enrollment.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{enrollment.plan.name}</span>
                    <span className="text-2xs text-muted-foreground">
                      {enrollment.startedAt ? formatDate(enrollment.startedAt) : '—'}
                      {enrollment.maturesAt ? ` → ${formatDate(enrollment.maturesAt)}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num text-sm font-semibold text-foreground">{formatMoney(enrollment.principal)}</span>
                    <StatusBadge status={enrollment.status} />
                  </div>
                </Card>
              ))}
            </div>
          </QueryState>
        </section>
      ) : null}
    </div>
  );
}

function PlanCard({ plan, canEnroll }: { plan: InvestmentPlanDto; canEnroll: boolean }) {
  const { t } = useTranslation();
  const enroll = useEnrollInPlan();
  const [amount, setAmount] = React.useState('');

  const minorPerUnit = 100;
  const amountMinor = Math.round(Number(amount) * minorPerUnit);
  const belowMinimum = amountMinor < plan.minimumAmount.amountMinor;
  const aboveMaximum = plan.maximumAmount != null && amountMinor > plan.maximumAmount.amountMinor;
  const isValid = Number.isFinite(amountMinor) && amountMinor > 0 && !belowMinimum && !aboveMaximum;

  const handleEnroll = () => {
    enroll.mutate(
      { planId: plan.id, amountMinor },
      {
        onSuccess: () => {
          toast.success(t('investment.enrolled', { plan: plan.name }));
          setAmount('');
        },
        onError: () => toast.error(t('errors.generic')),
      },
    );
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
          {plan.description ? <p className="mt-0.5 text-xs text-muted-foreground">{plan.description}</p> : null}
        </div>
        {plan.riskLabel ? <Badge variant="info">{plan.riskLabel}</Badge> : null}
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col">
          <dt className="text-muted-foreground">{t('investment.minimum')}</dt>
          <dd className="num text-foreground">{formatMoney(plan.minimumAmount)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-muted-foreground">{t('investment.maximum')}</dt>
          <dd className="num text-foreground">{plan.maximumAmount ? formatMoney(plan.maximumAmount) : t('investment.noLimit')}</dd>
        </div>
        {plan.termDays != null ? (
          <div className="flex flex-col">
            <dt className="text-muted-foreground">{t('investment.term')}</dt>
            <dd className="num text-foreground">{t('investment.days', { count: plan.termDays })}</dd>
          </div>
        ) : null}
      </dl>

      {canEnroll ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={plan.minimumAmount.amountMinor / minorPerUnit}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={t('investment.amountPlaceholder')}
              aria-label={t('investment.amountPlaceholder')}
              className="num h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
            <Button size="sm" onClick={handleEnroll} loading={enroll.isPending} disabled={!isValid}>
              {t('investment.enroll')}
            </Button>
          </div>
          {amount && belowMinimum ? (
            <p className="text-2xs text-destructive">{t('investment.belowMinimum', { amount: formatMoney(plan.minimumAmount) })}</p>
          ) : null}
          {amount && aboveMaximum && plan.maximumAmount ? (
            <p className="text-2xs text-destructive">{t('investment.aboveMaximum', { amount: formatMoney(plan.maximumAmount) })}</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
