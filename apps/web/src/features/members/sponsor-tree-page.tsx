import { useTranslation } from 'react-i18next';
import { TreeExplorer } from './tree-explorer';

export default function SponsorTreePage() {
  const { t } = useTranslation();
  return <TreeExplorer kind="SPONSOR" title={t('nav.sponsorTree')} />;
}
