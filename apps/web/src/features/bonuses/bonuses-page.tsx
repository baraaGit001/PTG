import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react';
import { BalanceCard, DataTable, Pagination, StatusBadge } from '@ptg/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { useBonusRecords, useBonusSummary } from './api';

export default function BonusesPage() {
  const { t } = useTranslation();
  const [page, setPage] = React.useState(1);
  const summaryQuery = useBonusSummary();
  const recordsQuery = useBonusRecords({ page, pageSize: 20 });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t('nav.myBonus')}</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BalanceCard label="Total earned" formattedAmount={summaryQuery.data ? formatMoney(summaryQuery.data.totalEarned) : '—'} icon={Gift} accent="green" />
        <BalanceCard label="Pending" formattedAmount={summaryQuery.data ? formatMoney(summaryQuery.data.totalPending) : '—'} icon={Gift} accent="orange" />
        <BalanceCard label="Paid" formattedAmount={summaryQuery.data ? formatMoney(summaryQuery.data.totalPaid) : '—'} icon={Gift} accent="blue" />
      </div>

      <DataTable
        loading={recordsQuery.isLoading}
        rows={recordsQuery.data?.items ?? []}
        getRowKey={(row) => row.id}
        emptyTitle="No bonus records yet"
        columns={[
          { key: 'rule', header: 'Rule', render: (row) => row.rule.name },
          { key: 'amount', header: 'Amount', className: 'num', render: (row) => formatMoney(row.amount) },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'date', header: 'Created', render: (row) => formatDate(row.createdAt) },
        ]}
      />
      {recordsQuery.data?.pagination ? <Pagination meta={recordsQuery.data.pagination} onPageChange={setPage} /> : null}
    </div>
  );
}
