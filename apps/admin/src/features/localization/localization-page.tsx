import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, DataTable, FormField, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from '@ptg/ui';
import { SUPPORTED_LOCALES, type Locale, type TranslationInput } from '@ptg/types';
import { QueryState } from '@/components/query-state';
import { useTranslations, useUpsertTranslation } from './api';

export default function LocalizationPage() {
  const [locale, setLocale] = React.useState<Locale>('en');
  const translationsQuery = useTranslations(locale);
  const upsert = useUpsertTranslation();
  const { register, handleSubmit, reset } = useForm<TranslationInput>({ defaultValues: { locale, namespace: 'common', key: '', value: '' } });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Localization</h1>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Locale</span>
        <Select value={locale} onValueChange={(v) => { setLocale(v as Locale); reset({ locale: v as Locale, namespace: 'common', key: '', value: '' }); }}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SUPPORTED_LOCALES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-3">
        <form
          className="grid grid-cols-1 gap-2 sm:grid-cols-4"
          onSubmit={handleSubmit((values) => upsert.mutate({ ...values, locale }, { onSuccess: () => { reset({ locale, namespace: values.namespace, key: '', value: '' }); toast.success('Saved'); } }))}
        >
          <FormField label="Namespace"><Input {...register('namespace', { required: true })} /></FormField>
          <FormField label="Key" required><Input {...register('key', { required: true })} /></FormField>
          <FormField label="Value" required className="sm:col-span-2"><Input {...register('value', { required: true })} /></FormField>
          <div className="sm:col-span-4">
            <Button type="submit" size="sm" loading={upsert.isPending}>Save</Button>
          </div>
        </form>
      </Card>

      <QueryState isLoading={translationsQuery.isLoading} isError={translationsQuery.isError} error={translationsQuery.error} onRetry={() => translationsQuery.refetch()} isEmpty={translationsQuery.data?.length === 0} emptyTitle="No translations for this locale yet">
        <DataTable
          rows={translationsQuery.data ?? []}
          getRowKey={(row) => row.id}
          columns={[
            { key: 'namespace', header: 'Namespace', render: (row) => row.namespace },
            { key: 'key', header: 'Key', render: (row) => <span className="num">{row.key}</span> },
            { key: 'value', header: 'Value', render: (row) => row.value },
          ]}
        />
      </QueryState>
    </div>
  );
}
