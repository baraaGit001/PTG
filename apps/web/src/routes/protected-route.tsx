import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { PermissionName } from '@ptg/types';
import { hasAllPermissions } from '@ptg/types';
import { useAuthStore } from '@/stores/auth.store';
import { FullPageSpinner } from '@/components/full-page-spinner';

export function ProtectedRoute({ children, permissions }: { children: React.ReactNode; permissions?: PermissionName[] }) {
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const location = useLocation();

  if (!bootstrapped) return <FullPageSpinner />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (permissions && !hasAllPermissions(user.permissions, permissions)) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
