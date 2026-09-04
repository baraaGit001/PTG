import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button, Card, FormField, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from '@ptg/ui';
import { ACTIVITY_LEVELS, GENDERS, HEALTH_GOALS, type UpdateHealthProfileRequest } from '@ptg/types';
import { QueryState } from '@/components/query-state';
import { useHealthProfile, useUpdateHealthProfile } from './api';

export default function HealthManagementPage() {
  const { t } = useTranslation();
  const profileQuery = useHealthProfile();
  const updateProfile = useUpdateHealthProfile();

  const { register, handleSubmit, setValue, watch } = useForm<UpdateHealthProfileRequest>({ values: profileQuery.data ?? undefined });

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">{t('health.profile')}</h1>
      <p className="text-xs text-muted-foreground">
        This information helps personalise your experience. It is not a medical assessment and does not provide medical advice.
      </p>

      <QueryState isLoading={profileQuery.isLoading} isError={profileQuery.isError} error={profileQuery.error} onRetry={() => profileQuery.refetch()} skeletonVariant="detail">
        <Card className="p-4">
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={handleSubmit((values) => updateProfile.mutate(values, { onSuccess: () => toast.success(t('common.save')) }))}
          >
            <FormField label="Gender">
              <Select value={watch('gender')} onValueChange={(v) => setValue('gender', v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Birth date">
              <Input type="date" {...register('birthDate')} />
            </FormField>
            <FormField label="Height (cm)">
              <Input type="number" {...register('heightCm', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Weight (grams)">
              <Input type="number" {...register('weightGrams', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Activity level">
              <Select value={watch('activityLevel')} onValueChange={(v) => setValue('activityLevel', v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map((l) => <SelectItem key={l} value={l}>{l.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Goal">
              <Select value={watch('goal')} onValueChange={(v) => setValue('goal', v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HEALTH_GOALS.map((g) => <SelectItem key={g} value={g}>{g.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Target weight (grams)">
              <Input type="number" {...register('targetWeightGrams', { valueAsNumber: true })} />
            </FormField>
            <div className="sm:col-span-2">
              <Button type="submit" loading={updateProfile.isPending}>{t('common.save')}</Button>
            </div>
          </form>
        </Card>
      </QueryState>
    </div>
  );
}
