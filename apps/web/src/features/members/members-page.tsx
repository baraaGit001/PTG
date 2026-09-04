import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Pagination, SearchBar, StatusBadge } from '@ptg/ui';
import { formatDate } from '@/lib/format';
import { useMembers } from './api';

export default function MembersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const membersQuery = useMembers({ search: search || undefined, page, pageSize: 20 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-foreground">{t('nav.members')}</h1>
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} className="sm:max-w-xs" />
      </div>

      <DataTable
        loading={membersQuery.isLoading}
        rows={membersQuery.data?.items ?? []}
        getRowKey={(row) => row.id}
        emptyTitle="No members found"
        columns={[
          { key: 'name', header: 'Member', render: (row) => (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{row.displayName}</span>
              <span className="num text-2xs text-muted-foreground">{row.memberId}</span>
            </div>
          ) },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.membershipStatus} /> },
          { key: 'rank', header: 'Rank', render: (row) => row.rank ?? '—' },
          { key: 'joined', header: 'Joined', render: (row) => (row.joinedAt ? formatDate(row.joinedAt) : '—') },
          { key: 'direct', header: 'Direct', className: 'num', render: (row) => row.directChildCount },
        ]}
      />
      {membersQuery.data?.pagination ? <Pagination meta={membersQuery.data.pagination} onPageChange={setPage} /> : null}
    </div>
  );
}
