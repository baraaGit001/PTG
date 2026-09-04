import { useTranslation } from 'react-i18next';
import { TreeExplorer } from './tree-explorer';

export default function PlacementTreePage() {
  const { t } = useTranslation();
  return <TreeExplorer kind="PLACEMENT" title={t('nav.placementTree')} />;
}
