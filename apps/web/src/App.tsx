import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@ptg/ui';
import { queryClient } from '@/lib/query-client';
import { router } from '@/routes/router';
import { bootstrapSession } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { applyLocale } from '@/i18n';

export function App() {
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const locale = useAuthStore((s) => s.user?.locale);

  React.useEffect(() => {
    void bootstrapSession();
  }, []);

  React.useEffect(() => {
    if (locale) applyLocale(locale);
  }, [locale]);

  if (!bootstrapped) {
    // A minimal inline splash avoids importing the full component tree before i18n/session are ready.
    return <div className="min-h-screen bg-surface" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}
