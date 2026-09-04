import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@ptg/ui';
import { queryClient } from '@/lib/query-client';
import { router } from '@/routes/router';
import { bootstrapSession } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export function App() {
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  React.useEffect(() => {
    void bootstrapSession();
  }, []);

  if (!bootstrapped) return <div className="min-h-screen bg-surface" />;

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}
