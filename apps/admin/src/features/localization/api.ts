import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TranslationDto, TranslationInput } from '@ptg/types';
import { apiRequest } from '@/lib/api-client';

export function useTranslations(locale?: string, namespace?: string) {
  return useQuery({
    queryKey: ['admin', 'translations', locale, namespace],
    queryFn: () => apiRequest<TranslationDto[]>('/admin/localization/translations', { query: { locale, namespace } }),
  });
}

export function useUpsertTranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TranslationInput) => apiRequest<TranslationDto>('/admin/localization/translations', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'translations'] }),
  });
}
