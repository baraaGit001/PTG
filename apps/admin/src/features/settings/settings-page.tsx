import * as React from 'react';
import { Badge, Card, Input, toast } from '@ptg/ui';
import { QueryState } from '@/components/query-state';
import { useAdminSettings, useUpdateSetting } from './api';

export default function SettingsPage() {
  const settingsQuery = useAdminSettings();
  const updateSetting = useUpdateSetting();
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});

  const commit = (key: string, rawCurrent: unknown) => {
    const draft = drafts[key];
    if (draft === undefined) return;
    let value: unknown = draft;
    try {
      value = JSON.parse(draft);
    } catch {
      // plain string values (most settings) aren't valid JSON - send as-is
      if (typeof rawCurrent === 'boolean') value = draft === 'true';
      else if (typeof rawCurrent === 'number') value = Number(draft);
    }
    updateSetting.mutate({ key, value }, { onSuccess: () => toast.success('Setting updated') });
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Settings</h1>
      <QueryState isLoading={settingsQuery.isLoading} isError={settingsQuery.isError} error={settingsQuery.error} onRetry={() => settingsQuery.refetch()} isEmpty={settingsQuery.data?.length === 0} emptyTitle="No settings found">
        <div className="flex flex-col gap-2">
          {settingsQuery.data?.map((setting) => (
            <Card key={setting.key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="num text-xs font-medium text-foreground">{setting.key}</p>
                <p className="text-2xs text-muted-foreground">{setting.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {setting.isPublic ? <Badge variant="info">Public</Badge> : null}
                <Input
                  defaultValue={typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)}
                  onChange={(e) => setDrafts((d) => ({ ...d, [setting.key]: e.target.value }))}
                  onBlur={() => commit(setting.key, setting.value)}
                  className="w-56"
                />
              </div>
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
