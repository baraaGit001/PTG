import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Card, FormField, Input, toast } from '@ptg/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useLogin } from './api';
import { isApiClientError } from '@/lib/api-error';

interface FormValues {
  memberId: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const login = useLogin();
  const [showPassword, setShowPassword] = React.useState(false);
  const { register, handleSubmit } = useForm<FormValues>();

  if (user) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit((values) => {
    login.mutate(
      { memberId: values.memberId.toUpperCase(), password: values.password },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (error) => toast.error(isApiClientError(error) ? error.message : 'Sign-in failed'),
      },
    );
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-4 flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">P</div>
          <h1 className="text-sm font-semibold text-foreground">PTG Business Admin</h1>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label="Member ID" required>
            <Input autoComplete="username" placeholder="PTG-ADMIN" {...register('memberId', { required: true })} />
          </FormField>
          <FormField label="Password" required>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="pr-9" {...register('password', { required: true })} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </FormField>
          <Button type="submit" loading={login.isPending}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
