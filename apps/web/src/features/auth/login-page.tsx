import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Card, FormField, Input, LanguageSelector, toast } from '@ptg/ui';
import type { Locale } from '@ptg/types';
import { useAuthStore } from '@/stores/auth.store';
import { useLogin, useForgotPassword } from './api';
import { isApiClientError } from '@/lib/api-error';
import { applyLocale } from '@/i18n';
import { usePublicSettings } from '@/features/settings/api';

const schema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const login = useLogin();
  const forgotPassword = useForgotPassword();
  const { data: settings } = usePublicSettings();
  const [showPassword, setShowPassword] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { rememberMe: false } });

  if (user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/app';
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = handleSubmit((values) => {
    login.mutate(
      { memberId: values.memberId.toUpperCase(), password: values.password, rememberMe: values.rememberMe, locale: i18n.language as Locale },
      {
        onSuccess: () => navigate((location.state as { from?: string } | null)?.from ?? '/app', { replace: true }),
        onError: (error) => {
          if (isApiClientError(error)) {
            if (error.code === 'ACCOUNT_LOCKED') return toast.error(t('auth.accountLocked'));
            if (error.code === 'ACCOUNT_DISABLED') return toast.error(t('auth.accountDisabled'));
            if (error.code === 'INVALID_CREDENTIALS') return toast.error(t('auth.invalidCredentials'));
          }
          toast.error(t('errors.generic'));
        },
      },
    );
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-2">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
          {(settings?.brandName ?? 'PTG').slice(0, 1)}
        </div>
        <h1 className="text-lg font-semibold text-foreground">{settings?.brandName ?? t('common.appName')}</h1>
      </div>

      <Card className="w-full max-w-sm p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t('auth.title')}</h2>
          <LanguageSelector value={i18n.language as Locale} onChange={(locale) => applyLocale(locale)} />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('auth.memberId')} htmlFor="memberId" error={errors.memberId?.message} required>
            <Input id="memberId" autoComplete="username" placeholder="PTG-100001" {...register('memberId')} />
          </FormField>

          <FormField label={t('auth.password')} htmlFor="password" error={errors.password?.message} required>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="pr-9" {...register('password')} />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </FormField>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-1.5 text-muted-foreground">
              <input type="checkbox" className="size-3.5 rounded border-input" {...register('rememberMe')} />
              {t('auth.rememberMe')}
            </label>
            <button type="button" onClick={() => setForgotOpen((v) => !v)} className="font-medium text-primary hover:underline">
              {t('auth.forgotPassword')}
            </button>
          </div>

          {forgotOpen ? <ForgotPasswordInline onSubmitMemberId={(id) => forgotPassword.mutate(id, { onSuccess: () => toast.success('If that account exists, a reset link has been sent.') })} /> : null}

          <Button type="submit" loading={login.isPending} className="mt-1">
            {login.isPending ? t('auth.loggingIn') : t('auth.submit')}
          </Button>

          <Button type="button" variant="outline" onClick={() => navigate('/catalog')}>
            {t('auth.guestAccess')}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function ForgotPasswordInline({ onSubmitMemberId }: { onSubmitMemberId: (memberId: string) => void }) {
  const { t } = useTranslation();
  const [value, setValue] = React.useState('');
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-2">
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={t('auth.memberId')} className="h-8" />
      <Button
        type="button"
        size="sm"
        onClick={() => {
          if (value) onSubmitMemberId(value.toUpperCase());
        }}
      >
        {t('common.submit')}
      </Button>
    </div>
  );
}
