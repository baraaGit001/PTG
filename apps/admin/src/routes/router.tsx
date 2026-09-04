import * as React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '@/layouts/admin-layout';
import { ProtectedRoute } from './protected-route';
import { FullPageSpinner } from '@/components/full-page-spinner';

function lazyPage(loader: () => Promise<{ default: React.ComponentType }>, permissions?: Parameters<typeof ProtectedRoute>[0]['permissions']) {
  const Component = React.lazy(loader);
  return (
    <ProtectedRoute permissions={permissions}>
      <React.Suspense fallback={<FullPageSpinner />}>
        <Component />
      </React.Suspense>
    </ProtectedRoute>
  );
}

const LoginPage = React.lazy(() => import('@/features/auth/login-page'));

const routes = [
  {
    path: '/login',
    element: (
      <React.Suspense fallback={<FullPageSpinner />}>
        <LoginPage />
      </React.Suspense>
    ),
  },
  {
    element: <AdminLayout />,
    children: [
      { path: '/', element: lazyPage(() => import('@/features/dashboard/dashboard-page')) },
      { path: '/users', element: lazyPage(() => import('@/features/users/users-page'), ['users.read']) },
      { path: '/partners', element: lazyPage(() => import('@/features/members/partners-page'), ['members.read']) },
      { path: '/products', element: lazyPage(() => import('@/features/products/products-page'), ['products.read']) },
      { path: '/categories', element: lazyPage(() => import('@/features/categories/categories-page'), ['products.read']) },
      { path: '/orders', element: lazyPage(() => import('@/features/orders/orders-page'), ['orders.read.any']) },
      { path: '/orders/:id', element: lazyPage(() => import('@/features/orders/order-detail-page'), ['orders.read.any']) },
      { path: '/fulfillment', element: lazyPage(() => import('@/features/fulfillment/fulfillment-page'), ['fulfillment.read']) },
      { path: '/wallets', element: lazyPage(() => import('@/features/wallets/wallets-page'), ['wallet.read.any']) },
      { path: '/bonuses', element: lazyPage(() => import('@/features/bonuses/bonuses-page'), ['bonus.read.any']) },
      { path: '/points', element: lazyPage(() => import('@/features/points/points-page'), ['points.read.any']) },
      { path: '/investment-plans', element: lazyPage(() => import('@/features/investment/investment-page'), ['investment.read']) },
      { path: '/promotions', element: lazyPage(() => import('@/features/promotions/promotions-page'), ['promotions.read']) },
      { path: '/community', element: lazyPage(() => import('@/features/community/community-page'), ['community.moderate']) },
      { path: '/health', element: lazyPage(() => import('@/features/health/health-content-page'), ['content.read']) },
      { path: '/localization', element: lazyPage(() => import('@/features/localization/localization-page'), ['localization.manage']) },
      { path: '/audit-logs', element: lazyPage(() => import('@/features/audit/audit-page'), ['audit.read']) },
      { path: '/settings', element: lazyPage(() => import('@/features/settings/settings-page'), ['settings.read']) },
    ],
  },
];

// Vite's BASE_URL is '/' in dev and '/admin/' in the server build, so the
// router's basename follows whatever the bundle was built for instead of
// being hardcoded in two places that can drift apart.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export const router = createBrowserRouter(routes, basename ? { basename } : undefined);
