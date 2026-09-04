import * as React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, Button, Card, FormField, Input, toast } from '@ptg/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useChangePassword, useUpdateProfile } from './api';

export default function ProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const { register, handleSubmit } = useForm({
    defaultValues: { fullName: user?.fullName ?? '', displayName: user?.displayName ?? '', phone: user?.phone ?? '' },
  });
  const passwordForm = useForm({ defaultValues: { currentPassword: '', newPassword: '' } });

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-foreground">{t('profile.title')}</h1>

      <Card className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            <AvatarFallback className="text-lg">{user.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{user.fullName}</p>
            <p className="num text-2xs text-muted-foreground">{user.memberId}</p>
          </div>
        </div>

        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={handleSubmit((values) => updateProfile.mutate(values, { onSuccess: () => toast.success('Profile updated') }))}
        >
          <FormField label={t('profile.fullName')}>
            <Input {...register('fullName')} />
          </FormField>
          <FormField label={t('profile.displayName')}>
            <Input {...register('displayName')} />
          </FormField>
          <FormField label={t('profile.phone')}>
            <Input {...register('phone')} />
          </FormField>
          <FormField label={t('profile.email')}>
            <Input value={user.email ?? ''} disabled />
          </FormField>
          <div className="sm:col-span-2">
            <Button type="submit" loading={updateProfile.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-4 p-4">
        <h2 className="text-sm font-semibold text-foreground">{t('profile.changePassword')}</h2>
        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={passwordForm.handleSubmit((values) =>
            changePassword.mutate(values, {
              onSuccess: () => {
                toast.success('Password changed');
                passwordForm.reset();
              },
              onError: () => toast.error('Could not change password'),
            }),
          )}
        >
          <FormField label="Current password">
            <Input type="password" {...passwordForm.register('currentPassword')} />
          </FormField>
          <FormField label="New password">
            <Input type="password" {...passwordForm.register('newPassword')} />
          </FormField>
          <div className="sm:col-span-2">
            <Button type="submit" variant="outline" loading={changePassword.isPending}>
              {t('profile.changePassword')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
