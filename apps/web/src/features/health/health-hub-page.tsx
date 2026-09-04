import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, ArrowRight, BarChart3, BookOpen, MessagesSquare, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Card } from '@ptg/ui';
import { formatNumber } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { useMyScores } from './api';

/**
 * Metric codes the app surfaces in "Today's Overview". Anything else the admin
 * configures still counts towards ranking, it just isn't one of these three
 * headline tiles.
 */
const OVERVIEW_METRICS = [
  { key: 'steps', codes: ['STEPS', 'STEP_COUNT'] },
  { key: 'calories', codes: ['CALORIES', 'CALORIES_BURNED', 'KCAL'] },
  { key: 'exercise', codes: ['EXERCISE', 'EXERCISE_MINUTES', 'ACTIVE_MINUTES'] },
] as const;

export default function HealthHubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const scoresQuery = useMyScores(Boolean(user));

  const today = new Date().toISOString().slice(0, 10);
  const todaysTotals = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const score of scoresQuery.data?.items ?? []) {
      if (score.recordedFor.slice(0, 10) !== today) continue;
      totals.set(score.metricCode, (totals.get(score.metricCode) ?? 0) + score.value);
    }
    return totals;
  }, [scoresQuery.data, today]);

  const readMetric = (codes: readonly string[]) => {
    for (const code of codes) {
      const value = todaysTotals.get(code);
      if (value != null) return value;
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Avatar className="size-12">
          {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-lg">{(user?.displayName ?? '?').slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {user ? t('health.helloName', { name: user.displayName }) : t('nav.health')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('health.hubSubtitle')}</p>
        </div>
      </header>

      <Card className="flex flex-col gap-4 border-0 bg-foreground p-4 text-background">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('health.todaysOverview')}</h2>
          <button
            type="button"
            onClick={() => scoresQuery.refetch()}
            className="flex items-center gap-1.5 rounded-full bg-background/10 px-3 py-1 text-xs text-background/80 hover:bg-background/20"
          >
            <RefreshCw className={`size-3 ${scoresQuery.isFetching ? 'animate-spin' : ''}`} />
            {t('health.realTime')}
          </button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-background/20">
          {OVERVIEW_METRICS.map((metric) => {
            const value = readMetric(metric.codes);
            return (
              <div key={metric.key} className="flex flex-col gap-0.5 px-2 first:pl-0">
                <span className="num text-xl font-semibold">{value == null ? '--' : formatNumber(value)}</span>
                <span className="text-2xs text-background/70">{t(`health.metric.${metric.key}`)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <FeatureCard
        icon={Activity}
        accent="bg-destructive/10 text-destructive"
        title={t('nav.healthManagement')}
        description={t('health.managementSubtitle')}
        onClick={() => navigate('/health/management')}
      />

      <div className="grid grid-cols-2 gap-3">
        <TileCard
          icon={MessagesSquare}
          accent="bg-info/10 text-info"
          title={t('nav.community')}
          description={t('health.communitySubtitle')}
          onClick={() => navigate('/health/community')}
        />
        <TileCard
          icon={BarChart3}
          accent="bg-warning/10 text-warning"
          title={t('nav.sportRanking')}
          description={t('health.rankingSubtitle')}
          onClick={() => navigate('/health/sport-ranking')}
        />
      </div>

      <FeatureCard
        icon={BookOpen}
        accent="bg-primary/10 text-primary"
        title={t('nav.healthKnowledge')}
        description={t('health.knowledgeSubtitle')}
        onClick={() => navigate('/health/knowledge')}
      />
    </div>
  );
}

interface CardProps {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  title: string;
  description: string;
  onClick: () => void;
}

function FeatureCard({ icon: Icon, accent, title, description, onClick }: CardProps) {
  return (
    <Card className="flex cursor-pointer items-center gap-3 p-4 hover:shadow-raised" onClick={onClick}>
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ArrowRight className="size-4" />
      </span>
    </Card>
  );
}

function TileCard({ icon: Icon, accent, title, description, onClick }: CardProps) {
  return (
    <Card className="flex cursor-pointer flex-col gap-2 p-4 hover:shadow-raised" onClick={onClick}>
      <span className={`flex size-11 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="size-5" />
      </span>
      <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}
