import { useTranslation } from 'react-i18next';

/**
 * @ptg/ui's Sidebar/MobileBottomNav index into a plain `labels` record by
 * i18n key. A Proxy lets us hand them a "record" backed by `t()` without
 * pre-resolving every possible nav key up front.
 */
export function useNavLabels(): Record<string, string> {
  const { t } = useTranslation();
  return new Proxy(
    {},
    {
      get: (_target, prop: string) => t(prop),
    },
  ) as Record<string, string>;
}
