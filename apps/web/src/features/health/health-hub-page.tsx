import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, BookOpen, MessagesSquare, Trophy } from 'lucide-react';
import { Card } from '@ptg/ui';

const TILES = [
  { key: 'healthManagement', icon: Activity, path: '/health/management' },
  { key: 'community', icon: MessagesSquare, path: '/health/community' },
  { key: 'sportRanking', icon: Trophy, path: '/health/sport-ranking' },
  { key: 'healthKnowledge', icon: BookOpen, path: '/health/knowledge' },
] as const;

export default function HealthHubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t('nav.health')}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TILES.map((tile) => (
          <Card key={tile.key} className="flex cursor-pointer flex-col items-center gap-2 p-6 text-center hover:shadow-raised" onClick={() => navigate(tile.path)}>
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <tile.icon className="size-5" />
            </span>
            <span className="text-sm font-medium text-foreground">{t(`nav.${tile.key}`)}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
