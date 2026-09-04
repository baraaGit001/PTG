import * as React from 'react';
import { Navigate } from 'react-router-dom';
import type { PermissionName } from '@ptg/types';
import { hasAllPermissions } from '@ptg/types';
import { useAuthStore } from '@/stores/auth.store';
import { FullPageSpinner } from '@/components/full-page-spinner';

export function ProtectedRoute({ children, permissions }: { children: React.ReactNode; permissions?: PermissionName[] }) {
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  if (!bootstrapped) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (permissions && !hasAllPermissions(user.permissions, permissions)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
