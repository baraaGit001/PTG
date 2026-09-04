import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, Tabs, TabsList, TabsTrigger, cn } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { useRanking } from './api';

const PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'] as const;

export default function SportRankingPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = React.useState<(typeof PERIODS)[number]>('WEEKLY');
  const rankingQuery = useRanking(period);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t('health.sportRanking')}</h1>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList>
          {PERIODS.map((p) => (
            <TabsTrigger key={p} value={p}>{p.replace('_', ' ')}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <QueryState isLoading={rankingQuery.isLoading} isError={rankingQuery.isError} error={rankingQuery.error} onRetry={() => rankingQuery.refetch()} isEmpty={rankingQuery.data?.entries.length === 0} emptyTitle="No activity recorded yet">
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {rankingQuery.data?.entries.map((entry) => (
            <div key={entry.member.id} className={cn('flex items-center gap-3 p-3', entry.isCurrentUser && 'bg-primary/5')}>
              <span className={cn('num flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold', entry.rank <= 3 ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground')}>
                {entry.rank <= 3 ? <Trophy className="size-3.5" /> : entry.rank}
              </span>
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{entry.member.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-sm text-foreground">{entry.member.displayName}</span>
              {entry.isCurrentUser ? <Badge variant="info">You</Badge> : null}
              <span className="num text-sm font-semibold text-foreground">{entry.score}</span>
            </div>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
