import { useTranslation } from 'react-i18next';
import { LanguageSelector, toast } from '@ptg/ui';
import type { Locale } from '@ptg/types';
import { applyLocale } from '@/i18n';
import { useUpdateProfile } from '@/features/profile/api';

export default function LanguagePage() {
  const { t, i18n } = useTranslation();
  const updateProfile = useUpdateProfile();

  const handleChange = (locale: Locale) => {
    applyLocale(locale);
    updateProfile.mutate({ locale }, { onSuccess: () => toast.success(t('common.save')) });
  };

  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t('nav.language')}</h1>
      <LanguageSelector value={i18n.language as Locale} onChange={handleChange} variant="list" />
    </div>
  );
}
